import type { Product } from '../types/shop';
import { ProductCard } from './ProductCard';
import { Skeleton } from './Skeleton';

type Props = {
  title: string;
  products?: Product[];
  subtitle?: string;
};

export function ProductCarousel({ title, products, subtitle }: Props) {
  return (
    <section className="py-8" aria-labelledby={`${title.replace(/\s+/g, '-')}-title`}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 id={`${title.replace(/\s+/g, '-')}-title`} className="text-2xl font-bold text-ink">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
        </div>
      </div>
      <div className="grid grid-flow-col auto-cols-[minmax(230px,1fr)] gap-4 overflow-x-auto pb-3">
        {!products
          ? Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-80 w-64" />)
          : products.map((product) => <ProductCard key={product.id} product={product} compact />)}
      </div>
    </section>
  );
}
