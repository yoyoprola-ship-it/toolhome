'use client';
import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './lib/firebase';

// Coming Soon del subdomain toolhome.lafayettelamarket.com. Captura
// emails en `toolhome_signups` para armar la lista de warm leads
// antes del launch. Igual patrón que Rudewear al principio.

export default function ComingSoonPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'ok' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'submitting') return;
    setError('');
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setError('Enter a valid email.');
      return;
    }
    setStatus('submitting');
    try {
      await addDoc(collection(db, 'toolhome_signups'), {
        email: trimmed,
        createdAt: serverTimestamp(),
        source: 'coming-soon',
        userAgent:
          typeof navigator !== 'undefined'
            ? navigator.userAgent.slice(0, 300)
            : '',
      });
      setStatus('ok');
    } catch (err) {
      console.error('[toolhome] signup failed:', err);
      setStatus('error');
      setError(
        err instanceof Error && err.message.includes('permission')
          ? 'Signup temporarily unavailable. Try again in a moment.'
          : 'Something went wrong. Try again.'
      );
    }
  };

  return (
    <main className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black tracking-tight text-slate-900">
              ToolHome
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Lafayette
            </span>
          </div>
          <a
            href="https://lafayettelamarket.com"
            className="text-xs text-slate-500 hover:text-slate-800 uppercase tracking-wider"
          >
            ← Lafayette Market
          </a>
        </div>
      </header>

      <section className="flex-1 flex items-center px-6 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500 mb-4">
            Launching soon in Lafayette, LA
          </p>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-slate-900 mb-6 leading-[1.05]">
            Numbers, mailboxes, cameras.
            <br />
            <span className="text-blue-900">Installed.</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-xl mx-auto mb-10">
            The tools your house needs — brought and installed by a local team.
            Book online, we bring the products, install them at your door,
            and you pay when it&apos;s done.
          </p>

          {status === 'ok' ? (
            <div className="max-w-md mx-auto border border-blue-900/20 bg-blue-50 rounded-lg p-6">
              <p className="font-bold text-blue-900 mb-1">You&apos;re on the list.</p>
              <p className="text-sm text-slate-600">
                We&apos;ll email you the moment installations open.
              </p>
            </div>
          ) : (
            <form
              onSubmit={submit}
              className="max-w-md mx-auto flex flex-col sm:flex-row gap-2"
            >
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === 'submitting'}
                required
                className="flex-1 px-4 py-3 border border-slate-300 bg-white rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition"
              />
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="px-6 py-3 bg-blue-900 hover:bg-blue-950 active:bg-blue-950 disabled:opacity-60 text-white font-bold rounded-md transition-colors"
              >
                {status === 'submitting' ? 'Adding…' : 'Notify me'}
              </button>
            </form>
          )}
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

          {/* Product hints */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mt-20 text-left">
            <FeatureCard
              title="House numbers"
              body="Modern metal, LED-lit, or classic — chosen for the front of your home."
            />
            <FeatureCard
              title="Mailboxes"
              body="Curbside, wall-mount, and locking styles. Weatherproofed for Louisiana."
            />
            <FeatureCard
              title="Ring cameras"
              body="Doorbell, floodlight, stick-up. Installed and configured on your Wi-Fi."
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-6 text-center">
        <p className="text-xs text-slate-500">
          A brand from{' '}
          <a
            href="https://lafayettelamarket.com"
            className="text-slate-700 underline decoration-slate-300 hover:decoration-slate-500 transition"
          >
            Lafayette Market
          </a>
        </p>
      </footer>
    </main>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-slate-200 bg-white rounded-lg p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-1">
        {title}
      </p>
      <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
    </div>
  );
}
