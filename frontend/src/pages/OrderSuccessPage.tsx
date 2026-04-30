import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { useCart } from '../store/cart';

export function OrderSuccessPage() {
  const [params] = useSearchParams();
  const { lines, remove } = useCart();
  const orderId = params.get('order_id');
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    if (!cleared) {
      // Clear active cart items (not saved-for-later)
      lines
        .filter((l) => !l.savedForLater)
        .forEach((l) => remove(l.product.id));
      setCleared(true);
    }
  }, [cleared, lines, remove]);

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="mb-6 flex justify-center">
        <CheckCircle className="h-16 w-16 text-green-500" />
      </div>
      <h1 className="mb-3 text-2xl font-bold text-ink">Order confirmed!</h1>
      <p className="mb-2 text-slate-500">
        Thank you for your purchase. You&apos;ll receive a confirmation email shortly.
      </p>
      {orderId && (
        <p className="mb-8 text-sm text-slate-400">
          Order ID: <span className="font-mono">{orderId}</span>
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          to="/orders"
          className="rounded bg-tealbrand px-6 py-2.5 font-semibold text-white hover:bg-teal-700"
        >
          View my orders
        </Link>
        <Link
          to="/products"
          className="rounded border border-slate-300 px-6 py-2.5 font-semibold text-ink hover:bg-slate-50"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
