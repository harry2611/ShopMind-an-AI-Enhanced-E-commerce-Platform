import { Eye, Heart, ShoppingCart, Star } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  return (
    /*
     * Wrapper: relative + group, NO overflow-hidden.
     * Heart/QuickView buttons are absolute children of this wrapper,
     * so they are never clipped by the article's overflow-hidden + rounded corners.
     */
    <div className="group relative h-full">
      {/* ── Heart button ── lives on the wrapper, fully outside any overflow-hidden */}
      <button
        type="button"
        aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
        onClick={() => wishlist.toggle(product.id)}
        className="absolute right-3 top-3 z-30 grid h-9 w-9 place-items-center rounded-full bg-white shadow-md transition-all duration-200 hover:scale-110 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-tealbrand"
      >
        <Heart className={`h-4 w-4 transition-colors duration-200 ${wished ? 'fill-coral text-coral' : 'text-slate-400 hover:text-coral'}`} />
      </button>

      {/* ── Quick view button ── */}
      {onQuickView && (
        <button
          type="button"
          aria-label={`Quick view ${product.name}`}
          onClick={() => onQuickView(product)}
          className="absolute right-3 top-14 z-30 grid h-9 w-9 place-items-center rounded-full bg-white shadow-md opacity-0 transition-all duration-200 hover:scale-110 group-hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-tealbrand"
        >
          <Eye className="h-4 w-4 text-slate-400" />
        </button>
      )}

      {/* ── Article: overflow-hidden for rounded image corners ── */}
      <article className="grid h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-card-hover">

        {/* Image area — click navigates to product */}
        <div
          className="relative aspect-[4/3] cursor-pointer overflow-hidden bg-slate-100"
          onClick={() => navigate(`/products/${product.id}`)}
          role="link"
          aria-label={`View ${product.name}`}
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate(`/products/${product.id}`)}
        >
          <LazyImage
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full transition-transform duration-500 group-hover:scale-105"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          {/* Category badge */}
          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-tealbrand shadow-sm backdrop-blur-sm">
            {product.category}
          </div>
          {/* Out of stock overlay */}
          {product.stock === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
              <span className="rounded-full bg-slate-700 px-4 py-1.5 text-sm font-semibold text-white">Out of stock</span>
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="grid gap-3 p-4">
          <div className="grid gap-1">
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
              <span className="font-medium uppercase tracking-wide">{product.brand}</span>
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <Star className="h-3.5 w-3.5 fill-saffron text-saffron" aria-hidden="true" />
                {product.rating.toFixed(1)}
              </span>
            </div>
            <Link
              to={`/products/${product.id}`}
              className="line-clamp-1 font-semibold text-ink transition-colors hover:text-tealbrand"
            >
              {product.name}
            </Link>
            {!compact && (
              <p className="line-clamp-2 min-h-9 text-xs leading-relaxed text-slate-500">{product.description}</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <strong className="text-lg font-bold text-ink">{currency.format(product.price)}</strong>
            {product.stock > 0 && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${product.stock > 8 ? 'bg-teal-50 text-tealbrand' : 'bg-rose-50 text-coral'}`}>
                {product.stock > 8 ? 'In stock' : `${product.stock} left`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor={`qty-${product.id}`}>Quantity</label>
            <input
              id={`qty-${product.id}`}
              type="number"
              min="1"
              max="9"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="h-10 w-16 rounded-lg border border-slate-200 px-2 text-center text-sm focus:border-tealbrand focus:outline-none focus:ring-1 focus:ring-tealbrand"
            />
            <button
              type="button"
              disabled={product.stock === 0}
              onClick={() => cart.add(product, quantity)}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-tealbrand px-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-teal-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-tealbrand focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              Add to cart
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}
