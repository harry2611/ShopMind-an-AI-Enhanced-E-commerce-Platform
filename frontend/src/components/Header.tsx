import { Heart, Menu, Package, ShoppingBag, Sparkles, User, X } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../store/cart';
import { useWishlist } from '../store/wishlist';
import { SearchBox } from './SearchBox';

export function Header() {
  const cart = useCart();
  const wishlist = useWishlist();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const count = cart.lines.filter((line) => !line.savedForLater).reduce((sum, line) => sum + line.quantity, 0);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          {/* Logo */}
          <Link to="/" className="inline-flex items-center gap-2 text-xl font-black text-ink flex-shrink-0" aria-label="ShopMind home">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-tealbrand to-teal-500 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="hidden sm:inline">ShopMind</span>
          </Link>

          {/* Search — grows to fill space */}
          <div className="flex-1 mx-2">
            <SearchBox />
          </div>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Primary navigation">
            <NavLink
              to="/products"
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${isActive ? 'bg-teal-50 text-tealbrand' : 'text-slate-600 hover:bg-slate-100 hover:text-ink'}`
              }
            >
              Products
            </NavLink>
            {user ? (
              <>
                <Link
                  to="/orders"
                  className="rounded-lg px-2 py-2 text-slate-600 hover:bg-slate-100 hover:text-ink transition-colors"
                  aria-label="My orders"
                  title="My orders"
                >
                  <Package className="h-5 w-5" />
                </Link>
                <Link
                  to="/profile"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-ink transition-colors"
                >
                  <User className="h-4 w-4" />
                  {user.full_name ? user.full_name.split(' ')[0] : 'Account'}
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                  Sign in
                </Link>
                <Link to="/register" className="rounded-lg bg-tealbrand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition-colors shadow-sm">
                  Register
                </Link>
              </>
            )}
          </nav>

          {/* Icon buttons */}
          <div className="flex items-center gap-1.5">
            <Link
              to="/wishlist"
              className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:border-tealbrand hover:text-tealbrand transition-colors"
              aria-label={`${wishlist.ids.length} wishlist items`}
            >
              <Heart className="h-5 w-5" />
              {wishlist.ids.length > 0 && (
                <span className="absolute -right-1 -top-1 rounded-full bg-coral px-1.5 py-0.5 text-xs font-bold text-white leading-none">
                  {wishlist.ids.length}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={cart.open}
              className="relative grid h-10 w-10 place-items-center rounded-xl bg-ink text-white hover:bg-slate-700 transition-colors shadow-sm"
              aria-label={`${count} items in cart`}
            >
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 rounded-full bg-coral px-1.5 py-0.5 text-xs font-bold text-white leading-none">
                  {count}
                </span>
              )}
            </button>

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 lg:hidden"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeMobile} />
          {/* Drawer */}
          <nav className="absolute right-0 top-0 h-full w-72 bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <span className="text-lg font-black text-ink">Menu</span>
              <button onClick={closeMobile} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-1 p-4 flex-1 overflow-y-auto">
              <MobileLink to="/" onClick={closeMobile}>Home</MobileLink>
              <MobileLink to="/products" onClick={closeMobile}>Products</MobileLink>
              {user ? (
                <>
                  <MobileLink to="/orders" onClick={closeMobile}>My Orders</MobileLink>
                  <MobileLink to="/profile" onClick={closeMobile}>Profile</MobileLink>
                  <div className="my-3 border-t border-slate-100" />
                  <button
                    onClick={() => { logout(); closeMobile(); navigate('/'); }}
                    className="rounded-lg px-4 py-3 text-left text-sm font-semibold text-coral hover:bg-rose-50 transition-colors"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <div className="my-3 border-t border-slate-100" />
                  <Link
                    to="/login"
                    onClick={closeMobile}
                    className="rounded-lg border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-ink hover:bg-slate-50 transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    onClick={closeMobile}
                    className="rounded-lg bg-tealbrand px-4 py-3 text-center text-sm font-semibold text-white hover:bg-teal-700 transition-colors"
                  >
                    Create account
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

function MobileLink({ to, onClick, children }: { to: string; onClick: () => void; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${isActive ? 'bg-teal-50 text-tealbrand' : 'text-slate-700 hover:bg-slate-50'}`
      }
    >
      {children}
    </NavLink>
  );
}
