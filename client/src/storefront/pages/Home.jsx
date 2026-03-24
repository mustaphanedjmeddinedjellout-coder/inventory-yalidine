import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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

  const tshirts = useMemo(() => products.filter((p) => p.category === 'T-Shirt').slice(0, 8), [products]);
  const pants = useMemo(() => products.filter((p) => p.category === 'Pants').slice(0, 4), [products]);
  const shoes = useMemo(() => products.filter((p) => p.category === 'Shoes').slice(0, 4), [products]);

  return (
    <div>
      <section className="hero">
        <div className="container-bleed">
          <div className="hero-stack">
            <span className="hero-badge">Limited Edition Online Exclusive</span>
            <h1 className="hero-title">Keep it simple, keep it Noiré.</h1>
            <p className="hero-subtitle">Curated fashion for the modern wardrobe</p>
            <Link to="/shop/tshirts" className="btn-primary">Shop new drop</Link>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="container-bleed space-y-12">
          {loading && <p className="text-black/50 text-[13px]">Loading products...</p>}
          {error && <p className="text-red-500 text-[13px]">{error}</p>}

          {!loading && !error && (
            <>
              <div>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="section-heading">T-Shirts</h2>
                  <Link to="/shop/tshirts" className="text-[11px] uppercase tracking-[0.3em] text-black/40">View all</Link>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                  {tshirts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="section-heading">Pants</h2>
                  <Link to="/shop/pants" className="text-[11px] uppercase tracking-[0.3em] text-black/40">View all</Link>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                  {pants.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="section-heading">Shoes</h2>
                  <Link to="/shop/shoes" className="text-[11px] uppercase tracking-[0.3em] text-black/40">View all</Link>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                  {shoes.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
