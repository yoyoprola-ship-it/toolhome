'use client';
// Firebase client-side singleton. Comparte el mismo Firebase project que
// Lafayette Market y Rudewear (lafayette-market-d64ff). Las colecciones
// van prefijadas `toolhome_*` para no chocar con las de los otros subs.
//
// Init directo (no Proxy) — Firestore SDK hace instanceof checks
// internos sobre el argument de collection() y otros; un Proxy los
// rompe. Guard con apiKey check para que el build no crashee si algún
// prerender corre sin env vars inyectados.

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
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

// Init sólo si tenemos apiKey — evita crash en prerender sin env.
// En prod (App Hosting inyecta secrets en build), esto siempre corre.
const app: FirebaseApp | null = firebaseConfig.apiKey
  ? (getApps()[0] ?? initializeApp(firebaseConfig))
  : null;

// Los `as any` son safe: en runtime browser el app SIEMPRE existe
// (env vars inlined en build). Los null-fallbacks son solo para que
// el módulo pueda evaluarse durante prerender sin explotar. Cualquier
// user code que llegue a llamar collection(db,...) etc. ya está en el
// cliente donde el app está listo.
/* eslint-disable @typescript-eslint/no-explicit-any */
export const auth: Auth = (app ? getAuth(app) : null) as any;
export const db: Firestore = (app ? getFirestore(app) : null) as any;
export const storage: FirebaseStorage = (app ? getStorage(app) : null) as any;
/* eslint-enable @typescript-eslint/no-explicit-any */
