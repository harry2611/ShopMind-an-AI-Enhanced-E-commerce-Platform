import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../store/cart';
import type { Product } from '../types/shop';
import { currency } from '../utils/format';
import { LazyImage } from './LazyImage';

export function QuickViewModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const cart = useCart();

  useEffect(() => {
    if (!product) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, product]);

  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" role="dialog" aria-modal="true">
      <div className="grid max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white shadow-panel md:grid-cols-2">
        <div className="aspect-square bg-slate-100">
          <LazyImage src={product.images[0]} alt={product.name} className="h-full w-full" />
        </div>
        <div className="grid gap-4 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-tealbrand">{product.brand}</p>
              <h2 className="text-2xl font-bold text-ink">{product.name}</h2>
            </div>
            <button
              ref={closeRef}
              type="button"
              aria-label="Close quick view"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-full border border-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-slate-600">{product.description}</p>
          <strong className="text-2xl">{currency.format(product.price)}</strong>
          <div className="flex flex-wrap gap-2">
            {product.tags.map((tag) => (
              <span key={tag} className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                {tag}
              </span>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => cart.add(product)}
              className="rounded bg-tealbrand px-4 py-3 font-semibold text-white"
            >
              Add to cart
            </button>
            <Link to={`/products/${product.id}`} className="rounded border border-slate-300 px-4 py-3 font-semibold">
              Full details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
