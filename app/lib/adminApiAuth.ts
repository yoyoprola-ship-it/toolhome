import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from './firebaseAdmin';

// Helpers para autenticar endpoints admin de toolhome.
//
// El 2FA es INDEPENDIENTE de rudewear — cada subdomain guarda su
// propio flag en el user doc. Same user, separate sessions:
//   - rudewear   → users/{uid}.admin2faPassedAt
//   - toolhome   → users/{uid}.toolhomeAdmin2faPassedAt
//
// Dos variantes de auth:
//   - requireAdminWithoutTwoFactor(): usada por los endpoints DEL
//     flow 2FA (send/verify). Válida token + role='admin'.
//   - requireAdmin(): usada por endpoints protegidos POST-2FA.
//     Además exige toolhomeAdmin2faPassedAt fresco (< 30 min).

export const ADMIN_2FA_WINDOW_MS = 30 * 60 * 1000;
export const ADMIN_2FA_FIELD = 'toolhomeAdmin2faPassedAt' as const;

interface UserDocData {
  role?: string;
  email?: string;
  toolhomeAdmin2faPassedAt?: {
    toMillis: () => number;
  } | null;
  [k: string]: unknown;
}

export type AuthOk = { ok: true; uid: string; data: UserDocData };
export type AuthFail = { ok: false; response: NextResponse };
export type AuthResult = AuthOk | AuthFail;

async function verifyAndLoad(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Missing auth token' },
        { status: 401 }
      ),
    };
  }
  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(token, true);
    uid = decoded.uid;
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Invalid auth token' },
        { status: 401 }
      ),
    };
  }
  let data: UserDocData;
  try {
    const snap = await adminDb.collection('users').doc(uid).get();
    if (!snap.exists) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'User not found' },
          { status: 403 }
        ),
      };
    }
    data = snap.data() as UserDocData;
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Auth error' },
        { status: 500 }
      ),
    };
  }
  if (data.role !== 'admin') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Admin only' }, { status: 403 }),
    };
  }
  return { ok: true, uid, data };
}

export async function requireAdminWithoutTwoFactor(
  request: NextRequest
): Promise<AuthResult> {
  return verifyAndLoad(request);
}

export async function requireAdmin(request: NextRequest): Promise<AuthResult> {
  const base = await verifyAndLoad(request);
  if (!base.ok) return base;
  const passedAt = base.data[ADMIN_2FA_FIELD];
  const passedMs =
    passedAt && typeof passedAt.toMillis === 'function'
      ? passedAt.toMillis()
      : 0;
  if (!passedMs || Date.now() - passedMs > ADMIN_2FA_WINDOW_MS) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: '2FA required', need2fa: true },
        { status: 403 }
      ),
    };
  }
  return base;
}
