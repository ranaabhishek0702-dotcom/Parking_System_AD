import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'parksense-india';

// Set emulator host environment variables if not already set
if (process.env.USE_FIREBASE_EMULATORS !== 'false') {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  process.env.FIREBASE_DATABASE_EMULATOR_HOST =
    process.env.FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1:9000';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
}

if (!admin.apps.length) {
  admin.initializeApp({
    projectId,
    databaseURL: `http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1:9000'}?ns=${projectId}`
  });
}

export const firestore = admin.firestore();
export const rtdb = admin.database();
export const auth = admin.auth();
export default admin;
