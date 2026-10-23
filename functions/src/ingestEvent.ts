import { onRequest } from 'firebase-functions/v2/https';
import { SensorIngestEventSchema } from '@parksense/shared';
import { firestore, rtdb, admin } from './firebase.js';

export const ingestEvent = onRequest(
  {
    cors: true,
    region: 'us-central1'
  },
  async (req, res) => {
    // 1. Only allow POST requests
    if (req.method !== 'POST') {
      res.status(405).json({
        error: 'Method Not Allowed',
        message: 'Only POST requests are supported on this endpoint'
      });
      return;
    }

    try {
      // 2. Validate payload with Zod schema from @parksense/shared
      const parseResult = SensorIngestEventSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Validation Error',
          details: parseResult.error.flatten()
        });
        return;
      }

      const eventData = parseResult.data;
      const {
        gatewayId,
        sensorId,
        bayId,
        zoneId,
        eventType,
        timestamp,
        idempotencyKey,
        vehicleMetadata,
        telemetry
      } = eventData;

      // 3. Idempotency Check: Query Firestore by idempotencyKey
      const existingEvents = await firestore
        .collection('events')
        .where('idempotencyKey', '==', idempotencyKey)
        .limit(1)
        .get();

      if (!existingEvents.empty) {
        const existingDoc = existingEvents.docs[0];
        res.status(200).json({
          status: 'duplicate',
          message: 'Event already ingested and processed',
          eventId: existingDoc.id
        });
        return;
      }

      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();
      const eventTimestamp = admin.firestore.Timestamp.fromMillis(timestamp);

      // 4. Atomic Firestore Batch Write
      const batch = firestore.batch();

      // (a) Record immutable event in /events
      const eventRef = firestore.collection('events').doc(eventId);
      batch.set(eventRef, {
        id: eventId,
        idempotencyKey,
        gatewayId,
        sensorId,
        bayId,
        zoneId,
        eventType,
        timestamp: eventTimestamp,
        receivedAt: serverTimestamp,
        vehicleType: vehicleMetadata?.detectedClass || 'car',
        vehicleNumberPlate: vehicleMetadata?.licensePlate || null,
        confidence: vehicleMetadata?.confidenceScore || 0.95,
        rawPayload: req.body
      });

      // (b) Update /sensors telemetry
      const sensorRef = firestore.collection('sensors').doc(sensorId);
      const sensorUpdates: Record<string, any> = {
        lastHeartbeat: eventTimestamp,
        updatedAt: serverTimestamp
      };
      if (telemetry?.batteryVoltage !== undefined) {
        // Approximate 3.0V - 4.2V scale to 0-100%
        const batteryPercent = Math.max(
          0,
          Math.min(100, Math.round(((telemetry.batteryVoltage - 3.0) / 1.2) * 100))
        );
        sensorUpdates.batteryPercent = batteryPercent;
        sensorUpdates.healthStatus = batteryPercent < 15 ? 'low_battery' : 'healthy';
      }
      batch.set(sensorRef, sensorUpdates, { merge: true });

      // (c) Update /bays state
      const bayRef = firestore.collection('bays').doc(bayId);
      let newBayStatus: 'occupied' | 'available' | 'maintenance' = 'available';

      if (eventType === 'ENTRY') {
        newBayStatus = 'occupied';
        batch.set(
          bayRef,
          {
            status: 'occupied',
            currentSession: {
              vehicleNumber: vehicleMetadata?.licensePlate || 'UNKNOWN',
              occupiedSince: eventTimestamp,
              eventId
            },
            updatedAt: serverTimestamp
          },
          { merge: true }
        );
      } else if (eventType === 'EXIT') {
        newBayStatus = 'available';
        batch.set(
          bayRef,
          {
            status: 'available',
            currentSession: null,
            updatedAt: serverTimestamp
          },
          { merge: true }
        );
      }

      // Commit Firestore batch
      await batch.commit();

      // 5. Update Firebase Realtime Database (RTDB) Hot State
      const zoneLiveRef = rtdb.ref(`live_zones/${zoneId}`);
      const bayLiveRef = rtdb.ref(`live_bays/${zoneId}/${bayId}`);
      const statsRef = rtdb.ref('live_stats');

      // Update bay state in RTDB
      await bayLiveRef.set({
        status: newBayStatus,
        vehicleType: vehicleMetadata?.detectedClass || 'car',
        occupiedSince: newBayStatus === 'occupied' ? timestamp : null,
        isReserved: false
      });

      // Atomically calculate and update zone occupancy counters via RTDB transaction
      await zoneLiveRef.transaction((currentZone) => {
        if (!currentZone) {
          return {
            totalBays: 30,
            occupiedBays: newBayStatus === 'occupied' ? 1 : 0,
            reservedBays: 0,
            availableBays: newBayStatus === 'occupied' ? 29 : 30,
            occupancyRate: newBayStatus === 'occupied' ? 1 / 30 : 0,
            currentRatePerHour: 40,
            lastUpdated: timestamp
          };
        }

        const total = currentZone.totalBays || 30;
        let occupied = currentZone.occupiedBays || 0;
        const reserved = currentZone.reservedBays || 0;

        if (eventType === 'ENTRY') {
          occupied = Math.min(total, occupied + 1);
        } else if (eventType === 'EXIT') {
          occupied = Math.max(0, occupied - 1);
        }

        const available = Math.max(0, total - occupied - reserved);
        const occupancyRate = total > 0 ? Number((occupied / total).toFixed(4)) : 0;

        return {
          ...currentZone,
          occupiedBays: occupied,
          availableBays: available,
          occupancyRate,
          lastUpdated: timestamp
        };
      });

      // Update global heartbeat in RTDB
      await statsRef.update({
        systemHeartbeat: Date.now()
      });

      res.status(200).json({
        status: 'success',
        message: `Event ${eventType} for bay ${bayId} in zone ${zoneId} ingested successfully`,
        eventId,
        newStatus: newBayStatus
      });
    } catch (err: any) {
      console.error('Error in ingestEvent:', err);
      res.status(500).json({
        error: 'Internal Server Error',
        message: err.message || 'An error occurred during event ingestion'
      });
    }
  }
);
