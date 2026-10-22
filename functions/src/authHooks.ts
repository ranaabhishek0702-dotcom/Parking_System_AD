import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { USER_ROLES, type UserRole } from '@parksense/shared';

if (!admin.apps.length) {
  admin.initializeApp();
}

const auth = admin.auth();
const firestore = admin.firestore();

/**
 * Assigns custom claims to a Firebase Auth user.
 * In production, restricted to callers with 'super_admin' custom claim.
 * In emulator/dev mode, allows bootstrapping initial admins.
 */
export const setUserRole = onRequest(
  {
    cors: true,
    region: 'us-central1'
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    try {
      const { uid, role, zoneId } = req.body;

      if (!uid || typeof uid !== 'string') {
        res.status(400).json({ error: 'Missing or invalid uid parameter' });
        return;
      }

      if (!role || !USER_ROLES.includes(role as UserRole)) {
        res.status(400).json({
          error: `Invalid role. Allowed roles: ${USER_ROLES.join(', ')}`
        });
        return;
      }

      // Check caller auth if not running on emulator
      const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV !== 'production';
      if (!isEmulator) {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          res.status(401).json({ error: 'Unauthorized: missing Bearer token' });
          return;
        }
        const idToken = authHeader.split('Bearer ')[1];
        const decoded = await auth.verifyIdToken(idToken);
        if (decoded.role !== 'super_admin') {
          res.status(403).json({ error: 'Forbidden: only super_admin can assign roles' });
          return;
        }
      }

      // Set custom claims on Firebase Auth
      const customClaims: Record<string, any> = { role };
      if (zoneId) {
        customClaims.zoneId = zoneId;
      }

      await auth.setCustomUserClaims(uid, customClaims);

      // Mirror role update into Firestore /users/{uid}
      await firestore.collection('users').doc(uid).set(
        {
          roles: [role],
          assignedZone: zoneId || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );

      res.status(200).json({
        status: 'success',
        message: `Successfully set role '${role}' for user ${uid}`,
        customClaims
      });
    } catch (err: any) {
      console.error('Error setting user role:', err);
      res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
      });
    }
  }
);
