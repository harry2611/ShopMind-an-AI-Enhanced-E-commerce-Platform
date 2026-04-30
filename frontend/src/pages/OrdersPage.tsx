import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { OrderOut } from '../types/auth';
import { getSessionId } from '../services/session';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  shipped: 'bg-blue-100 text-blue-800',
  delivered: 'bg-teal-100 text-teal-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-slate-100 text-slate-600',
};

export function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    const token = localStorage.getItem('access_token');
    const url = user
      ? `${API_URL}/orders/my`
      : `${API_URL}/orders/session/${getSessionId()}`;

    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.json())
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setError('Could not load orders.'))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-slate-400">Loading orders…</div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold text-ink">My Orders</h1>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="rounded-lg border border-slate-200 py-16 text-center">
          <Package className="mx-auto mb-4 h-10 w-10 text-slate-300" />
          <p className="mb-6 text-slate-500">No orders yet.</p>
          <Link to="/products" className="rounded bg-tealbrand px-6 py-2.5 font-semibold text-white">
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4">
          {orders.map((order) => (
            <li key={order.id} className="rounded-lg border border-slate-200 p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs text-slate-400">#{order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {new Date(order.created_at).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[order.status] ?? ''}`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>

              <ul className="mb-4 grid gap-2">
                {order.lines.map((line) => (
                  <li key={line.id} className="flex items-center gap-3 text-sm">
                    {line.product_image && (
                      <img src={line.product_image} alt={line.product_name} className="h-10 w-10 rounded object-cover" />
                    )}
                    <span className="flex-1 text-ink">{line.product_name}</span>
                    <span className="text-slate-500">×{line.quantity}</span>
                    <span className="font-medium">${(line.product_price * line.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-sm text-slate-500">Total</span>
                <span className="font-bold text-ink">${Number(order.total_amount).toFixed(2)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
