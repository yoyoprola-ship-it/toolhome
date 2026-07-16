import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebaseAdmin';
import { getClientIp, rateLimitOr429 } from '@/app/lib/rateLimit';

// POST /api/admin/check-phone
// Body: { phone: string (10 digits) }
// Returns: { canLogin: boolean }
//
// Pre-flight que /admin/login llama ANTES de disparar Firebase Phone
// Auth. Sin esto, cualquiera puede meter un phone random y Firebase
// manda un SMS pagado (~$0.05) para descubrir después que no era admin.

interface Body {
  phone?: unknown;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const ipRl = await rateLimitOr429(`th-check-phone-ip:${ip}`, {
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (ipRl) return ipRl;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const raw = typeof body.phone === 'string' ? body.phone : '';
  const digits = raw.replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) {
    return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });
  }

  try {
    let snap = await adminDb
      .collection('users')
      .where('phone', '==', digits)
      .limit(1)
      .get();
    if (snap.empty) {
      snap = await adminDb
        .collection('users')
        .where('phone', '==', `+1${digits}`)
        .limit(1)
        .get();
    }
    if (snap.empty) return NextResponse.json({ canLogin: false });
    const canLogin = snap.docs[0].data()?.role === 'admin';
    return NextResponse.json({ canLogin });
  } catch (err) {
    console.error('[check-phone] query failed:', err);
    return NextResponse.json({ error: 'Auth check failed' }, { status: 500 });
  }
}
