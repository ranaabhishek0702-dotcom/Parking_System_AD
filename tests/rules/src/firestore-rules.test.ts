import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ID = 'rules-test-project-' + Date.now();

describe('Firestore Security Rules: RBAC & Tenant Isolation', () => {
  let testEnv: RulesTestEnvironment;

  before(async () => {
    const rulesPath = path.resolve(__dirname, '../../../firestore.rules');
    const rules = fs.readFileSync(rulesPath, 'utf8');

    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules,
        host: process.env.FIRESTORE_EMULATOR_HOST?.split(':')[0] || '127.0.0.1',
        port: Number(process.env.FIRESTORE_EMULATOR_HOST?.split(':')[1] || 8080)
      }
    });
  });

  after(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  // ========================================================
  // 1. PAYMENTS ISOLATION (MANDATORY REQUIREMENT)
  // ========================================================
  describe('Payments Isolation (Strict Negative & Positive Tests)', () => {
    const paymentId = 'pay_123';
    const citizenA = 'user_alice';
    const citizenB = 'user_bob';

    beforeEach(async () => {
      // Setup payment doc owned by Alice using admin context
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'payments', paymentId), {
          id: paymentId,
          reservationId: 'res_123',
          userId: citizenA,
          amount: 120,
          currency: 'INR',
          status: 'captured'
        });
      });
    });

    it('NEGATIVE: Citizen B must NEVER read Citizen A\'s payment (403 Permission Denied)', async () => {
      const bobDb = testEnv.authenticatedContext(citizenB, { role: 'citizen' }).firestore();
      const paymentDoc = doc(bobDb, 'payments', paymentId);
      await assertFails(getDoc(paymentDoc));
    });

    it('NEGATIVE: Unauthenticated visitor must NEVER read any payment', async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const paymentDoc = doc(unauthDb, 'payments', paymentId);
      await assertFails(getDoc(paymentDoc));
    });

    it('POSITIVE: Citizen A CAN read their own payment', async () => {
      const aliceDb = testEnv.authenticatedContext(citizenA, { role: 'citizen' }).firestore();
      const paymentDoc = doc(aliceDb, 'payments', paymentId);
      await assertSucceeds(getDoc(paymentDoc));
    });

    it('POSITIVE: Finance Auditor CAN read Citizen A\'s payment for audit compliance', async () => {
      const auditorDb = testEnv.authenticatedContext('auditor_1', { role: 'finance_auditor' }).firestore();
      const paymentDoc = doc(auditorDb, 'payments', paymentId);
      await assertSucceeds(getDoc(paymentDoc));
    });

    it('POSITIVE: Super Admin CAN read any payment', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1', { role: 'super_admin' }).firestore();
      const paymentDoc = doc(adminDb, 'payments', paymentId);
      await assertSucceeds(getDoc(paymentDoc));
    });
  });

  // ========================================================
  // 2. ZONES & BAYS PERMISSIONS
  // ========================================================
  describe('Zones & Bays Access Control', () => {
    it('POSITIVE: Public (unauthenticated) CAN read zones', async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const zoneDoc = doc(unauthDb, 'zones', 'delhi-cp-inner');
      await assertSucceeds(getDoc(zoneDoc));
    });

    it('NEGATIVE: Citizen CANNOT create or update zones', async () => {
      const citizenDb = testEnv.authenticatedContext('user_alice', { role: 'citizen' }).firestore();
      const zoneDoc = doc(citizenDb, 'zones', 'delhi-cp-inner');
      await assertFails(
        setDoc(zoneDoc, {
          name: 'Hacked Zone',
          baseHourlyRate: 0
        })
      );
    });

    it('POSITIVE: Zone Manager CAN write to zones', async () => {
      const managerDb = testEnv.authenticatedContext('mgr_1', { role: 'zone_manager' }).firestore();
      const zoneDoc = doc(managerDb, 'zones', 'delhi-cp-inner');
      await assertSucceeds(
        setDoc(zoneDoc, {
          name: 'Connaught Place',
          baseHourlyRate: 40
        })
      );
    });
  });

  // ========================================================
  // 3. PRICING RULES & ENFORCEMENT ISOLATION
  // ========================================================
  describe('Pricing Rules & Violations Security', () => {
    it('NEGATIVE: Enforcement Officer CANNOT modify pricing rules', async () => {
      const officerDb = testEnv.authenticatedContext('officer_1', { role: 'enforcement_officer' }).firestore();
      const ruleDoc = doc(officerDb, 'pricing_rules', 'rule-peak-evening');
      await assertFails(
        setDoc(ruleDoc, {
          multiplier: 3.0
        })
      );
    });

    it('POSITIVE: Enforcement Officer CAN issue violations', async () => {
      const officerDb = testEnv.authenticatedContext('officer_1', { role: 'enforcement_officer' }).firestore();
      const violationDoc = doc(officerDb, 'violations', 'viol_999');
      await assertSucceeds(
        setDoc(violationDoc, {
          id: 'viol_999',
          zoneId: 'delhi-cp-inner',
          bayId: 'bay-del-cp-001',
          type: 'unauthorized_parking',
          fineAmount: 500,
          status: 'detected'
        })
      );
    });
  });

  // ========================================================
  // 4. AUDIT LOGS IMMUTABILITY
  // ========================================================
  describe('Audit Logs Security', () => {
    it('NEGATIVE: Citizen CANNOT read audit logs', async () => {
      const citizenDb = testEnv.authenticatedContext('user_alice', { role: 'citizen' }).firestore();
      const logDoc = doc(citizenDb, 'audit_logs', 'log_1');
      await assertFails(getDoc(logDoc));
    });

    it('POSITIVE: Super Admin CAN read audit logs', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1', { role: 'super_admin' }).firestore();
      const logDoc = doc(adminDb, 'audit_logs', 'log_1');
      await assertSucceeds(getDoc(logDoc));
    });
  });
});
