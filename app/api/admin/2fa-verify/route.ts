import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/app/lib/firebaseAdmin';
import {
  ADMIN_2FA_FIELD,
  requireAdminWithoutTwoFactor,
} from '@/app/lib/adminApiAuth';
import {
  getClientIp,
  rateLimitOr429,
  userRateLimitOr429,
} from '@/app/lib/rateLimit';

// POST /api/admin/2fa-verify
// Body: { code: string (6 digits) }
// Header: Authorization: Bearer <Firebase ID token>
//
// Step 3 del admin login. Compara el code vs el hash en
// toolhome_adminTwoFactor/{uid}, atómico via runTransaction con
// attempts counter (max 3). On match: escribe toolhomeAdmin2faPassedAt.

function hashCode(code: string): string | null {
  const secret =
    process.env.EMAIL_CODE_HASH_SECRET || process.env.INTERNAL_API_SECRET;
  if (!secret) return null;
  return crypto.createHash('sha256').update(code + secret).digest('hex');
}

interface Body {
  code?: string;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const ipRl = await rateLimitOr429(`th-admin-2fa-verify-ip:${ip}`, {
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (ipRl) return ipRl;

  const caller = await requireAdminWithoutTwoFactor(request);
  if (!caller.ok) return caller.response;

  const uidRl = await userRateLimitOr429('th-admin-2fa-verify', caller.uid, {
    maxRequests: 10,
    windowMs: 5 * 60 * 1000,
  });
  if (uidRl) return uidRl;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Invalid code format' }, { status: 400 });
  }

  const expectedHash = hashCode(code);
  if (!expectedHash) {
    console.error('[admin/2fa-verify] INTERNAL_API_SECRET not set');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const codeDocRef = adminDb.doc(`toolhome_adminTwoFactor/${caller.uid}`);
  const userDocRef = adminDb.doc(`users/${caller.uid}`);

  const result = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(codeDocRef);
    if (!snap.exists) {
      return { error: 'No active 2FA code. Request a new one.', status: 400 };
    }
    const data = snap.data()!;
    const now = new Date();
    const expiresAt = data.expiresAt?.toDate
      ? data.expiresAt.toDate()
      : new Date(data.expiresAt);
    if (now > expiresAt) {
      tx.delete(codeDocRef);
      return { error: 'Code expired. Request a new one.', status: 400 };
    }
    const attempts = data.attempts || 0;
    if (attempts >= 3) {
      tx.delete(codeDocRef);
      return { error: 'Too many attempts. Request a new code.', status: 400 };
    }
    const a = Buffer.from(String(data.codeHash || ''), 'hex');
    const b = Buffer.from(expectedHash, 'hex');
    const matches = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!matches) {
      tx.update(codeDocRef, { attempts: attempts + 1 });
      return { error: 'Invalid code', status: 400 };
    }
    tx.delete(codeDocRef);
    tx.update(userDocRef, {
      [ADMIN_2FA_FIELD]: FieldValue.serverTimestamp(),
    });
    return { ok: true as const };
  });

  if ('error' in result && result.error) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status || 400 }
    );
  }
  return NextResponse.json({ success: true, verified: true });
}
