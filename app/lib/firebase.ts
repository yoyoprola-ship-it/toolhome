'use client';
// Firebase client-side singleton. Comparte el mismo Firebase project que
// Lafayette Market y Rudewear (lafayette-market-d64ff). Las colecciones
// van prefijadas `toolhome_*` para no chocar con las de los otros subs.
//
// El init es tolerante a env vars ausentes durante prerender (SSG) —
// devolvemos stubs para que `import { db } from ...` no crashee build.
// En runtime con NEXT_PUBLIC_* seteados, funciona normal.

import {
  initializeApp,
  getApps,
  type FirebaseApp,
} from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;

function safeInit(): FirebaseApp | null {
  // Sin apiKey (build time sin env local) → skip. Client con env → init.
  if (!firebaseConfig.apiKey) return null;
  if (getApps().length > 0) return getApps()[0];
  try {
    return initializeApp(firebaseConfig);
  } catch (err) {
    console.error('[firebase] init failed:', err);
    return null;
  }
}

app = safeInit();

// Los servicios se acceden vía getters lazy. Si app no está listo
// (prerender), throw un error legible en lugar del cryptic
// 'auth/invalid-api-key' que muestra Firebase.
function requireApp(): FirebaseApp {
  if (!app) app = safeInit();
  if (!app) {
    throw new Error(
      'Firebase not initialized — NEXT_PUBLIC_FIREBASE_* env vars missing.'
    );
  }
  return app;
}

let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

export const auth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    if (!_auth) _auth = getAuth(requireApp());
    return (_auth as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const db: Firestore = new Proxy({} as Firestore, {
  get(_, prop) {
    if (!_db) _db = getFirestore(requireApp());
    return (_db as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const storage: FirebaseStorage = new Proxy({} as FirebaseStorage, {
  get(_, prop) {
    if (!_storage) _storage = getStorage(requireApp());
    return (_storage as unknown as Record<string | symbol, unknown>)[prop];
  },
});
