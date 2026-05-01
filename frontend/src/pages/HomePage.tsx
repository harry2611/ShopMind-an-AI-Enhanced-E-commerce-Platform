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
      {/* Hero */}
      <section
        className="relative min-h-[580px] overflow-hidden text-white"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #134e4a 60%, #0f766e 100%)' }}
      >
        {heroSlides.map((item, index) => (
          <motion.img
            key={item.title}
            src={item.image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            initial={false}
            animate={{ opacity: index === slide ? 0.28 : 0, scale: index === slide ? 1 : 1.06 }}
            transition={{ duration: 1 }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/40" />

        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-16 md:py-24 md:grid-cols-[1fr_auto] md:items-center">
          <motion.div
            key={active.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-4 py-1.5 text-sm font-semibold backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-teal-300" />
              ShopMind AI commerce
            </p>
            <h1 className="text-4xl font-black leading-tight md:text-5xl lg:text-6xl">{active.title}</h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-200 md:text-lg">{active.copy}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/products"
                className="rounded-xl bg-white px-6 py-3 font-bold text-ink shadow-lg transition-colors hover:bg-slate-100"
              >
                Shop products
              </Link>
              <Link
                to="/search?q=gifts%20under%20%2450"
                className="rounded-xl border border-white/40 px-6 py-3 font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/10"
              >
                Gift ideas
              </Link>
            </div>
          </motion.div>
          <PromoCountdown />
        </div>

        {/* Slide dots */}
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
          {heroSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === slide ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Category grid */}
        <section
          className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
          aria-label="Shop by category"
        >
          {categories.map(({ name, icon: Icon }) => (
            <Link
              key={name}
              to={`/products?category=${encodeURIComponent(name)}`}
              className="group flex flex-col items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 text-center font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-tealbrand hover:shadow-md"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 text-tealbrand transition-all duration-200 group-hover:from-tealbrand group-hover:to-teal-500 group-hover:text-white">
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-xs leading-tight">{name}</span>
            </Link>
          ))}
        </section>

        <ProductCarousel
          title="Recommended for you"
          subtitle="Updated from viewed products, searches, categories, and cart actions."
          products={recommended.length ? recommended : personal.data}
        />

        <section className="py-8">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-ink">Trending now</h2>
              <p className="mt-1 text-sm text-slate-500">Popular picks across ShopMind.</p>
            </div>
            <Link to="/products?sort=best_rated" className="text-sm font-bold text-tealbrand hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(trending.data ?? []).slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        {/* Feature banners */}
        <section className="grid gap-4 py-6 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl bg-coral p-6 text-white">
            <div className="absolute bottom-0 right-0 opacity-10">
              <ShoppingBasket className="h-32 w-32" />
            </div>
            <h2 className="text-xl font-black">Bundle smarter</h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/90">
              Cart recommendations surface frequently-bought-together items and free-shipping gap fillers.
            </p>
            <Link
              to="/products"
              className="mt-4 inline-flex rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/30"
            >
              Explore bundles
            </Link>
          </div>
          <div
            className="relative overflow-hidden rounded-2xl p-6 text-white"
            style={{ background: 'linear-gradient(135deg, #0f766e, #0d9488)' }}
          >
            <div className="absolute bottom-0 right-0 opacity-10">
              <Sparkles className="h-32 w-32" />
            </div>
            <h2 className="text-xl font-black">Voice and AI search</h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/90">
              Try &quot;laptop for video editing under $1500&quot; or &quot;gifts for my mom who loves yoga&quot; and ShopMind understands.
            </p>
            <Link
              to="/search"
              className="mt-4 inline-flex rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/30"
            >
              Try it now
            </Link>
          </div>
        </section>

        {recentlyViewed.length > 0 && (
          <ProductCarousel
            title="Recently viewed"
            subtitle="Back to browsing, right where you left off."
            products={recentlyViewed}
          />
        )}
      </div>
    </div>
  );
}
