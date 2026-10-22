import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import { ref, get, set } from 'firebase/database';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ID = 'rtdb-rules-test-' + Date.now();

describe('Realtime Database Security Rules: Hot State RBAC', () => {
  let testEnv: RulesTestEnvironment;

  before(async () => {
    const rulesPath = path.resolve(__dirname, '../../../database.rules.json');
    const rules = fs.readFileSync(rulesPath, 'utf8');

    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      database: {
        rules,
        host: process.env.FIREBASE_DATABASE_EMULATOR_HOST?.split(':')[0] || '127.0.0.1',
        port: Number(process.env.FIREBASE_DATABASE_EMULATOR_HOST?.split(':')[1] || 9000)
      }
    });
  });

  after(async () => {
    await testEnv.cleanup();
  });

  it('POSITIVE: Public (unauthenticated) CAN read live_zones', async () => {
    const unauthDb = testEnv.unauthenticatedContext().database();
    const zoneRef = ref(unauthDb, 'live_zones/delhi-cp-inner');
    await assertSucceeds(get(zoneRef));
  });

  it('NEGATIVE: Public (unauthenticated) CANNOT write live_zones', async () => {
    const unauthDb = testEnv.unauthenticatedContext().database();
    const zoneRef = ref(unauthDb, 'live_zones/delhi-cp-inner');
    await assertFails(set(zoneRef, { occupiedBays: 99 }));
  });

  it('NEGATIVE: Unauthenticated CANNOT read live_bays', async () => {
    const unauthDb = testEnv.unauthenticatedContext().database();
    const bayRef = ref(unauthDb, 'live_bays/delhi-cp-inner/bay-01');
    await assertFails(get(bayRef));
  });

  it('POSITIVE: Authenticated citizen CAN read live_bays', async () => {
    const authDb = testEnv.authenticatedContext('citizen_1', { role: 'citizen' }).database();
    const bayRef = ref(authDb, 'live_bays/delhi-cp-inner/bay-01');
    await assertSucceeds(get(bayRef));
  });

  it('NEGATIVE: Citizen CANNOT write live_zones', async () => {
    const citizenDb = testEnv.authenticatedContext('citizen_1', { role: 'citizen' }).database();
    const zoneRef = ref(citizenDb, 'live_zones/delhi-cp-inner');
    await assertFails(set(zoneRef, { occupiedBays: 0 }));
  });

  it('POSITIVE: Super Admin CAN write to live_zones', async () => {
    const adminDb = testEnv.authenticatedContext('admin_1', { role: 'super_admin' }).database();
    const zoneRef = ref(adminDb, 'live_zones/delhi-cp-inner');
    await assertSucceeds(
      set(zoneRef, {
        totalBays: 48,
        occupiedBays: 20,
        reservedBays: 2,
        availableBays: 26,
        occupancyRate: 0.416,
        currentRatePerHour: 40,
        lastUpdated: Date.now()
      })
    );
  });
});
