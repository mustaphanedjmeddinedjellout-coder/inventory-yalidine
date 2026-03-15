import { Link, Outlet, useLocation } from 'react-router-dom';
import { useCart } from './cart-context';

export default function StorefrontLayout() {
  const { count } = useCart();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-cream/90 backdrop-blur">
        <div className="container-bleed flex items-center justify-between py-5">
          <Link to="/" className="text-[18px] font-display tracking-[0.2em]">
            NOIRE
          </Link>
          <nav className="flex items-center gap-6 text-[12px] uppercase tracking-[0.2em] text-black/60">
            <Link to="/" className={location.pathname === '/' ? 'text-black' : ''}>Shop</Link>
            <Link to="/cart" className={location.pathname.startsWith('/cart') ? 'text-black' : ''}>
              Cart ({count})
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-black/10 py-10">
        <div className="container-bleed flex flex-col items-center gap-3 text-[12px] uppercase tracking-[0.2em] text-black/40">
          <p>NOIRE LUXEWEAR</p>
          <p className="text-[10px] tracking-[0.3em]">Made in Algeria</p>
        </div>
      </footer>
    </div>
  );
}
