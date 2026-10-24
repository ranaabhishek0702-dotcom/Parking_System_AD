import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { getAuth, connectAuthEmulator, signInWithCustomToken, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'parksense-india.firebaseapp.com',
  projectId: 'parksense-india',
  storageBucket: 'parksense-india.appspot.com',
  messagingSenderId: '123456789012',
  appId: '1:123456789012:web:demo-admin-app',
  databaseURL: 'http://127.0.0.1:9000?ns=parksense-india'
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const firestore = getFirestore(app);
export const rtdb = getDatabase(app);
export const auth = getAuth(app);

// Connect to emulators in development/local
if (typeof window !== 'undefined') {
  const isLocal =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (isLocal && !(window as any).__FIREBASE_ADMIN_EMULATORS_CONNECTED__) {
    try {
      connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
      connectDatabaseEmulator(rtdb, '127.0.0.1', 9000);
      connectAuthEmulator(auth, 'http://127.0.0.1:9099');
      (window as any).__FIREBASE_ADMIN_EMULATORS_CONNECTED__ = true;
    } catch (err) {
      // Ignore hot reload reconnection errors
    }
  }

  // Ensure default anonymous auth if no user is signed in
  auth.onAuthStateChanged((user) => {
    if (!user) {
      signInAnonymously(auth).catch((err) => {
        console.warn('Admin auth init warning:', err.message);
      });
    }
  });
}

export const FUNCTIONS_BASE_URL =
  process.env.NEXT_PUBLIC_FUNCTIONS_URL || 'http://127.0.0.1:5001/parksense-india/us-central1';
