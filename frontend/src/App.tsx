import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Skeleton } from './components/Skeleton';

const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })));
const ProductListingPage = lazy(() => import('./pages/ProductListingPage').then((module) => ({ default: module.ProductListingPage })));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage').then((module) => ({ default: module.ProductDetailPage })));
const SearchResultsPage = lazy(() => import('./pages/SearchResultsPage').then((module) => ({ default: module.SearchResultsPage })));

function RouteFallback() {
  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton key={index} className="h-72" />
      ))}
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'products', element: <ProductListingPage /> },
      { path: 'products/:id', element: <ProductDetailPage /> },
      { path: 'search', element: <SearchResultsPage /> }
    ]
  }
]);

export function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
