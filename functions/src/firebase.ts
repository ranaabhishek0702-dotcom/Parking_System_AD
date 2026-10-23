import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  const projectId = process.env.GCLOUD_PROJECT || 'parksense-india';
  const databaseURL =
    process.env.FIREBASE_DATABASE_URL ||
    (process.env.FIREBASE_DATABASE_EMULATOR_HOST
      ? `http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST}?ns=${projectId}`
      : `http://127.0.0.1:9000?ns=${projectId}`);

  admin.initializeApp({
    projectId,
    databaseURL
  });
}

export const firestore = admin.firestore();
export const rtdb = admin.database();
export { FieldValue };
export { admin };
