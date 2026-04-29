import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchProducts } from '../api';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const productsRef = useRef(null);

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

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const timer = window.setTimeout(() => {
      productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 650);
    return () => window.clearTimeout(timer);
  }, []);


  return (
    <div>
      <section className="hero">
        <div className="container-bleed">
          <div className="hero-stack">
            <span className="hero-badge">Limited Edition Online Exclusive</span>
            <h1 className="hero-title">Keep it simple, keep it Noiré.</h1>
            <p className="hero-subtitle">Curated fashion for the modern wardrobe</p>
            <p className="hero-delivery">التوصيل متوفر 69 ولاية</p>
            <Link to="/shop/tshirts" className="btn-primary">Shop new drop</Link>
          </div>
        </div>
      </section>

      <section className="section-block" ref={productsRef} id="products">
        <div className="container-bleed space-y-12">
          {loading && <p className="text-black/50 text-[13px]">Loading products...</p>}
          {error && <p className="text-red-500 text-[13px]">{error}</p>}

          {!loading && !error && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
