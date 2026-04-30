import { Heart, Menu, ShoppingBag, Sparkles } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useCart } from '../store/cart';
import { useWishlist } from '../store/wishlist';
import { SearchBox } from './SearchBox';

export function Header() {
  const cart = useCart();
  const wishlist = useWishlist();
  const count = cart.lines.filter((line) => !line.savedForLater).reduce((sum, line) => sum + line.quantity, 0);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto grid max-w-7xl gap-3 px-4 py-3 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-xl font-black text-ink" aria-label="ShopMind home">
            <span className="grid h-9 w-9 place-items-center rounded bg-tealbrand text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            ShopMind
          </Link>
          <button type="button" className="grid h-10 w-10 place-items-center rounded border border-slate-200 lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
        </div>
        <SearchBox />
        <nav className="flex items-center gap-2 justify-self-end" aria-label="Primary navigation">
          <NavLink to="/products" className="rounded px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Products
          </NavLink>
          <Link to="/products?sort=best_rated" className="rounded px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Best Rated
          </Link>
          <button type="button" className="relative grid h-10 w-10 place-items-center rounded border border-slate-200" aria-label={`${wishlist.ids.length} wishlist items`}>
            <Heart className="h-5 w-5" />
            {wishlist.ids.length > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-coral px-1.5 text-xs font-bold text-white">{wishlist.ids.length}</span>}
          </button>
          <button
            type="button"
            onClick={cart.open}
            className="relative grid h-10 w-10 place-items-center rounded bg-ink text-white"
            aria-label={`${count} items in cart`}
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-coral px-1.5 text-xs font-bold text-white">{count}</span>}
          </button>
        </nav>
      </div>
    </header>
  );
}
