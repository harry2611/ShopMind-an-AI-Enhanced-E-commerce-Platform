import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { QuickViewModal } from '../components/QuickViewModal';
import { Skeleton } from '../components/Skeleton';
import { api } from '../services/api';
import type { Product } from '../types/shop';
import { useWishlist } from '../store/wishlist';

export function WishlistPage() {
  const wishlist = useWishlist();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickView, setQuickView] = useState<Product | null>(null);

  useEffect(() => {
    if (wishlist.ids.length === 0) {
      setLoading(false);
      setProducts([]);
      return;
    }

    setLoading(true);
    Promise.all(wishlist.ids.map((id) => api.product(id).catch(() => null)))
      .then((results) => {
        setProducts(results.filter(Boolean) as Product[]);
      })
      .finally(() => setLoading(false));
  }, [wishlist.ids.join(',')]);

  const handleClearAll = () => {
    products.forEach((p) => wishlist.toggle(p.id));
  };

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-10">
        {/* Page header */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-rose-50">
              <Heart className="h-5 w-5 fill-coral text-coral" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-ink">My Wishlist</h1>
              <p className="text-sm text-slate-500">
                {wishlist.ids.length === 0
                  ? 'No saved items yet'
                  : `${wishlist.ids.length} saved item${wishlist.ids.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          {wishlist.ids.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-coral"
            >
              <Trash2 className="h-4 w-4" />
              Clear all
            </button>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: Math.max(wishlist.ids.length, 4) }).map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && wishlist.ids.length === 0 && (
          <div className="flex flex-col items-center gap-6 py-24 text-center">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-slate-100">
              <Heart className="h-10 w-10 text-slate-300" />
            </div>
            <div>
              <p className="mb-2 text-xl font-semibold text-ink">Nothing saved yet</p>
              <p className="text-slate-500">
                Tap the heart icon on any product to save it here for later.
              </p>
            </div>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 rounded-xl bg-tealbrand px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700"
            >
              <ShoppingBag className="h-4 w-4" />
              Browse products
            </Link>
          </div>
        )}

        {/* Products grid */}
        {!loading && products.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onQuickView={setQuickView}
              />
            ))}
          </div>
        )}
      </div>

      {quickView && (
        <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />
      )}
    </>
  );
}
