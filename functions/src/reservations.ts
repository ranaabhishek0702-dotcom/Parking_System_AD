import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { randomUUID } from 'crypto';
import { firestore, rtdb, FieldValue, admin } from './firebase.js';

/**
 * Helper to update RTDB live counts when reservation state changes
 */
async function updateRtdbCounts(zoneId: string, reservedDelta: number, occupiedDelta: number = 0) {
  try {
    await rtdb.ref(`live_zones/${zoneId}`).transaction((current) => {
      if (!current) return current;
      const reservedBays = Math.max(0, (current.reservedBays || 0) + reservedDelta);
      const occupiedBays = Math.max(0, (current.occupiedBays || 0) + occupiedDelta);
      const totalBays = current.totalBays || 1;
      const availableBays = Math.max(0, totalBays - occupiedBays - reservedBays);
      const occupancyRate = Number(((occupiedBays + reservedBays) / totalBays).toFixed(4));
      return {
        ...current,
        reservedBays,
        occupiedBays,
        availableBays,
        occupancyRate,
        lastUpdated: Date.now()
      };
    });
  } catch (err) {
    console.error(`Failed to update RTDB counts for zone ${zoneId}:`, err);
  }
}

const zoneRateCache = new Map<string, { rate: number; expiresAt: number }>();

async function getCachedZoneRate(zoneId: string): Promise<number> {
  const cached = zoneRateCache.get(zoneId);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.rate;
  }
  let hourlyRate = 40;
  try {
    const liveZoneSnap = await rtdb.ref(`live_zones/${zoneId}`).once('value');
    if (liveZoneSnap.exists() && liveZoneSnap.val().currentRatePerHour) {
      hourlyRate = Number(liveZoneSnap.val().currentRatePerHour);
    }
  } catch (err) {}
  zoneRateCache.set(zoneId, { rate: hourlyRate, expiresAt: now + 15000 });
  return hourlyRate;
}

/**
 * 1. createHold: 10-Minute Lock with Concurrency Protection
 */
export const createHold = onRequest(
  { cors: true, region: 'us-central1' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    try {
      const {
        zoneId,
        bayId,
        vehicleNumber = 'DL01AB1234',
        vehicleType = 'two_wheeler',
        durationMinutes = 60,
        userId = 'anonymous-citizen'
      } = req.body || {};

      if (!zoneId || !bayId) {
        res.status(400).json({ error: 'zoneId and bayId are required' });
        return;
      }

      const reservationId = `res_${Date.now()}_${randomUUID().slice(0, 8)}`;
      const reservationRef = firestore.collection('reservations').doc(reservationId);
      const bayRef = firestore.collection('bays').doc(bayId);
      const zoneRef = firestore.collection('zones').doc(zoneId);

      const now = Date.now();
      const holdExpiresAt = now + 10 * 60 * 1000; // 10 minutes hold
      const qrToken = `PS-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;

      // Read current dynamic rate with caching
      let hourlyRate = 20;
      try {
        const baseRate = await getCachedZoneRate(zoneId);
        if (vehicleType === 'two_wheeler') hourlyRate = Math.max(10, Math.round(baseRate * 0.5));
        else if (vehicleType === 'ev') hourlyRate = Math.round(baseRate * 0.75);
        else if (vehicleType === 'handicapped') hourlyRate = 0;
        else hourlyRate = baseRate;
      } catch (err) {
        hourlyRate = 20;
      }

      const estimatedAmount = Math.max(0, Math.round((durationMinutes / 60) * hourlyRate));

      // Run Firestore ACID Transaction to guarantee zero double-booking
      await firestore.runTransaction(async (transaction) => {
        const bayDoc = await transaction.get(bayRef);
        if (!bayDoc.exists) {
          throw new Error('NOT_FOUND: Bay not found');
        }

        const bayData = bayDoc.data()!;
        if (bayData.status !== 'available') {
          // If held but hold has expired, allow reclaiming
          const isExpiredHold =
            bayData.status === 'reserved' &&
            bayData.currentSession?.holdExpiresAt &&
            bayData.currentSession.holdExpiresAt < now;

          if (!isExpiredHold) {
            throw new Error(`CONFLICT: Bay ${bayId} is not available (current status: ${bayData.status})`);
          }
        }

        // Commit reservation doc
        transaction.set(reservationRef, {
          id: reservationId,
          userId,
          zoneId,
          bayId,
          vehicleNumber,
          vehicleType,
          status: 'hold',
          startTime: now,
          endTime: now + durationMinutes * 60 * 1000,
          gracePeriodMinutes: 15,
          lockedHourlyRate: hourlyRate,
          estimatedAmount,
          holdExpiresAt,
          qrToken,
          createdAt: now,
          updatedAt: now
        });

        // Update bay status
        transaction.update(bayRef, {
          status: 'reserved',
          currentSession: {
            reservationId,
            vehicleNumber,
            vehicleType,
            holdExpiresAt,
            reservedAt: now
          },
          updatedAt: now
        });
      });

      // Synchronize RTDB hot state asynchronously
      rtdb.ref(`live_bays/${zoneId}/${bayId}`).update({
        status: 'reserved',
        isReserved: true,
        vehicleType
      }).catch((e) => console.warn('Async RTDB update error:', e));
      updateRtdbCounts(zoneId, +1, 0).catch(() => {});

      res.status(201).json({
        success: true,
        reservationId,
        status: 'hold',
        holdExpiresAt,
        lockedHourlyRate: hourlyRate,
        estimatedAmount,
        qrToken,
        message: 'Spot placed on 10-minute hold. Confirm payment to secure.'
      });
    } catch (error: any) {
      const message = error.message || 'Failed to create hold';
      if (message.startsWith('CONFLICT:')) {
        res.status(409).json({ error: 'Conflict', message });
      } else if (message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ error: 'Not Found', message });
      } else {
        console.error('Error creating hold:', error);
        res.status(500).json({ error: 'Internal Error', message });
      }
    }
  }
);

/**
 * 2. confirmBooking: Transition hold -> confirmed, record payment
 */
export const confirmBooking = onRequest(
  { cors: true, region: 'us-central1' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    try {
      const {
        reservationId,
        paymentId = `pay_${Date.now()}_${randomUUID().slice(0, 6)}`,
        paymentMethod = 'razorpay_upi',
        userId = 'anonymous-citizen'
      } = req.body || {};

      if (!reservationId) {
        res.status(400).json({ error: 'reservationId is required' });
        return;
      }

      const resRef = firestore.collection('reservations').doc(reservationId);
      const resDoc = await resRef.get();
      if (!resDoc.exists) {
        res.status(404).json({ error: 'Reservation not found' });
        return;
      }

      const resData = resDoc.data()!;
      if (resData.status !== 'hold' && resData.status !== 'pending') {
        res.status(400).json({
          error: 'Invalid state',
          message: `Reservation is already in '${resData.status}' status`
        });
        return;
      }

      const now = Date.now();
      if (resData.holdExpiresAt && resData.holdExpiresAt < now) {
        // Expired hold: release bay
        await resRef.update({ status: 'expired', updatedAt: now });
        await firestore.collection('bays').doc(resData.bayId).update({
          status: 'available',
          currentSession: FieldValue.delete(),
          updatedAt: now
        });
        await rtdb.ref(`live_bays/${resData.zoneId}/${resData.bayId}`).update({
          status: 'available',
          isReserved: false
        });
        await updateRtdbCounts(resData.zoneId, -1, 0);

        res.status(410).json({
          error: 'Hold Expired',
          message: 'The 10-minute hold on this bay has expired. Please select a spot again.'
        });
        return;
      }

      // Record payment
      const paymentRef = firestore.collection('payments').doc(paymentId);
      await paymentRef.set({
        id: paymentId,
        reservationId,
        userId: resData.userId || userId,
        amount: resData.estimatedAmount,
        currency: 'INR',
        gateway: 'razorpay',
        gatewayOrderId: `order_${Date.now()}_${randomUUID().slice(0, 6)}`,
        gatewayPaymentId: paymentId,
        paymentMethod,
        status: 'captured',
        createdAt: now,
        updatedAt: now
      });

      // Update reservation
      await resRef.update({
        status: 'confirmed',
        paymentId,
        paymentMethod,
        finalAmount: resData.estimatedAmount,
        confirmedAt: now,
        updatedAt: now
      });

      res.status(200).json({
        success: true,
        reservationId,
        paymentId,
        status: 'confirmed',
        message: 'Booking confirmed! QR check-in ready.'
      });
    } catch (error: any) {
      console.error('Error confirming booking:', error);
      res.status(500).json({ error: 'Internal Error', message: error.message });
    }
  }
);

/**
 * 3. checkIn: Transition confirmed -> active via QR code or vehicle plate
 */
export const checkIn = onRequest(
  { cors: true, region: 'us-central1' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    try {
      const { reservationId, qrToken, vehicleNumber } = req.body || {};
      if (!reservationId) {
        res.status(400).json({ error: 'reservationId is required' });
        return;
      }

      const resRef = firestore.collection('reservations').doc(reservationId);
      const resDoc = await resRef.get();
      if (!resDoc.exists) {
        res.status(404).json({ error: 'Reservation not found' });
        return;
      }

      const resData = resDoc.data()!;
      if (resData.status !== 'confirmed' && resData.status !== 'hold') {
        res.status(400).json({
          error: 'Invalid state',
          message: `Cannot check in to reservation with status '${resData.status}'`
        });
        return;
      }

      // Check token match if provided
      if (qrToken && resData.qrToken && qrToken !== resData.qrToken) {
        res.status(403).json({ error: 'Invalid QR token' });
        return;
      }

      const now = Date.now();
      await resRef.update({
        status: 'active',
        checkedInAt: now,
        updatedAt: now
      });

      // Update bay to occupied
      await firestore.collection('bays').doc(resData.bayId).update({
        status: 'occupied',
        currentSession: {
          reservationId,
          vehicleNumber: vehicleNumber || resData.vehicleNumber,
          vehicleType: resData.vehicleType,
          occupiedSince: now
        },
        updatedAt: now
      });

      // Update RTDB
      await rtdb.ref(`live_bays/${resData.zoneId}/${resData.bayId}`).update({
        status: 'occupied',
        isReserved: false,
        occupiedSince: now
      });
      // Transfer 1 from reserved to occupied
      await updateRtdbCounts(resData.zoneId, -1, +1);

      res.status(200).json({
        success: true,
        reservationId,
        status: 'active',
        bayId: resData.bayId,
        checkedInAt: now,
        message: 'Check-in successful! Have a great parking session.'
      });
    } catch (error: any) {
      console.error('Error checking in:', error);
      res.status(500).json({ error: 'Internal Error', message: error.message });
    }
  }
);

/**
 * 4. extendReservation: Extend duration and update billing
 */
export const extendReservation = onRequest(
  { cors: true, region: 'us-central1' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    try {
      const { reservationId, additionalMinutes = 30 } = req.body || {};
      if (!reservationId) {
        res.status(400).json({ error: 'reservationId is required' });
        return;
      }

      const resRef = firestore.collection('reservations').doc(reservationId);
      const resDoc = await resRef.get();
      if (!resDoc.exists) {
        res.status(404).json({ error: 'Reservation not found' });
        return;
      }

      const resData = resDoc.data()!;
      if (resData.status !== 'active' && resData.status !== 'confirmed') {
        res.status(400).json({
          error: 'Invalid state',
          message: `Cannot extend reservation with status '${resData.status}'`
        });
        return;
      }

      const now = Date.now();
      const currentEndTime = Number(resData.endTime || now);
      const newEndTime = currentEndTime + additionalMinutes * 60 * 1000;
      const hourlyRate = resData.lockedHourlyRate || 20;
      const additionalCost = Math.round((additionalMinutes / 60) * hourlyRate);
      const newEstimatedAmount = (resData.estimatedAmount || 0) + additionalCost;

      await resRef.update({
        endTime: newEndTime,
        estimatedAmount: newEstimatedAmount,
        finalAmount: newEstimatedAmount,
        updatedAt: now
      });

      res.status(200).json({
        success: true,
        reservationId,
        newEndTime,
        additionalCost,
        totalAmount: newEstimatedAmount,
        message: `Extended by ${additionalMinutes} minutes.`
      });
    } catch (error: any) {
      console.error('Error extending reservation:', error);
      res.status(500).json({ error: 'Internal Error', message: error.message });
    }
  }
);

/**
 * 5. cancelReservation: Free bay and update status
 */
export const cancelReservation = onRequest(
  { cors: true, region: 'us-central1' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    try {
      const { reservationId, reason = 'citizen_cancelled' } = req.body || {};
      if (!reservationId) {
        res.status(400).json({ error: 'reservationId is required' });
        return;
      }

      const resRef = firestore.collection('reservations').doc(reservationId);
      const resDoc = await resRef.get();
      if (!resDoc.exists) {
        res.status(404).json({ error: 'Reservation not found' });
        return;
      }

      const resData = resDoc.data()!;
      if (resData.status === 'completed' || resData.status === 'cancelled') {
        res.status(400).json({
          error: 'Already resolved',
          message: `Reservation already ${resData.status}`
        });
        return;
      }

      const now = Date.now();
      const previousStatus = resData.status;

      await resRef.update({
        status: 'cancelled',
        cancellationReason: reason,
        cancelledAt: now,
        updatedAt: now
      });

      // Free bay in Firestore
      await firestore.collection('bays').doc(resData.bayId).update({
        status: 'available',
        currentSession: FieldValue.delete(),
        updatedAt: now
      });

      // Free bay in RTDB
      try {
        await rtdb.ref(`live_bays/${resData.zoneId}/${resData.bayId}`).update({
          status: 'available',
          isReserved: false
        });
        await rtdb.ref(`live_bays/${resData.zoneId}/${resData.bayId}/occupiedSince`).remove();
      } catch (rtdbErr) {
        console.warn('RTDB bay release warning:', rtdbErr);
      }

      if (previousStatus === 'active') {
        updateRtdbCounts(resData.zoneId, 0, -1).catch(() => {});
      } else {
        updateRtdbCounts(resData.zoneId, -1, 0).catch(() => {});
      }

      res.status(200).json({
        success: true,
        reservationId,
        status: 'cancelled',
        message: 'Reservation cancelled successfully and bay released.'
      });
    } catch (error: any) {
      console.error('Error cancelling reservation:', error);
      res.status(500).json({ error: 'Internal Error', message: error.message });
    }
  }
);

/**
 * 6. releaseExpiredHolds: Scheduled / triggerable cleanup of expired holds and no-shows
 */
export async function runReleaseExpiredHolds(): Promise<{ releasedCount: number }> {
  const now = Date.now();
  let releasedCount = 0;

  // 1. Expired holds
  const expiredHoldsSnap = await firestore
    .collection('reservations')
    .where('status', 'in', ['hold', 'pending'])
    .where('holdExpiresAt', '<=', now)
    .get();

  for (const doc of expiredHoldsSnap.docs) {
    const data = doc.data();
    await doc.ref.update({ status: 'expired', updatedAt: now });

    await firestore.collection('bays').doc(data.bayId).update({
      status: 'available',
      currentSession: FieldValue.delete(),
      updatedAt: now
    });

    await rtdb.ref(`live_bays/${data.zoneId}/${data.bayId}`).update({
      status: 'available',
      isReserved: false
    });

    await updateRtdbCounts(data.zoneId, -1, 0);
    releasedCount++;
  }

  // 2. No-shows: confirmed reservations past startTime + gracePeriod without checkin
  const confirmedSnap = await firestore
    .collection('reservations')
    .where('status', '==', 'confirmed')
    .get();

  for (const doc of confirmedSnap.docs) {
    const data = doc.data();
    const graceMs = (data.gracePeriodMinutes || 15) * 60 * 1000;
    const expiryTime = Number(data.startTime || 0) + graceMs;
    if (now > expiryTime) {
      await doc.ref.update({
        status: 'expired',
        expirationReason: 'no_show',
        updatedAt: now
      });

      await firestore.collection('bays').doc(data.bayId).update({
        status: 'available',
        currentSession: FieldValue.delete(),
        updatedAt: now
      });

      await rtdb.ref(`live_bays/${data.zoneId}/${data.bayId}`).update({
        status: 'available',
        isReserved: false
      });

      await updateRtdbCounts(data.zoneId, -1, 0);
      releasedCount++;
    }
  }

  return { releasedCount };
}

export const releaseExpiredHolds = onRequest(
  { cors: true, region: 'us-central1' },
  async (_req, res) => {
    try {
      const result = await runReleaseExpiredHolds();
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export const releaseExpiredHoldsScheduled = onSchedule(
  { schedule: 'every 2 minutes', timeZone: 'Asia/Kolkata', region: 'us-central1' },
  async () => {
    const result = await runReleaseExpiredHolds();
    console.log(`Auto-released ${result.releasedCount} expired holds / no-shows`);
  }
);

/**
 * 7. reportViolation: Citizen report illegal parking with photo & geotag
 */
export const reportViolation = onRequest(
  { cors: true, region: 'us-central1' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    try {
      const {
        zoneId,
        bayId,
        type = 'unauthorized_parking',
        vehicleNumber,
        photoUrl,
        location,
        notes,
        reporterUserId = 'anonymous-citizen'
      } = req.body || {};

      if (!zoneId) {
        res.status(400).json({ error: 'zoneId is required' });
        return;
      }

      const violationId = `vio_${Date.now()}_${randomUUID().slice(0, 6)}`;
      const now = Date.now();

      await firestore.collection('violations').doc(violationId).set({
        id: violationId,
        zoneId,
        bayId: bayId || 'unknown_bay',
        type,
        vehicleNumber: vehicleNumber || 'UNIDENTIFIED',
        photoUrl: photoUrl || null,
        location: location || null,
        notes: notes || 'Citizen reported via ParkSense PWA',
        reporterUserId,
        status: 'detected',
        fineAmount: 500, // Standard ₹500 fine
        detectedAt: now,
        createdAt: now,
        updatedAt: now
      });

      // Increment active violations count in RTDB live_stats
      await rtdb.ref('live_stats/activeViolationsCount').transaction((count) => (count || 0) + 1);

      res.status(201).json({
        success: true,
        violationId,
        message: 'Violation reported to municipal enforcement squad. Thank you for keeping Delhi clean and accessible!'
      });
    } catch (error: any) {
      console.error('Error reporting violation:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * 8. paymentWebhook: Mock / Razorpay Webhook Confirmation
 */
export const paymentWebhook = onRequest(
  { cors: true, region: 'us-central1' },
  async (req, res) => {
    try {
      const event = req.body?.event || 'payment.captured';
      const paymentPayload = req.body?.payload?.payment?.entity || req.body || {};
      const reservationId = paymentPayload.notes?.reservationId || paymentPayload.reservationId;

      if (reservationId) {
        const resRef = firestore.collection('reservations').doc(reservationId);
        const resDoc = await resRef.get();
        if (resDoc.exists && resDoc.data()?.status === 'hold') {
          const now = Date.now();
          await resRef.update({
            status: 'confirmed',
            paymentId: paymentPayload.id || `pay_${Date.now()}`,
            confirmedAt: now,
            updatedAt: now
          });
        }
      }

      res.status(200).json({ status: 'ok', received: true });
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);
