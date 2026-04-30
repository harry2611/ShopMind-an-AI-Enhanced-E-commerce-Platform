import { useQuery } from '@tanstack/react-query';
import { SearchX } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { Skeleton } from '../components/Skeleton';
import { api } from '../services/api';
import { highlight } from '../utils/format';

export function SearchResultsPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const results = useQuery({
    queryKey: ['semantic-search', query],
    queryFn: () => api.semanticSearch(query),
    enabled: Boolean(query)
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-ink">Search results</h1>
        <p className="mt-1 text-slate-600">
          Showing semantic matches for <strong>{query}</strong>
        </p>
        {results.data?.did_you_mean && (
          <button
            type="button"
            onClick={() => setParams({ q: results.data.did_you_mean ?? '' })}
            className="mt-3 rounded bg-teal-50 px-3 py-2 text-sm font-bold text-tealbrand"
          >
            Did you mean “{results.data.did_you_mean}”?
          </button>
        )}
      </div>

      {results.isLoading && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-96" />)}</div>}

      {results.data && results.data.items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {results.data.items.map((product) => (
            <div key={product.id} className="[&_mark]:rounded [&_mark]:bg-yellow-200">
              <ProductCard product={{ ...product, name: product.name }} />
              <p
                className="mt-2 rounded bg-slate-50 p-2 text-sm text-slate-600"
                dangerouslySetInnerHTML={{ __html: highlight(product.description, query.split(' ')[0] ?? '') }}
              />
            </div>
          ))}
        </div>
      )}

      {results.data && results.data.items.length === 0 && (
        <section className="grid place-items-center rounded-lg bg-slate-100 p-10 text-center">
          <SearchX className="h-10 w-10 text-slate-500" />
          <h2 className="mt-4 text-2xl font-bold">No exact matches</h2>
          <p className="mt-2 max-w-xl text-slate-600">ShopMind can still help. Try one of these AI suggestions.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {(results.data.suggestions.length ? results.data.suggestions : ['best value picks', 'popular gifts', 'work from home essentials']).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setParams({ q: suggestion })}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 font-semibold"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
