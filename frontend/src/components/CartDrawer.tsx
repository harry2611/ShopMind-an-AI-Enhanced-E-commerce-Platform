import { PackageCheck, Tag, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useCart } from '../store/cart';
import { currency, deliveryDate } from '../utils/format';
import { LazyImage } from './LazyImage';

export function CartDrawer() {
  const cart = useCart();
  const [promo, setPromo] = useState('');
  const activeIds = cart.lines.filter((line) => !line.savedForLater).map((line) => line.product.id);
  const bundle = useQuery({
    queryKey: ['bundle', activeIds.join(',')],
    queryFn: () => api.bundle(activeIds),
    enabled: cart.isOpen && activeIds.length > 0
  });
  const subtotal = cart.subtotal();
  const discount = promo.toUpperCase() === 'AISMART10' ? subtotal * 0.1 : 0;
  const shippingGap = Math.max(0, 75 - subtotal);
  const total = Math.max(0, subtotal - discount) + (shippingGap === 0 || subtotal === 0 ? 0 : 6.99);
  const alert = useMemo(() => cart.lines.find((line) => line.savedForLater || line.product.price < 60), [cart.lines]);

  if (!cart.isOpen) return null;

  return (
    <aside className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <button className="absolute inset-0 bg-ink/40" type="button" aria-label="Close cart" onClick={cart.close} />
      <div className="absolute right-0 top-0 grid h-full w-full max-w-md grid-rows-[auto_1fr_auto] bg-white shadow-panel">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <h2 className="text-xl font-bold">Smart cart</h2>
          <button type="button" onClick={cart.close} aria-label="Close cart" className="grid h-10 w-10 place-items-center rounded border border-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-auto p-4">
          {shippingGap > 0 && subtotal > 0 ? (
            <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm font-medium text-teal-900">
              Add {currency.format(shippingGap)} more for free shipping.
            </div>
          ) : subtotal > 0 ? (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm font-medium text-teal-900">
              <PackageCheck className="h-4 w-4" /> Free shipping unlocked.
            </div>
          ) : null}

          <div className="grid gap-3">
            {cart.lines.map((line) => (
              <article key={`${line.product.id}-${line.savedForLater}`} className="grid grid-cols-[76px_1fr] gap-3 rounded-lg border border-slate-200 p-3">
                <LazyImage src={line.product.images[0]} alt={line.product.name} className="h-20 w-20 rounded" />
                <div className="grid gap-2">
                  <div className="flex justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{line.product.name}</h3>
                      <p className="text-sm text-slate-600">{currency.format(line.product.price)}</p>
                    </div>
                    <button type="button" aria-label={`Remove ${line.product.name}`} onClick={() => cart.remove(line.product.id)} className="h-8 w-8 rounded text-slate-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <input
                      aria-label={`Quantity for ${line.product.name}`}
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(event) => cart.updateQuantity(line.product.id, Number(event.target.value))}
                      className="h-9 w-16 rounded border border-slate-300 px-2"
                    />
                    <button
                      type="button"
                      onClick={() => cart.saveForLater(line.product.id, !line.savedForLater)}
                      className="text-sm font-semibold text-tealbrand"
                    >
                      {line.savedForLater ? 'Move to cart' : 'Save for later'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {cart.lines.length === 0 && <p className="rounded-lg bg-slate-100 p-4 text-slate-600">Your cart is ready for a good idea.</p>}
          </div>

          {alert && (
            <div className="mt-4 rounded-lg border border-coral/30 bg-red-50 p-3 text-sm text-red-900">
              Price drop alert: {alert.product.name} is a strong value right now.
            </div>
          )}

          {bundle.data?.length ? (
            <div className="mt-5">
              <h3 className="mb-3 font-bold">Customers also got</h3>
              <div className="grid gap-2">
                {bundle.data.slice(0, 2).map((product) => (
                  <button key={product.id} type="button" onClick={() => cart.add(product)} className="flex items-center gap-3 rounded border border-slate-200 p-2 text-left hover:bg-slate-50">
                    <LazyImage src={product.images[0]} alt={product.name} className="h-14 w-14 rounded" />
                    <span className="flex-1 text-sm font-semibold">{product.name}</span>
                    <span className="text-sm">{currency.format(product.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className="border-t border-slate-200 p-4">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold" htmlFor="promo-code">
            <Tag className="h-4 w-4" /> Promo code
          </label>
          <input
            id="promo-code"
            value={promo}
            onChange={(event) => setPromo(event.target.value)}
            placeholder="AISMART10"
            className="mb-3 h-11 w-full rounded border border-slate-300 px-3"
          />
          {promo && (
            <p className={`mb-3 text-sm font-medium ${discount ? 'text-tealbrand' : 'text-coral'}`}>
              {discount ? 'AI validation accepted: 10% off.' : 'AI validation did not find an active offer.'}
            </p>
          )}
          <div className="grid gap-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{currency.format(subtotal)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>-{currency.format(discount)}</span></div>
            <div className="flex justify-between"><span>Estimated delivery</span><span>{deliveryDate()}</span></div>
            <div className="mt-2 flex justify-between text-lg font-bold"><span>Total</span><span>{currency.format(total)}</span></div>
          </div>
          <button type="button" className="mt-4 h-12 w-full rounded bg-ink font-bold text-white">Checkout</button>
        </div>
      </div>
    </aside>
  );
}
