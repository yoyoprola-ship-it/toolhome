'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import {
  type Category,
  type Product,
  profitPerUnit,
  totalPrice,
} from '@/app/types';

function formatViewCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export default function ProductsListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState<string>('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [prodSnap, catSnap] = await Promise.all([
        getDocs(collection(db, 'toolhome_products')),
        getDocs(
          query(collection(db, 'toolhome_categories'), orderBy('order', 'asc'))
        ),
      ]);
      setProducts(
        prodSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product)
      );
      setCategories(
        catSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category)
      );
    } catch (err) {
      console.error('[products] load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const catById = useMemo(() => {
    const m = new Map<string, Category>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return products
      .filter((p) => filterCat === 'all' || p.categoryId === filterCat)
      .filter((p) => !s || p.name.toLowerCase().includes(s))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, filterCat, search]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'toolhome_products', id));
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-1">Products</h1>
          <p className="text-sm text-slate-500">
            {products.length} total · {products.filter((p) => p.active).length} live
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="px-4 py-2 bg-blue-900 hover:bg-blue-950 rounded text-sm font-bold uppercase tracking-wide text-white"
        >
          + New product
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="search"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 bg-white border border-slate-300 rounded text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
        />
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="px-4 py-2 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-blue-900"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="border border-slate-200 rounded p-8 text-center bg-white">
          <p className="text-slate-500 mb-4">
            {products.length === 0
              ? 'No products yet.'
              : 'No products match your filter.'}
          </p>
          {products.length === 0 && (
            <Link
              href="/admin/products/new"
              className="inline-block px-4 py-2 bg-blue-900 hover:bg-blue-950 rounded text-sm font-bold uppercase tracking-wide text-white"
            >
              + Add your first product
            </Link>
          )}
        </div>
      ) : (
        <div className="border border-slate-200 rounded overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-xs">
              <tr>
                <th className="text-left px-4 py-2 font-bold">Product</th>
                <th className="text-left px-4 py-2 font-bold">Category</th>
                <th className="text-right px-4 py-2 font-bold">Views</th>
                <th className="text-right px-4 py-2 font-bold">Stock</th>
                <th className="text-right px-4 py-2 font-bold">Product</th>
                <th className="text-right px-4 py-2 font-bold">Install</th>
                <th className="text-right px-4 py-2 font-bold">Total</th>
                <th className="text-right px-4 py-2 font-bold">Profit/u</th>
                <th className="text-center px-4 py-2 font-bold">Status</th>
                <th className="text-right px-4 py-2 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const cat = catById.get(p.categoryId);
                const total = totalPrice(p);
                const profit = profitPerUnit(p);
                return (
                  <tr
                    key={p.id}
                    className={`border-t border-slate-200 ${
                      p.active ? '' : 'opacity-50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.images[0]}
                            alt=""
                            className="w-10 h-10 object-cover rounded border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xs">
                            —
                          </div>
                        )}
                        <p className="font-bold">{p.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {cat?.name || (
                        <span className="text-slate-400 italic">missing</span>
                      )}
                    </td>
                    <td
                      className="px-4 py-3 text-right text-slate-500 tabular-nums"
                      title="Unique views (deduped per browser)"
                    >
                      {formatViewCount(p.viewCount || 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 tabular-nums">
                      {typeof p.stock === 'number' ? p.stock : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 tabular-nums">
                      ${(p.productPrice || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 tabular-nums">
                      ${(p.installFee || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">
                      ${total.toFixed(2)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-bold tabular-nums ${
                        profit > 0
                          ? 'text-green-700'
                          : profit < 0
                            ? 'text-red-600'
                            : 'text-slate-400'
                      }`}
                    >
                      ${profit.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          p.active
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-300'
                        }`}
                      >
                        {p.active ? 'Live' : 'Off'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="px-3 py-1 border border-slate-300 hover:border-slate-500 rounded text-xs font-bold uppercase text-slate-700"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          className="px-3 py-1 border border-red-200 text-red-700 hover:bg-red-50 rounded text-xs font-bold uppercase"
                        >
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
