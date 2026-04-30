import { Eye, Heart, ShoppingCart, Star } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../store/cart';
import { useWishlist } from '../store/wishlist';
import type { Product } from '../types/shop';
import { currency } from '../utils/format';
import { LazyImage } from './LazyImage';

type Props = {
  product: Product;
  onQuickView?: (product: Product) => void;
  compact?: boolean;
};

export function ProductCard({ product, onQuickView, compact = false }: Props) {
  const [quantity, setQuantity] = useState(1);
  const cart = useCart();
  const wishlist = useWishlist();
  const wished = wishlist.has(product.id);

  return (
    <article className="group grid h-full rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-panel">
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg bg-slate-100">
        <Link to={`/products/${product.id}`} aria-label={`View ${product.name}`}>
          <LazyImage src={product.images[0]} alt={product.name} className="h-full w-full group-hover:scale-105" />
        </Link>
        <div className="absolute left-3 top-3 rounded bg-white/95 px-2 py-1 text-xs font-semibold text-tealbrand">
          {product.category}
        </div>
        <div className="absolute right-2 top-2 flex gap-2">
          <button
            type="button"
            aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
            onClick={() => wishlist.toggle(product.id)}
            className="grid h-9 w-9 place-items-center rounded-full bg-white text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-tealbrand"
          >
            <Heart className={`h-4 w-4 ${wished ? 'fill-coral text-coral' : ''}`} />
          </button>
          {onQuickView && (
            <button
              type="button"
              aria-label={`Quick view ${product.name}`}
              onClick={() => onQuickView(product)}
              className="grid h-9 w-9 place-items-center rounded-full bg-white text-ink opacity-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-tealbrand md:opacity-0 md:group-hover:opacity-100"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="grid gap-3 p-4">
        <div className="grid gap-1">
          <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
            <span>{product.brand}</span>
            <span className="flex items-center gap-1 font-medium text-ink">
              <Star className="h-4 w-4 fill-saffron text-saffron" aria-hidden="true" />
              {product.rating.toFixed(1)}
            </span>
          </div>
          <Link to={`/products/${product.id}`} className="font-semibold text-ink hover:text-tealbrand">
            {product.name}
          </Link>
          {!compact && <p className="line-clamp-2 min-h-10 text-sm text-slate-600">{product.description}</p>}
        </div>
        <div className="flex items-center justify-between gap-3">
          <strong className="text-lg text-ink">{currency.format(product.price)}</strong>
          <span className={`text-xs font-semibold ${product.stock > 8 ? 'text-tealbrand' : 'text-coral'}`}>
            {product.stock > 0 ? `${product.stock} left` : 'Out of stock'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={`qty-${product.id}`}>
            Quantity
          </label>
          <input
            id={`qty-${product.id}`}
            type="number"
            min="1"
            max="9"
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            className="h-10 w-16 rounded border border-slate-300 px-2"
          />
          <button
            type="button"
            disabled={product.stock === 0}
            onClick={() => cart.add(product, quantity)}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded bg-tealbrand px-3 text-sm font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-tealbrand focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            Add
          </button>
        </div>
      </div>
    </article>
  );
}
