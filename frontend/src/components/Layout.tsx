import { Outlet } from 'react-router-dom';
import { AssistantWidget } from './AssistantWidget';
import { CartDrawer } from './CartDrawer';
import { Header } from './Header';

export function Layout() {
  return (
    <>
      <Header />
      <main id="main">
        <Outlet />
      </main>
      <CartDrawer />
      <AssistantWidget />
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="screen-reader-announcer" />
    </>
  );
}
