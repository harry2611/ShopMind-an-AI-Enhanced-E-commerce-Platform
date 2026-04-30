import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Baby,
  Dumbbell,
  Gamepad2,
  Laptop,
  Martini,
  Mountain,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sofa,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setRecommended } from '../store/personalizationSlice';
import { ProductCarousel } from '../components/ProductCarousel';
import { ProductCard } from '../components/ProductCard';
import { useEffect, useState } from 'react';

const categories = [
  { name: 'Electronics', icon: Laptop },
  { name: 'Gaming', icon: Gamepad2 },
  { name: 'Style', icon: Shirt },
  { name: 'Home', icon: Sofa },
  { name: 'Kitchen', icon: Martini },
  { name: 'Wellness', icon: Dumbbell },
  { name: 'Mobile', icon: Smartphone },
  { name: 'Beauty', icon: Sparkles },
  { name: 'Outdoors', icon: Mountain },
  { name: 'Baby', icon: Baby },
  { name: 'Gifts', icon: ShoppingBasket }
];

const heroSlides = [
  {
    title: 'AI-curated shopping that listens',
    copy: 'Search naturally, compare quickly, and let ShopMind shape the shelf around your session.',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80'
  },
  {
    title: 'Find the right product faster',
    copy: 'From video editing laptops to gifts under budget, semantic search turns intent into options.',
    image: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=1600&q=80'
  },
  {
    title: 'Personalized picks as you browse',
    copy: 'Recommendations update with viewed products, searched categories, and cart activity.',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1600&q=80'
  }
];

function PromoCountdown() {
  const [seconds, setSeconds] = useState(7200);
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return (
    <div className="rounded-lg bg-ink px-4 py-3 text-white">
      <p className="text-sm font-semibold text-teal-100">Flash AI bundle event</p>
      <p className="text-2xl font-black tabular-nums">
        {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </p>
    </div>
  );
}

export function HomePage() {
  const [slide, setSlide] = useState(0);
  const dispatch = useAppDispatch();
  const events = useAppSelector((state) => state.personalization.events);
  const recommended = useAppSelector((state) => state.personalization.recommended);
  const recentlyViewed = useAppSelector((state) => state.personalization.recentlyViewed);
  const trending = useQuery({ queryKey: ['trending'], queryFn: api.trending });
  const personal = useQuery({
    queryKey: ['personal', events.length],
    queryFn: () => api.personalRecommendations(events),
    staleTime: 15_000
  });

  useEffect(() => {
    const timer = window.setInterval(() => setSlide((value) => (value + 1) % heroSlides.length), 4500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (personal.data) dispatch(setRecommended(personal.data));
  }, [dispatch, personal.data]);

  const active = heroSlides[slide];

  return (
    <div className="bg-mist">
      <section className="relative min-h-[540px] overflow-hidden bg-ink text-white">
        {heroSlides.map((item, index) => (
          <motion.img
            key={item.title}
            src={item.image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            initial={false}
            animate={{ opacity: index === slide ? 0.42 : 0, scale: index === slide ? 1 : 1.04 }}
            transition={{ duration: 0.8 }}
          />
        ))}
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-20 md:grid-cols-[1fr_auto] md:items-end">
          <motion.div key={active.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <p className="mb-4 inline-flex rounded bg-white/15 px-3 py-1 text-sm font-bold backdrop-blur">ShopMind AI commerce</p>
            <h1 className="text-4xl font-black leading-tight md:text-6xl">{active.title}</h1>
            <p className="mt-5 max-w-2xl text-lg text-slate-100">{active.copy}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/products" className="rounded bg-white px-5 py-3 font-bold text-ink">Shop products</Link>
              <Link to="/search?q=gifts%20under%20%2450" className="rounded border border-white/60 px-5 py-3 font-bold text-white">Ask for gift ideas</Link>
            </div>
          </motion.div>
          <PromoCountdown />
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <section className="grid gap-3 py-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6" aria-label="Shop by category">
          {categories.map(({ name, icon: Icon }) => (
            <Link
              key={name}
              to={`/products?category=${encodeURIComponent(name)}`}
              className="flex min-h-24 items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 font-bold text-ink hover:border-tealbrand"
            >
              <span className="grid h-11 w-11 place-items-center rounded bg-teal-50 text-tealbrand">
                <Icon className="h-5 w-5" />
              </span>
              {name}
            </Link>
          ))}
        </section>

        <ProductCarousel
          title="Recommended for you"
          subtitle="Updated from viewed products, searches, categories, and cart actions."
          products={recommended.length ? recommended : personal.data}
        />

        <section className="py-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-ink">Trending products</h2>
              <p className="mt-1 text-sm text-slate-600">Popular right now across ShopMind.</p>
            </div>
            <Link to="/products?sort=best_rated" className="font-bold text-tealbrand">View all</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(trending.data ?? []).slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        <section className="grid gap-4 py-6 md:grid-cols-2">
          <div className="rounded-lg bg-coral p-6 text-white">
            <h2 className="text-2xl font-black">Bundle smarter</h2>
            <p className="mt-2 max-w-lg">Cart recommendations look for frequently bought together items and free-shipping gaps.</p>
          </div>
          <div className="rounded-lg bg-tealbrand p-6 text-white">
            <h2 className="text-2xl font-black">Voice search ready</h2>
            <p className="mt-2 max-w-lg">Use natural language like “laptop for video editing” or “red shoes under $50”.</p>
          </div>
        </section>

        {recentlyViewed.length > 0 && (
          <ProductCarousel title="Recently viewed" subtitle="Back to browsing, right where you left off." products={recentlyViewed} />
        )}
      </div>
    </div>
  );
}
