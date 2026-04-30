import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Package, ShoppingBag, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function ProfilePage() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="mx-auto max-w-lg px-4 py-16 text-center text-slate-400">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-sm px-4 py-20 text-center">
        <User className="mx-auto mb-4 h-12 w-12 text-slate-300" />
        <p className="mb-6 text-slate-500">Sign in to view your profile and orders.</p>
        <div className="flex flex-col gap-3">
          <Link to="/login" className="rounded bg-tealbrand py-2.5 font-semibold text-white text-center">
            Sign in
          </Link>
          <Link to="/register" className="rounded border border-slate-300 py-2.5 font-semibold text-ink text-center">
            Create account
          </Link>
        </div>
      </div>
    );
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-8 flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-tealbrand text-white">
          <User className="h-7 w-7" />
        </div>
        <div>
          <p className="font-bold text-ink">{user.full_name || 'Shopper'}</p>
          <p className="text-sm text-slate-500">{user.email}</p>
        </div>
      </div>

      <nav className="grid gap-2">
        <Link
          to="/orders"
          className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
        >
          <Package className="h-5 w-5 text-slate-400" />
          <span className="font-medium text-ink">My Orders</span>
        </Link>

        <Link
          to="/products"
          className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
        >
          <ShoppingBag className="h-5 w-5 text-slate-400" />
          <span className="font-medium text-ink">Browse Products</span>
        </Link>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 text-left hover:bg-slate-50"
        >
          <LogOut className="h-5 w-5 text-slate-400" />
          <span className="font-medium text-ink">Sign out</span>
        </button>
      </nav>

      <p className="mt-8 text-center text-xs text-slate-400">
        Member since {new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
      </p>
    </div>
  );
}
