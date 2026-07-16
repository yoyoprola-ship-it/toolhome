// ToolHome types — source of truth para admin + público.

export type FirestoreTimestampish =
  | { seconds: number; nanoseconds: number }
  | { toDate: () => Date; toMillis: () => number }
  | string
  | Date
  | null
  | undefined;

// ─── Product ────────────────────────────────────────────────
// Cada producto tiene DOS precios públicos:
//   - productPrice: costo del producto físico (mailbox, camera, etc.)
//   - installFee:   labor charge por instalarlo
// El customer paga total = productPrice + installFee.
// Además guardamos costPrice (admin-only) para calcular profit.

export interface Product {
  id: string;                            // Firestore doc id
  name: string;
  description: string;
  images: string[];                      // URLs de Storage
  categoryId: string;                    // ref a Category.id

  // Pricing — dos componentes públicos.
  productPrice: number;                  // 🌐 producto físico (USD)
  installFee: number;                    // 🌐 mano de obra install (USD)
  // 🔒 admin only — lo que le cuesta a toolhome adquirir el producto
  costPrice: number;
  // 🔒 admin only — link al supplier para reordenar
  supplierUrl: string;

  active: boolean;
  createdAt?: FirestoreTimestampish;
  updatedAt?: FirestoreTimestampish;

  // Analytics — incrementado por /api/track-view (dedup client-side).
  viewCount?: number;

  // Stock opcional. undefined = on-order (no hold inventory).
  // number ≥ 0 = tenemos ese stock físico.
  stock?: number;
}

export interface Category {
  id: string;
  name: string;                          // "House Numbers", "Mailboxes"
  slug: string;                          // "house-numbers"
  order: number;                         // orden de display
  active: boolean;
  createdAt?: FirestoreTimestampish;
}

// ─── Helpers derivados ───────────────────────────────────────

/** Total que paga el customer — producto + install. */
export function totalPrice(p: Product): number {
  return (
    Math.round(((p.productPrice || 0) + (p.installFee || 0)) * 100) / 100
  );
}

/** Profit por unidad = precio-todo - cost. */
export function profitPerUnit(p: Product): number {
  return Math.round((totalPrice(p) - (p.costPrice || 0)) * 100) / 100;
}

/** Margin sobre el total al público. */
export function marginPercent(p: Product): number {
  const total = totalPrice(p);
  if (!total) return 0;
  return Math.round((profitPerUnit(p) / total) * 100);
}

/** Stock display: 'On order' si no hay número, 'X in stock' si hay. */
export function stockLabel(p: Product): string {
  if (typeof p.stock !== 'number') return 'On order';
  if (p.stock === 0) return 'Out of stock';
  return `${p.stock} in stock`;
}
