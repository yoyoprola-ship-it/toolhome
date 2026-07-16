'use client';
import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import type { Category } from '@/app/types';

// CRUD inline de categorías. Simple — pocas rows, sin paginación.
// El order define la posición del display en la home; se puede editar
// directamente en la row.

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'toolhome_categories'), orderBy('order', 'asc'))
      );
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category));
    } catch (err) {
      console.error('[categories] load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError('');
    const clean = newName.trim();
    if (clean.length < 2 || clean.length > 40) {
      setError('Name must be 2–40 characters.');
      return;
    }
    setSaving(true);
    try {
      const order = items.length > 0
        ? Math.max(...items.map((i) => i.order || 0)) + 1
        : 0;
      await addDoc(collection(db, 'toolhome_categories'), {
        name: clean,
        slug: slugify(clean),
        order,
        active: true,
        createdAt: serverTimestamp(),
      });
      setNewName('');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (cat: Category) => {
    try {
      await updateDoc(doc(db, 'toolhome_categories', cat.id), {
        active: !cat.active,
      });
      setItems((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, active: !c.active } : c))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Toggle failed');
    }
  };

  const handleOrder = async (cat: Category, delta: number) => {
    const target = cat.order + delta;
    try {
      await updateDoc(doc(db, 'toolhome_categories', cat.id), { order: target });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Reorder failed');
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Delete "${cat.name}"? Products in this category won't be deleted, they'll just lose their category label.`))
      return;
    try {
      await deleteDoc(doc(db, 'toolhome_categories', cat.id));
      setItems((prev) => prev.filter((c) => c.id !== cat.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-1">Categories</h1>
          <p className="text-sm text-slate-500">
            Groups shown on the store nav and on the product form dropdown.
          </p>
        </div>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-6 max-w-lg">
        <input
          type="text"
          placeholder="New category name (e.g. House Numbers)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          disabled={saving}
          maxLength={40}
          className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
        />
        <button
          type="submit"
          disabled={saving || newName.trim().length < 2}
          className="px-4 py-2 bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white text-sm font-bold uppercase tracking-wide rounded"
        >
          {saving ? 'Adding…' : '+ Add'}
        </button>
      </form>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : items.length === 0 ? (
        <div className="border border-slate-200 rounded p-8 text-center bg-white">
          <p className="text-slate-500">No categories yet. Add one above.</p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-xs">
              <tr>
                <th className="text-left px-4 py-2 font-bold">Order</th>
                <th className="text-left px-4 py-2 font-bold">Name</th>
                <th className="text-left px-4 py-2 font-bold">Slug</th>
                <th className="text-center px-4 py-2 font-bold">Status</th>
                <th className="text-right px-4 py-2 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c, idx) => (
                <tr key={c.id} className="border-t border-slate-200">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOrder(c, -1)}
                        disabled={idx === 0}
                        className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900 disabled:opacity-30"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleOrder(c, 1)}
                        disabled={idx === items.length - 1}
                        className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900 disabled:opacity-30"
                        title="Move down"
                      >
                        ↓
                      </button>
                      <span className="text-xs text-slate-400 tabular-nums ml-1">
                        {c.order}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                    {c.slug}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggle(c)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        c.active
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-300'
                      }`}
                    >
                      {c.active ? 'Live' : 'Off'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(c)}
                      className="px-3 py-1 border border-red-200 text-red-700 hover:bg-red-50 rounded text-xs font-bold uppercase"
                    >
                      Del
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
