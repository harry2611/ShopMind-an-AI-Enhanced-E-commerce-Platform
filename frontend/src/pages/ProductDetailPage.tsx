import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle, ShoppingCart, Star, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LazyImage } from '../components/LazyImage';
import { ProductCarousel } from '../components/ProductCarousel';
import { api } from '../services/api';
import { useCart } from '../store/cart';
import { useAppDispatch } from '../store/hooks';
import { trackLocalEvent, viewedProduct } from '../store/personalizationSlice';
import { currency } from '../utils/format';

export function ProductDetailPage() {
  const { id = '' } = useParams();
  const cart = useCart();
  const dispatch = useAppDispatch();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [added, setAdded] = useState(false);
  const product = useQuery({ queryKey: ['product', id], queryFn: () => api.product(id), enabled: Boolean(id) });
  const similar = useQuery({ queryKey: ['similar', id], queryFn: () => api.similar(id), enabled: Boolean(id) });
  const bundle = useQuery({ queryKey: ['bundle', id], queryFn: () => api.bundle([id]), enabled: Boolean(id) });
  const reviews = useQuery({ queryKey: ['reviews', id], queryFn: () => api.reviews(id), enabled: Boolean(id) });
  const summary = useQuery({ queryKey: ['review-summary', id], queryFn: () => api.reviewSummary(id), enabled: Boolean(id) });
  const qa = useQuery({ queryKey: ['qa', id], queryFn: () => api.qa(id), enabled: Boolean(id) });

  useEffect(() => {
    if (!product.data) return;
    dispatch(viewedProduct(product.data));
    dispatch(trackLocalEvent({ event_type: 'view', product_id: product.data.id, metadata: { category: product.data.category } }));
    api.track({ event_type: 'view', product_id: product.data.id, metadata: { category: product.data.category } }).catch(() => undefined);
    setSelectedColor(product.data.colors[0] ?? '');
    setSelectedSize(product.data.sizes[0] ?? '');
  }, [dispatch, product.data]);

  const stockLabel = useMemo(() => {
    if (!product.data) return '';
    if (product.data.stock > 12) return 'In stock and ready to ship';
    if (product.data.stock > 0) return `Only ${product.data.stock} left`;
    return 'Out of stock';
  }, [product.data]);

  if (product.isLoading) return <div className="mx-auto max-w-7xl px-4 py-16">Loading product...</div>;
  if (!product.data) return <div className="mx-auto max-w-7xl px-4 py-16">Product not found.</div>;

  function addToCart() {
    if (!product.data) return;
    cart.add(product.data);
    dispatch(trackLocalEvent({ event_type: 'cart_add', product_id: product.data.id }));
    api.track({ event_type: 'cart_add', product_id: product.data.id }).catch(() => undefined);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <section aria-label="Product images" className="grid gap-3">
          <div className="overflow-hidden rounded-lg bg-slate-100">
            <LazyImage
              src={product.data.images[selectedImage]}
              alt={product.data.name}
              className="aspect-square h-full w-full transition duration-300 hover:scale-125"
            />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {product.data.images.map((image, index) => (
              <button
                key={image}
                type="button"
                onClick={() => setSelectedImage(index)}
                className={`overflow-hidden rounded border ${selectedImage === index ? 'border-tealbrand' : 'border-slate-200'}`}
                aria-label={`Show image ${index + 1}`}
              >
                <LazyImage src={image} alt="" className="aspect-square h-full w-full" />
              </button>
            ))}
          </div>
        </section>

        <section className="grid h-max gap-5">
          <div>
            <p className="font-bold text-tealbrand">{product.data.brand}</p>
            <h1 className="mt-1 text-4xl font-black text-ink">{product.data.name}</h1>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex items-center gap-1 font-bold">
                <Star className="h-5 w-5 fill-saffron text-saffron" /> {product.data.rating.toFixed(1)}
              </span>
              <span className="text-slate-500">{reviews.data?.length ?? 0} reviews</span>
            </div>
          </div>
          <p className="text-lg text-slate-700">{product.data.description}</p>
          <strong className="text-3xl">{currency.format(product.data.price)}</strong>
          <p className={`flex items-center gap-2 font-semibold ${product.data.stock > 0 ? 'text-tealbrand' : 'text-coral'}`}>
            <CheckCircle className="h-5 w-5" /> {stockLabel}
          </p>

          {product.data.colors.length > 0 && (
            <fieldset>
              <legend className="mb-2 font-bold">Color</legend>
              <div className="flex flex-wrap gap-2">
                {product.data.colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`rounded border px-3 py-2 font-semibold ${selectedColor === color ? 'border-tealbrand bg-teal-50' : 'border-slate-300'}`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {product.data.sizes.length > 0 && (
            <fieldset>
              <legend className="mb-2 font-bold">Size</legend>
              <div className="flex flex-wrap gap-2">
                {product.data.sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`rounded border px-3 py-2 font-semibold ${selectedSize === size ? 'border-tealbrand bg-teal-50' : 'border-slate-300'}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="flex flex-wrap gap-3">
            <motion.button
              type="button"
              onClick={addToCart}
              disabled={product.data.stock === 0}
              animate={added ? { scale: [1, 1.04, 1] } : {}}
              className="inline-flex h-12 items-center gap-2 rounded bg-tealbrand px-5 font-bold text-white disabled:bg-slate-300"
            >
              <ShoppingCart className="h-5 w-5" /> {added ? 'Added' : 'Add to cart'}
            </motion.button>
            <button type="button" onClick={addToCart} className="inline-flex h-12 items-center gap-2 rounded bg-ink px-5 font-bold text-white">
              <Zap className="h-5 w-5" /> Buy now
            </button>
          </div>
        </section>
      </div>

      <ProductCarousel title="Complete the Look" products={similar.data?.slice(0, 5)} />
      <ProductCarousel title="Frequently Bought Together" products={bundle.data} />
      <ProductCarousel title="Similar Products" products={similar.data} />
      <ProductCarousel title="Customers Also Viewed" products={bundle.data?.slice().reverse()} />

      <section className="grid gap-6 py-8 lg:grid-cols-[1fr_360px]">
        <div>
          <h2 className="mb-4 text-2xl font-bold">Reviews</h2>
          <div className="grid gap-3">
            {(reviews.data ?? []).map((review) => (
              <article key={review.id} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-2 flex items-center gap-2 font-bold">
                  {review.rating} <Star className="h-4 w-4 fill-saffron text-saffron" /> <span className="text-slate-500">{review.user_id}</span>
                </div>
                <p className="text-slate-700">{review.content}</p>
              </article>
            ))}
          </div>
        </div>
        <aside className="grid h-max gap-4 rounded-lg border border-slate-200 p-4">
          <h2 className="text-xl font-bold">AI sentiment summary</h2>
          <p className="text-slate-700">{summary.data?.summary}</p>
          <div>
            <h3 className="font-bold text-tealbrand">Positive themes</h3>
            <ul className="mt-2 grid gap-1 text-sm text-slate-700">
              {summary.data?.positive_themes.map((theme) => <li key={theme}>{theme}</li>)}
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-coral">Negative themes</h3>
            <ul className="mt-2 grid gap-1 text-sm text-slate-700">
              {summary.data?.negative_themes.map((theme) => <li key={theme}>{theme}</li>)}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 font-bold">Q&A</h3>
            <div className="grid gap-2">
              {qa.data?.map((item) => (
                <details key={item.question} className="rounded border border-slate-200 p-3">
                  <summary className="cursor-pointer font-semibold">{item.question}</summary>
                  <p className="mt-2 text-sm text-slate-600">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
