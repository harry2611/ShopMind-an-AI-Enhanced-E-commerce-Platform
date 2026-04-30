import { useInfiniteQuery } from '@tanstack/react-query';
import { SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { QuickViewModal } from '../components/QuickViewModal';
import { Skeleton } from '../components/Skeleton';
import { api } from '../services/api';
import type { Product, ProductFilters } from '../types/shop';

const categoryOptions = [
  'Electronics',
  'Gaming',
  'Style',
  'Home',
  'Kitchen',
  'Wellness',
  'Mobile',
  'Beauty',
  'Outdoors',
  'Baby',
  'Gifts'
];
const brandOptions = [
  'Auralux',
  'Northstar',
  'Vela',
  'Kanso',
  'Orbit',
  'Luma',
  'Terra',
  'Nova',
  'PixelCraft',
  'Flora',
  'Trailwise',
  'LittleLoom'
];
const sortOptions = [
  ['relevance', 'Relevance'],
  ['price_low', 'Price low to high'],
  ['price_high', 'Price high to low'],
  ['newest', 'Newest first'],
  ['best_rated', 'Best rated']
];

export function ProductListingPage() {
  const [params, setParams] = useSearchParams();
  const [sort, setSort] = useState(params.get('sort') ?? 'relevance');
  const [quickView, setQuickView] = useState<Product | null>(null);
  const [filters, setFilters] = useState<ProductFilters>({
    categories: params.getAll('category'),
    brands: [],
    rating: 1,
    inStock: false,
    minPrice: 0,
    maxPrice: 1500
  });
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const query = useInfiniteQuery({
    queryKey: ['products', filters, sort],
    queryFn: ({ pageParam = 1 }) => api.products({ page: pageParam, pageSize: 12, filters, sort }),
    getNextPageParam: (lastPage) => (lastPage.page * lastPage.page_size < lastPage.total ? lastPage.page + 1 : undefined),
    initialPageParam: 1
  });

  useEffect(() => {
    const next = new URLSearchParams();
    if (sort !== 'relevance') next.set('sort', sort);
    filters.categories.forEach((category) => next.append('category', category));
    setParams(next, { replace: true });
  }, [filters.categories, setParams, sort]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
    });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [query]);

  const products = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);

  function toggleFilter(key: 'categories' | 'brands', value: string) {
    setFilters((current) => ({
      ...current,
      [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value]
    }));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-ink">Products</h1>
          <p className="mt-1 text-slate-600">Filter, sort, quick-view, and keep browsing with infinite loading.</p>
        </div>
        <label className="flex items-center gap-2 font-semibold">
          Sort
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-11 rounded border border-slate-300 px-3">
            {sortOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="h-max rounded-lg border border-slate-200 bg-white p-4" aria-label="Product filters">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <SlidersHorizontal className="h-5 w-5" /> Filters
          </h2>
          <div className="grid gap-5">
            <fieldset>
              <legend className="mb-2 font-semibold">Price range</legend>
              <div className="grid gap-2">
                <input aria-label="Minimum price" type="range" min="0" max="1500" value={filters.minPrice} onChange={(event) => setFilters({ ...filters, minPrice: Number(event.target.value) })} />
                <input aria-label="Maximum price" type="range" min="0" max="1500" value={filters.maxPrice} onChange={(event) => setFilters({ ...filters, maxPrice: Number(event.target.value) })} />
                <p className="text-sm text-slate-600">${filters.minPrice} - ${filters.maxPrice}</p>
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 font-semibold">Category</legend>
              <div className="grid gap-2">
                {categoryOptions.map((category) => (
                  <label key={category} className="flex items-center gap-2">
                    <input type="checkbox" checked={filters.categories.includes(category)} onChange={() => toggleFilter('categories', category)} />
                    {category}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 font-semibold">Brand</legend>
              <div className="grid gap-2">
                {brandOptions.map((brand) => (
                  <label key={brand} className="flex items-center gap-2">
                    <input type="checkbox" checked={filters.brands.includes(brand)} onChange={() => toggleFilter('brands', brand)} />
                    {brand}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="grid gap-2 font-semibold">
              Rating: {filters.rating}+ stars
              <input type="range" min="1" max="5" value={filters.rating} onChange={(event) => setFilters({ ...filters, rating: Number(event.target.value) })} />
            </label>
            <label className="flex items-center gap-2 font-semibold">
              <input type="checkbox" checked={filters.inStock} onChange={(event) => setFilters({ ...filters, inStock: event.target.checked })} />
              In stock only
            </label>
          </div>
        </aside>

        <section aria-label="Product results">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} onQuickView={setQuickView} />
            ))}
            {query.isLoading && Array.from({ length: 9 }).map((_, index) => <Skeleton key={index} className="h-96" />)}
          </div>
          <div ref={sentinelRef} className="py-8 text-center text-sm text-slate-500">
            {query.isFetchingNextPage ? 'Loading more products...' : query.hasNextPage ? 'Scroll for more' : 'End of results'}
          </div>
        </section>
      </div>
      <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />
    </div>
  );
}
