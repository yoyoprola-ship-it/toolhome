'use client';
import Link from 'next/link';

// Dashboard skeleton — se va a poblar con KPIs y quick actions cuando
// sumemos products/services/bookings. Por ahora es la landing del panel.

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight mb-1">Dashboard</h1>
      <p className="text-sm text-slate-500 mb-8">
        Welcome to ToolHome admin. More sections coming as we ship products
        and bookings.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <PlaceholderCard
          title="Signups"
          hint="Emails captured on the Coming Soon landing."
          count="—"
        />
        <PlaceholderCard
          title="Products"
          hint="Numbers, mailboxes, cameras — set up your catalog."
          count="—"
        />
        <PlaceholderCard
          title="Bookings"
          hint="Install visits scheduled by customers."
          count="—"
        />
      </div>

      <div className="border border-slate-200 bg-white rounded p-6">
        <p className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">
          Roadmap
        </p>
        <ul className="text-sm text-slate-700 space-y-1.5 list-disc list-inside">
          <li>Products/services CRUD (with photos, install fee, retail price)</li>
          <li>Public store — customers see products before booking</li>
          <li>Booking modal — schedule install visit</li>
          <li>Admin bookings panel + SMS notify on new booking</li>
          <li>Reviews / testimonials post-install</li>
        </ul>
        <p className="text-xs text-slate-500 mt-4">
          Powered by the same Firebase project as{' '}
          <Link
            href="https://lafayettelamarket.com"
            className="underline decoration-slate-300 hover:decoration-slate-500"
          >
            Lafayette Market
          </Link>{' '}
          and{' '}
          <Link
            href="https://rudewear.lafayettelamarket.com"
            className="underline decoration-slate-300 hover:decoration-slate-500"
          >
            Rudewear
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function PlaceholderCard({
  title,
  hint,
  count,
}: {
  title: string;
  hint: string;
  count: string;
}) {
  return (
    <div className="p-4 rounded border border-slate-200 bg-white">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
        {title}
      </p>
      <p className="text-2xl font-black text-slate-900">{count}</p>
      <p className="text-xs text-slate-500 mt-1">{hint}</p>
    </div>
  );
}
