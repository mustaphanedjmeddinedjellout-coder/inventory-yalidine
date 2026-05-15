import { Link, Outlet, useLocation } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from './cart-context';

export default function StorefrontLayout() {
  const { count } = useCart();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-cream/90 backdrop-blur">
        <div className="container-bleed grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2.5 md:gap-6 md:py-5">
          <Link to="/" className="flex items-center">
            <img
              src="/logo.png"
              alt="Noire"
              className="h-5 w-auto md:h-6"
            />
          </Link>
          <nav className="flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.15em] text-black/60 md:gap-6 md:text-[12px] md:tracking-[0.2em]">
            <Link to="/shop/tshirts" className={location.pathname.startsWith('/shop/tshirts') ? 'text-black' : ''}>T-Shirts</Link>
            <Link to="/shop/pants" className={location.pathname.startsWith('/shop/pants') ? 'text-black' : ''}>Pants</Link>
            <Link to="/shop/shoes" className={location.pathname.startsWith('/shop/shoes') ? 'text-black' : ''}>Shoes</Link>
          </nav>
          <Link
            to="/cart"
            className={`relative inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] text-black/60 md:gap-2 md:text-[12px] md:tracking-[0.2em] ${
              location.pathname.startsWith('/cart') ? 'text-black' : ''
            }`}
          >
            <ShoppingCart size={16} />
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[9px] font-bold text-white md:hidden">
                {count}
              </span>
            )}
            <span className="hidden md:inline">السلة ({count})</span>
          </Link>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-black/10 py-10">
        <div className="container-bleed flex flex-col items-center gap-3 text-[12px] uppercase tracking-[0.2em] text-black/40">
          <p>NOIRE LUXEWEAR</p>
          <p className="text-[10px] tracking-[0.3em]">Made in Algeria @shushu</p>
        </div>
      </footer>
    </div>
  );
}
