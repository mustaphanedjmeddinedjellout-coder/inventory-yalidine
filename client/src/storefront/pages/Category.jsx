import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchProducts } from '../api';
import ProductCard from '../components/ProductCard';

const CATEGORY_MAP = {
  tshirts: { name: 'T-Shirt', label: 'T-Shirts' },
  pants: { name: 'Pants', label: 'Pants' },
  shoes: { name: 'Shoes', label: 'Shoes' },
};

export default function Category() {
  const { category } = useParams();
  const config = CATEGORY_MAP[category || ''] || null;
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

  const filtered = useMemo(() => {
    if (!config) return [];
    return products.filter((p) => p.category === config.name);
  }, [products, config]);

  if (!config) {
    return (
      <div className="container-bleed py-16">
        <p className="text-[13px] text-black/50">Category not found.</p>
        <Link to="/" className="btn-primary mt-6 inline-flex px-6">Back to shop</Link>
      </div>
    );
  }

  return (
    <div className="container-bleed py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="section-heading">{config.label}</h1>
        <Link to="/" className="text-[11px] uppercase tracking-[0.3em] text-black/40">All</Link>
      </div>

      {loading && <p className="text-black/50 text-[13px]">Loading products...</p>}
      {error && <p className="text-red-500 text-[13px]">{error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
