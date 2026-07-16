'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { auth, db } from '@/app/lib/firebase';
import { uploadProductImage } from '@/app/lib/imageUpload';
import type { Category, Product } from '@/app/types';

// Shared form del CRUD de productos. Mismo patrón que rudewear:
// drag-drop de imágenes (long-press), upload directo desde disco,
// productPrice + installFee separados para que se vea el breakdown
// en la home.

interface ProductFormProps {
  initial?: Product | null;
}

export default function ProductForm({ initial }: ProductFormProps) {
  const router = useRouter();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId || '');
  const [productPrice, setProductPrice] = useState(
    initial ? String(initial.productPrice) : ''
  );
  const [installFee, setInstallFee] = useState(
    initial ? String(initial.installFee) : ''
  );
  const [costPrice, setCostPrice] = useState(
    initial ? String(initial.costPrice) : ''
  );
  const [supplierUrl, setSupplierUrl] = useState(initial?.supplierUrl || '');
  const [stock, setStock] = useState<string>(
    typeof initial?.stock === 'number' ? String(initial.stock) : ''
  );
  const [active, setActive] = useState<boolean>(initial?.active ?? true);
  const [images, setImages] = useState<string[]>(initial?.images || []);

  const [categories, setCategories] = useState<Category[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'toolhome_categories'), orderBy('order', 'asc'))
        );
        setCategories(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category)
        );
      } catch (err) {
        console.error('[product-form] load categories failed:', err);
      }
    })();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active: a, over: o } = e;
    if (!o || a.id === o.id) return;
    setImages((prev) => {
      const oldIndex = prev.indexOf(a.id as string);
      const newIndex = prev.indexOf(o.id as string);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setError('Session expired.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const res = await uploadProductImage(file, uid);
        uploaded.push(res.url);
      }
      setImages((prev) => [...prev, ...uploaded]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (url: string) => {
    setImages((prev) => prev.filter((u) => u !== url));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError('');

    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setError('Name too short.');
      return;
    }
    if (!categoryId) {
      setError('Pick a category.');
      return;
    }
    const pp = parseFloat(productPrice);
    const inst = parseFloat(installFee);
    const cp = parseFloat(costPrice);
    if (!Number.isFinite(pp) || pp < 0) {
      setError('Product price must be a positive number.');
      return;
    }
    if (!Number.isFinite(inst) || inst < 0) {
      setError('Install fee must be a positive number.');
      return;
    }
    if (!Number.isFinite(cp) || cp < 0) {
      setError('Cost must be a positive number.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: cleanName,
        description: description.trim().slice(0, 3000),
        images,
        categoryId,
        productPrice: pp,
        installFee: inst,
        costPrice: cp,
        supplierUrl: supplierUrl.trim().slice(0, 500),
        active,
        stock: stock === '' ? null : Math.max(0, parseInt(stock, 10) || 0),
        updatedAt: serverTimestamp(),
      };
      if (isEdit && initial) {
        await setDoc(doc(db, 'toolhome_products', initial.id), payload, {
          merge: true,
        });
      } else {
        await addDoc(collection(db, 'toolhome_products'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      router.push('/admin/products');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="max-w-3xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label>Name</Label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
            className={inputCls}
          />
        </div>
        <div>
          <Label>Category</Label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className={inputCls}
          >
            <option value="">Pick a category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6">
        <Label>Description</Label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={3000}
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div>
          <Label>Product price ($) 🌐</Label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={productPrice}
            onChange={(e) => setProductPrice(e.target.value)}
            required
            className={inputCls}
          />
          <p className={hint}>What the physical product costs the customer.</p>
        </div>
        <div>
          <Label>Install fee ($) 🌐</Label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={installFee}
            onChange={(e) => setInstallFee(e.target.value)}
            required
            className={inputCls}
          />
          <p className={hint}>Labor charge shown separately at checkout.</p>
        </div>
        <div>
          <Label>Cost ($) 🔒</Label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            required
            className={inputCls}
          />
          <p className={hint}>Admin-only. What ToolHome pays the supplier.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div>
          <Label>Supplier URL 🔒</Label>
          <input
            type="url"
            value={supplierUrl}
            onChange={(e) => setSupplierUrl(e.target.value)}
            placeholder="https://…"
            className={inputCls}
          />
          <p className={hint}>Admin-only reorder link.</p>
        </div>
        <div>
          <Label>Stock (optional)</Label>
          <input
            type="number"
            min="0"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="Leave blank if on-order"
            className={inputCls}
          />
          <p className={hint}>Blank means &quot;on order&quot; — no inventory held.</p>
        </div>
      </div>

      <div className="mt-6">
        <Label>Photos</Label>
        <p className="text-xs text-slate-500 mb-2">
          Drag to reorder — first photo is the cover.
        </p>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={images} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {images.map((url) => (
                <SortableImage
                  key={url}
                  url={url}
                  onRemove={() => handleRemoveImage(url)}
                />
              ))}
              <label className="aspect-square border-2 border-dashed border-slate-300 rounded flex items-center justify-center text-slate-500 hover:border-blue-900 hover:text-blue-900 cursor-pointer transition-colors text-center text-xs">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFiles(e.target.files)}
                  disabled={uploading}
                  className="hidden"
                />
                <div>
                  {uploading ? (
                    <>Uploading…</>
                  ) : (
                    <>
                      <div className="text-2xl mb-1">+</div>
                      <div>Add photos</div>
                    </>
                  )}
                </div>
              </label>
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <input
          type="checkbox"
          id="active"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="w-4 h-4 accent-blue-900"
        />
        <label htmlFor="active" className="text-sm">
          Live (visible on the store)
        </label>
      </div>

      {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

      <div className="mt-8 flex gap-3">
        <button
          type="submit"
          disabled={saving || uploading}
          className="px-6 py-3 bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white font-bold uppercase tracking-wide rounded"
        >
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/products')}
          className="px-6 py-3 border border-slate-300 hover:border-slate-500 text-slate-700 font-bold uppercase tracking-wide rounded"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function SortableImage({
  url,
  onRemove,
}: {
  url: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: url });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="aspect-square relative border border-slate-300 rounded overflow-hidden bg-slate-100 cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className="w-full h-full object-cover pointer-events-none"
        draggable={false}
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-bold shadow"
        title="Remove"
      >
        ×
      </button>
    </div>
  );
}

const inputCls =
  'w-full px-4 py-2 bg-white border border-slate-300 rounded text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition';

const hint = 'text-xs text-slate-500 mt-1';

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
      {children}
    </label>
  );
}
