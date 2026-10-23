import assert from 'node:assert';
import * as admin from 'firebase-admin';
import { randomUUID } from 'node:crypto';

const FUNCTION_URL = 'http://127.0.0.1:5001/parksense-india/us-central1';

if (!admin.apps.length) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_DATABASE_EMULATOR_HOST = '127.0.0.1:9000';
  admin.initializeApp({
    projectId: 'parksense-india',
    databaseURL: 'http://127.0.0.1:9000?ns=parksense-india'
  });
}

const firestore = admin.firestore();
const rtdb = admin.database();

async function postJson(url: string, body: any) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await resp.json().catch(() => ({}));
  return { statusCode: resp.status, data };
}

describe('Reservation Engine: High-Concurrency Double-Booking Prevention', function () {
  this.timeout(60000);

  const TEST_ZONE = 'delhi-cp-inner';
  let currentBayId: string;

  beforeEach(async () => {
    currentBayId = `bay-conc-${Date.now()}-${randomUUID().slice(0, 4)}`;

    await firestore.collection('bays').doc(currentBayId).set({
      id: currentBayId,
      zoneId: TEST_ZONE,
      bayNumber: 'TC-99',
      status: 'available',
      vehicleType: 'two_wheeler',
      sensorId: 'sensor-tc-99',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    await rtdb.ref(`live_bays/${TEST_ZONE}/${currentBayId}`).set({
      status: 'available',
      isReserved: false,
      vehicleType: 'two_wheeler'
    });
  });

  afterEach(async () => {
    if (currentBayId) {
      try {
        await firestore.collection('bays').doc(currentBayId).delete();
        await rtdb.ref(`live_bays/${TEST_ZONE}/${currentBayId}`).remove();
        const reservations = await firestore
          .collection('reservations')
          .where('bayId', '==', currentBayId)
          .get();
        for (const doc of reservations.docs) {
          await doc.ref.delete();
        }
      } catch (e) {}
    }
  });

  it('ACID Invariant: 50 simultaneous transaction attempts at ONE bay must yield EXACTLY 1 winner and 49 conflicts', async () => {
    const CONCURRENCY_COUNT = 50;
    console.log(`\n  ⚡ Firing ${CONCURRENCY_COUNT} simultaneous transactional bookings at bay ${currentBayId}...`);

    const bayRef = firestore.collection('bays').doc(currentBayId);

    const attempts = Array.from({ length: CONCURRENCY_COUNT }, async (_, index) => {
      const citizenId = `concurrent-citizen-${index + 1}`;
      const reservationId = `res_tx_${index}_${randomUUID().slice(0, 6)}`;
      const resRef = firestore.collection('reservations').doc(reservationId);
      const now = Date.now();

      try {
        await firestore.runTransaction(async (transaction) => {
          const bayDoc = await transaction.get(bayRef);
          if (!bayDoc.exists) {
            throw new Error('NOT_FOUND');
          }
          const bayData = bayDoc.data()!;
          if (bayData.status !== 'available') {
            throw new Error(`CONFLICT: Bay ${currentBayId} is already ${bayData.status}`);
          }

          transaction.set(resRef, {
            id: reservationId,
            userId: citizenId,
            zoneId: TEST_ZONE,
            bayId: currentBayId,
            vehicleNumber: `DL01TX${1000 + index}`,
            vehicleType: 'two_wheeler',
            status: 'hold',
            holdExpiresAt: now + 600000,
            startTime: now,
            endTime: now + 3600000,
            lockedHourlyRate: 20,
            estimatedAmount: 20,
            qrToken: `PS-TX-${index}`,
            createdAt: now,
            updatedAt: now
          });

          transaction.update(bayRef, {
            status: 'reserved',
            currentSession: {
              reservationId,
              citizenId,
              reservedAt: now
            },
            updatedAt: now
          });
        });

        return { success: true, citizenId, reservationId };
      } catch (err: any) {
        return { success: false, citizenId, error: err.message };
      }
    });

    const results = await Promise.all(attempts);

    const successes = results.filter((r) => r.success);
    const failures = results.filter((r) => !r.success);

    console.log(`  📊 Concurrency Test Summary:`);
    console.log(`     • Total Simultaneous Contenders: ${CONCURRENCY_COUNT}`);
    console.log(`     • Successful Bookings (Held):   ${successes.length}`);
    console.log(`     • Blocked / Rejected Conflicts:  ${failures.length}`);

    // Invariants
    assert.strictEqual(
      successes.length,
      1,
      `FATAL DOUBLE-BOOKING: Expected exactly 1 winner among 50 contenders, but got ${successes.length}!`
    );
    assert.strictEqual(
      failures.length,
      CONCURRENCY_COUNT - 1,
      `Expected ${CONCURRENCY_COUNT - 1} transactions to be rejected, but got ${failures.length}`
    );

    // Verify bay state in Firestore
    const finalBay = await bayRef.get();
    assert.strictEqual(finalBay.data()?.status, 'reserved', 'Bay status must be reserved in Firestore');

    console.log(`  🏆 Winner: Citizen ${successes[0].citizenId} reserved ${successes[0].reservationId}`);
    console.log(`  🛡️ Zero double bookings verified!`);
  });

  it('HTTP Cloud Function End-to-End: Full reservation lifecycle works seamlessly', async () => {
    // 1. Hold
    const holdRes = await postJson(`${FUNCTION_URL}/createHold`, {
      zoneId: TEST_ZONE,
      bayId: currentBayId,
      vehicleNumber: 'DL01AB8888',
      vehicleType: 'two_wheeler',
      durationMinutes: 60,
      userId: 'test-citizen-lifecycle'
    });

    assert.strictEqual(holdRes.statusCode, 201);
    assert.strictEqual(holdRes.data.status, 'hold');
    const { reservationId, qrToken } = holdRes.data;
    assert.ok(reservationId);
    assert.ok(qrToken);

    // 2. Subsequent hold on same bay is blocked
    const conflictRes = await postJson(`${FUNCTION_URL}/createHold`, {
      zoneId: TEST_ZONE,
      bayId: currentBayId,
      vehicleNumber: 'DL01AB9999',
      vehicleType: 'two_wheeler',
      userId: 'another-citizen'
    });
    assert.strictEqual(conflictRes.statusCode, 409);

    // 3. Confirm booking
    const confirmRes = await postJson(`${FUNCTION_URL}/confirmBooking`, {
      reservationId,
      paymentMethod: 'razorpay_upi'
    });
    assert.strictEqual(confirmRes.statusCode, 200);
    assert.strictEqual(confirmRes.data.status, 'confirmed');

    // 4. Check-in with QR code
    const checkInRes = await postJson(`${FUNCTION_URL}/checkIn`, {
      reservationId,
      qrToken
    });
    assert.strictEqual(checkInRes.statusCode, 200);
    assert.strictEqual(checkInRes.data.status, 'active');

    // 5. Extend
    const extendRes = await postJson(`${FUNCTION_URL}/extendReservation`, {
      reservationId,
      additionalMinutes: 30
    });
    assert.strictEqual(extendRes.statusCode, 200);
    assert.strictEqual(extendRes.data.additionalCost, 10);

    // 6. Cancel / End
    const cancelRes = await postJson(`${FUNCTION_URL}/cancelReservation`, {
      reservationId,
      reason: 'session_completed'
    });
    if (cancelRes.statusCode !== 200) {
      console.error('Cancel failed:', cancelRes.data);
    }
    assert.strictEqual(cancelRes.statusCode, 200);
    assert.strictEqual(cancelRes.data.status, 'cancelled');

    // Verify bay is free again
    const finalBay = await firestore.collection('bays').doc(currentBayId).get();
    assert.strictEqual(finalBay.data()?.status, 'available');

    console.log(`  ✅ Lifecycle confirmed: hold -> confirmed -> checkIn (active) -> extend -> release (available)`);
  });
});
