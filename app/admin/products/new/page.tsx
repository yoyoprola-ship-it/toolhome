'use client';
import Link from 'next/link';
import ProductForm from '../ProductForm';

export default function NewProductPage() {
  return (
    <div>
      <Link
        href="/admin/products"
        className="text-xs text-slate-500 hover:text-slate-800 uppercase tracking-wider"
      >
        ← All products
      </Link>
      <h1 className="text-3xl font-black tracking-tight mt-2 mb-6">
        New product
      </h1>
      <ProductForm />
    </div>
  );
}
