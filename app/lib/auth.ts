'use client';
// Firebase Phone Auth helpers — mismo patrón que rudewear y Lafayette.
// El check de "es admin?" mira users/{uid}.role === 'admin'. Como
// toolhome comparte Firebase project con los otros subs, un phone
// que ya sea admin en rudewear entra directo acá sin crear cuenta.

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut as fbSignOut,
  onAuthStateChanged,
  type ConfirmationResult,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export function setupRecaptcha(containerId: string): RecaptchaVerifier {
  if (typeof window === 'undefined') {
    throw new Error('setupRecaptcha called server-side');
  }
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch {
      /* ignore */
    }
    window.recaptchaVerifier = undefined;
  }
  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      /* success */
    },
    'expired-callback': () => {
      /* retry lo maneja el próximo intent */
    },
  });
  return window.recaptchaVerifier;
}

export async function sendSmsCode(digitsUS: string): Promise<void> {
  if (!/^\d{10}$/.test(digitsUS)) {
    throw new Error('Phone must be 10 digits (US only).');
  }
  if (!window.recaptchaVerifier) {
    throw new Error('reCAPTCHA verifier not initialized.');
  }
  const result = await signInWithPhoneNumber(
    auth,
    `+1${digitsUS}`,
    window.recaptchaVerifier
  );
  window.confirmationResult = result;
}

export async function confirmSmsCode(code: string): Promise<User> {
  if (!/^\d{6}$/.test(code)) {
    throw new Error('Code must be 6 digits.');
  }
  if (!window.confirmationResult) {
    throw new Error('No pending confirmation. Request a new code.');
  }
  const cred = await window.confirmationResult.confirm(code);
  window.confirmationResult = undefined;
  return cred.user;
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth);
}

export async function isAdmin(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return false;
    return snap.data()?.role === 'admin';
  } catch (err) {
    console.error('[isAdmin] check failed:', err);
    return false;
  }
}

export function onAuthChange(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}
