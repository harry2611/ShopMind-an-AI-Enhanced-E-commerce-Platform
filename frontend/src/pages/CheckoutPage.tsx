import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../store/cart';
import { getSessionId } from '../services/session';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export function CheckoutPage() {
  const { lines, subtotal, discount, finalTotal, promoCode, discountRate } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(user?.email ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cartItems = lines.filter((l) => !l.savedForLater);
  const sub = subtotal();
  const disc = discount();
  const total = finalTotal();
  const shippingFree = sub >= 75;

  if (cartItems.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="mb-4 text-lg text-slate-500">Your cart is empty.</p>
        <button onClick={() => navigate('/products')} className="rounded-xl bg-tealbrand px-6 py-2.5 font-semibold text-white hover:bg-teal-700">
          Shop now
        </button>
      </div>
    );
  }

  async function handleCheckout(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/orders/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          session_id: getSessionId(),
          customer_email: email || undefined,
          discount_amount: disc,
          promo_code: promoCode || undefined,
          items: cartItems.map((l) => ({
            product_id: l.product.id,
            product_name: l.product.name,
            product_price: l.product.price,
            product_image: l.product.images[0] ?? null,
            quantity: l.quantity,
          })),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? 'Checkout failed');
      }

      const { checkout_url } = await res.json();
      window.location.href = checkout_url;
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl gap-8 px-4 py-10 lg:grid lg:grid-cols-[1fr_380px]">
      <div>
        <h1 className="mb-6 text-2xl font-bold text-ink">Checkout</h1>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleCheckout} className="grid gap-6">
          <section className="rounded-xl border border-slate-200 p-6">
            <h2 className="mb-4 font-semibold text-ink">Contact information</h2>
            <label htmlFor="co-email" className="mb-1 block text-sm font-medium text-ink">
              Email for order confirmation
            </label>
            <input
              id="co-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-tealbrand focus:outline-none focus:ring-1 focus:ring-tealbrand"
            />
          </section>

          <section className="rounded-xl border border-slate-200 p-6">
            <h2 className="mb-4 font-semibold text-ink">Order items</h2>
            <ul className="grid gap-3">
              {cartItems.map((line) => (
                <li key={line.product.id} className="flex items-center gap-4">
                  {line.product.images[0] && (
                    <img
                      src={line.product.images[0]}
                      alt={line.product.name}
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{line.product.name}</p>
                    <p className="text-sm text-slate-500">Qty: {line.quantity}</p>
                  </div>
                  <p className="font-semibold text-ink">
                    ${(line.product.price * line.quantity).toFixed(2)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-tealbrand text-base font-semibold text-white transition-colors hover:bg-teal-700 disabled:bg-slate-300"
          >
            {loading ? 'Redirecting to payment...' : `Pay $${total.toFixed(2)}`}
          </button>
          <p className="text-center text-xs text-slate-400">
            Payments are processed securely by Stripe. ShopMind never stores your card details.
          </p>
        </form>
      </div>

      {/* Order summary sidebar */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 rounded-xl border border-slate-200 p-6">
          <h2 className="mb-4 font-semibold text-ink">Order summary</h2>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Subtotal</dt>
              <dd className="font-medium">${sub.toFixed(2)}</dd>
            </div>
            {disc > 0 && (
              <div className="flex justify-between text-tealbrand">
                <dt className="flex items-center gap-1">
                  Promo ({promoCode}) -{Math.round(discountRate * 100)}%
                </dt>
                <dd className="font-medium">-${disc.toFixed(2)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-500">Shipping</dt>
              <dd className={`font-medium ${shippingFree ? 'text-tealbrand' : 'text-slate-700'}`}>
                {shippingFree ? 'Free' : '$6.99'}
              </dd>
            </div>
            <div className="my-2 border-t border-slate-200" />
            <div className="flex justify-between text-base font-bold text-ink">
              <dt>Total</dt>
              <dd>${total.toFixed(2)}</dd>
            </div>
          </dl>
        </div>
      </aside>
    </div>
  );
}
