import { Link, Outlet, useLocation } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from './cart-context';

export default function StorefrontLayout() {
  const { count } = useCart();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-cream/90 backdrop-blur">
        <div className="container-bleed grid items-center gap-6 py-5 md:grid-cols-[auto_1fr_auto]">
          <Link to="/" className="flex items-center">
            <img
              src="/logo.png"
              alt="Noire"
              className="h-6 w-auto"
            />
          </Link>
          <nav className="flex items-center justify-center gap-6 text-[12px] uppercase tracking-[0.2em] text-black/60">
            <Link to="/shop/tshirts" className={location.pathname.startsWith('/shop/tshirts') ? 'text-black' : ''}>T-Shirts</Link>
            <Link to="/shop/pants" className={location.pathname.startsWith('/shop/pants') ? 'text-black' : ''}>Pants</Link>
            <Link to="/shop/shoes" className={location.pathname.startsWith('/shop/shoes') ? 'text-black' : ''}>Shoes</Link>
          </nav>
          <Link
            to="/cart"
            className={`inline-flex items-center justify-end gap-2 text-[12px] uppercase tracking-[0.2em] text-black/60 ${
              location.pathname.startsWith('/cart') ? 'text-black' : ''
            }`}
          >
            <ShoppingCart size={14} />
            Cart ({count})
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
