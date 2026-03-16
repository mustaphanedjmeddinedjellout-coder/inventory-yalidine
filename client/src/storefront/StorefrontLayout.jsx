import { Link, Outlet, useLocation } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from './cart-context';

export default function StorefrontLayout() {
  const { count } = useCart();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-cream/90 backdrop-blur">
        <div className="container-bleed flex flex-col items-center gap-4 py-5 md:grid md:grid-cols-[auto_1fr_auto] md:gap-6 md:py-5">
          <Link to="/" className="flex items-center md:justify-start">
            <img
              src="/logo.png"
              alt="Noire"
              className="h-6 w-auto"
            />
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-4 text-[11px] uppercase tracking-[0.2em] text-black/60 md:gap-6 md:text-[12px]">
            <Link to="/shop/tshirts" className={location.pathname.startsWith('/shop/tshirts') ? 'text-black' : ''}>T-Shirts</Link>
            <Link to="/shop/pants" className={location.pathname.startsWith('/shop/pants') ? 'text-black' : ''}>Pants</Link>
            <Link to="/shop/shoes" className={location.pathname.startsWith('/shop/shoes') ? 'text-black' : ''}>Shoes</Link>
          </nav>
          <Link
            to="/cart"
            className={`inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.2em] text-black/60 md:justify-end ${
              location.pathname.startsWith('/cart') ? 'text-black' : ''
            }`}
          >
            <ShoppingCart size={14} />
            السلة ({count})
          </Link>
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
