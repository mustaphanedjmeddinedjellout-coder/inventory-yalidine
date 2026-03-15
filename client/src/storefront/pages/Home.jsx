import { useEffect, useMemo, useState } from 'react';
import { fetchProducts } from '../api';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchProducts()
      .then((data) => {
        if (!active) return;
        setProducts(data || []);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load products');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const featured = useMemo(() => products.slice(0, 8), [products]);

  return (
    <div>
      <section className="hero">
        <div className="container-bleed grid gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-6">
            <p className="text-[12px] uppercase tracking-[0.4em] text-black/50">Noire Essentials</p>
            <h1 className="text-4xl sm:text-5xl font-display leading-tight text-ink">
              Minimal silhouettes.
              <br />
              Maximum presence.
            </h1>
            <p className="text-[14px] text-black/55 leading-relaxed max-w-xl">
              Discover curated drops with precise tailoring and ready-to-ship stock. Every piece you see is live from the inventory dashboard.
            </p>
          </div>
          <div className="hero-panel">
            <div className="hero-panel-inner">
              <p className="text-[11px] uppercase tracking-[0.3em] text-black/45">Live Inventory</p>
              <p className="text-[36px] font-display text-ink">{products.length}</p>
              <p className="text-[12px] text-black/45">Products available right now</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="container-bleed">
          <div className="flex items-center justify-between mb-8">
            <h2 className="section-heading">Featured Pieces</h2>
            <span className="text-[11px] uppercase tracking-[0.3em] text-black/40">Drop 01</span>
          </div>

          {loading && <p className="text-black/50 text-[13px]">Loading products...</p>}
          {error && <p className="text-red-500 text-[13px]">{error}</p>}

          {!loading && !error && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
              {featured.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
