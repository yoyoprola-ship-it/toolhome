'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthChange, isAdmin, signOut } from '@/app/lib/auth';
import { db } from '@/app/lib/firebase';
import type { User } from 'firebase/auth';

// Layout que protege /admin/**. Verifica sesión + role='admin' +
// toolhomeAdmin2faPassedAt fresco (< 30 min). Cualquier fallo redirige
// a /admin/login. Isolated de rudewear — cada sub tiene su propio flag.

const ADMIN_2FA_WINDOW_MS = 30 * 60 * 1000;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) {
      setReady(true);
      return;
    }
    const unsub = onAuthChange(async (u) => {
      if (!u) {
        router.replace('/admin/login');
        return;
      }
      const admin = await isAdmin(u.uid);
      if (!admin) {
        await signOut();
        router.replace('/admin/login');
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        const data = snap.data() as
          | { toolhomeAdmin2faPassedAt?: { toMillis: () => number } }
          | undefined;
        const passedAt = data?.toolhomeAdmin2faPassedAt;
        const passedMs =
          passedAt && typeof passedAt.toMillis === 'function'
            ? passedAt.toMillis()
            : 0;
        if (!passedMs || Date.now() - passedMs > ADMIN_2FA_WINDOW_MS) {
          router.replace('/admin/login');
          return;
        }
      } catch (err) {
        console.error('[admin-layout] 2fa check failed:', err);
        router.replace('/admin/login');
        return;
      }
      setUser(u);
      setReady(true);
    });
    return () => unsub();
  }, [router, isLoginPage]);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/admin/login');
  };

  if (isLoginPage) return <>{children}</>;

  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white text-slate-500">
        Verifying access…
      </main>
    );
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/products', label: 'Products' },
    { href: '/admin/categories', label: 'Categories' },
    // Se irán agregando: bookings / messages
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/admin" className="text-xl font-black tracking-tight">
            ToolHome
            <span className="text-slate-400 text-xs font-medium tracking-normal ml-2 uppercase">
              admin
            </span>
          </Link>
          <nav className="flex gap-1">
            {navItems.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== '/admin' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded text-sm font-bold uppercase tracking-wide transition-colors ${
                    active
                      ? 'bg-blue-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 hidden sm:inline">
            {user?.email}
          </span>
          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-600 hover:text-slate-900 border border-slate-300 hover:border-slate-500 rounded transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="flex-1 p-6 max-w-6xl w-full mx-auto">{children}</div>
    </div>
  );
}
