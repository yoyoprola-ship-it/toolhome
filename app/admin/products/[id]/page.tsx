'use client';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import type { Product } from '@/app/types';
import ProductForm from '../ProductForm';

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'toolhome_products', id));
        if (!snap.exists()) {
          setProduct(null);
          return;
        }
        setProduct({ id: snap.id, ...snap.data() } as Product);
      } catch (err) {
        console.error('[edit-product] load failed:', err);
        setProduct(null);
      }
    })();
  }, [id]);

  if (product === undefined) {
    return <p className="text-slate-500">Loading…</p>;
  }
  if (product === null) {
    return (
      <div>
        <p className="text-red-600 mb-4">Product not found.</p>
        <Link
          href="/admin/products"
          className="text-sm text-slate-600 hover:text-slate-900 underline"
        >
          ← Back to products
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin/products"
        className="text-xs text-slate-500 hover:text-slate-800 uppercase tracking-wider"
      >
        ← All products
      </Link>
      <h1 className="text-3xl font-black tracking-tight mt-2 mb-6">
        Edit product
      </h1>
      <ProductForm initial={product} />
    </div>
  );
}
