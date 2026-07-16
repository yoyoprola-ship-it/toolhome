// Firebase Admin SDK singleton (server-only). Usa applicationDefault()
// que en Cloud Run / App Hosting resuelve automáticamente al service
// account del backend. Localmente, seteá GOOGLE_APPLICATION_CREDENTIALS.

import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
