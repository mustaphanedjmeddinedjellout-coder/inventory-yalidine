import { Link } from 'react-router-dom';
import { formatDzd, resolveImageUrl, slugForProduct } from '../utils';

export default function ProductCard({ product }) {
  const image = resolveImageUrl(product.image);
  const totalStock = product.variants?.reduce((sum, v) => sum + (v.quantity || 0), 0) || 0;

  return (
    <Link to={`/product/${slugForProduct(product)}`} className="group block">
      <article>
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#efeae2]">
          <img
            src={image}
            alt={product.model_name}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          {totalStock === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
              <span className="rounded-full bg-black/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                Sold Out
              </span>
            </div>
          )}
        </div>
        <div className="mt-3 space-y-1">
          <h3 className="line-clamp-1 text-[13px] font-medium text-ink transition-colors group-hover:text-black/70">
            {product.model_name}
          </h3>
          <p className="text-[13px] font-semibold text-black/70">{formatDzd(product.selling_price)}</p>
        </div>
      </article>
    </Link>
  );
}
