import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchProductById } from '../api';
import { formatDzd, extractIdFromSlug, resolveImageUrl } from '../utils';
import QuantityPicker from '../components/QuantityPicker';
import { useCart } from '../cart-context';

export default function Product() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const id = extractIdFromSlug(slug || '');
    if (!id) {
      setError('المنتج غير موجود');
      setLoading(false);
      return;
    }

    let active = true;
    fetchProductById(id)
      .then((data) => {
        if (!active) return;
        setProduct(data);
        const firstAvailable = data?.variants?.find((v) => v.quantity > 0);
        setSelectedColor(firstAvailable?.color || '');
        setSelectedSize(firstAvailable?.size || '');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'فشل تحميل المنتج');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  const availableVariants = useMemo(() => product?.variants || [], [product]);
  const sizes = useMemo(() => Array.from(new Set(availableVariants.map((v) => v.size))), [availableVariants]);
  const colors = useMemo(() => Array.from(new Set(availableVariants.map((v) => v.color))), [availableVariants]);

  const selectedVariant = useMemo(
    () => availableVariants.find((v) => v.size === selectedSize && v.color === selectedColor),
    [availableVariants, selectedColor, selectedSize]
  );

  const maxQuantity = selectedVariant?.quantity || 0;
  const displayImage = selectedVariant?.image || product?.image;

  const onAdd = () => {
    if (!product || !selectedVariant || maxQuantity <= 0) return;
    addItem({
      productId: String(product.id),
      variantId: String(selectedVariant.id),
      title: product.model_name,
      image: resolveImageUrl(selectedVariant.image || product.image),
      price: product.selling_price,
      size: selectedVariant.size,
      color: selectedVariant.color,
      quantity,
    });
    navigate('/cart');
  };

  if (loading) {
    return <div className="container-bleed py-16 text-[13px] text-black/50">جار التحميل...</div>;
  }

  if (error || !product) {
    return (
      <div className="container-bleed py-16">
        <p className="text-red-500 text-[13px]">{error || 'المنتج غير موجود'}</p>
        <Link to="/" className="btn-primary mt-6 inline-flex px-6">العودة للمتجر</Link>
      </div>
    );
  }

  return (
    <div className="container-bleed py-12">
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="relative aspect-3/4 w-full overflow-hidden bg-[#efeae2]">
          <img
            src={resolveImageUrl(displayImage)}
            alt={product.model_name}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-black/40">المخزون المتاح</p>
            <h1 className="text-3xl font-display text-ink mt-3">{product.model_name}</h1>
            <p className="text-[16px] text-black/60 mt-2">{formatDzd(product.selling_price)}</p>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-black/40">اللون</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {colors.map((color) => {
                  const isAvailable = availableVariants.some((v) => v.color === color && v.quantity > 0);
                  return (
                    <button
                      key={color}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => {
                        setSelectedColor(color);
                        const hasSizeForColor = availableVariants.some(
                          (v) => v.color === color && v.size === selectedSize && v.quantity > 0
                        );
                        if (!hasSizeForColor) {
                          const firstMatch = availableVariants.find((v) => v.color === color && v.quantity > 0)
                            || availableVariants.find((v) => v.color === color);
                          if (firstMatch?.size) {
                            setSelectedSize(firstMatch.size);
                          }
                        }
                      }}
                      className={`rounded-full border px-4 py-2 text-[12px] uppercase tracking-wider transition-all ${
                        selectedColor === color
                          ? 'border-black bg-black text-white'
                          : isAvailable
                          ? 'border-black/20 text-black/70 hover:border-black'
                          : 'border-black/10 text-black/30'
                      }`}
                    >
                      {color || 'افتراضي'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-black/40">المقاس</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {sizes.map((size) => {
                  const isAvailable = availableVariants.some((v) => v.size === size && v.quantity > 0);
                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => setSelectedSize(size)}
                      className={`rounded-full border px-4 py-2 text-[12px] uppercase tracking-wider transition-all ${
                        selectedSize === size
                          ? 'border-black bg-black text-white'
                          : isAvailable
                          ? 'border-black/20 text-black/70 hover:border-black'
                          : 'border-black/10 text-black/30'
                      }`}
                    >
                      {size || 'مقاس واحد'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-white/70 px-5 py-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-black/40">الكمية</p>
                <p className="text-[11px] text-black/50">المتوفر: {maxQuantity}</p>
              </div>
              <QuantityPicker value={quantity} onChange={setQuantity} max={maxQuantity || 1} />
            </div>
          </div>

          <button
            type="button"
            className="btn-primary w-full"
            disabled={!selectedVariant || maxQuantity <= 0}
            onClick={onAdd}
          >
            أضف إلى السلة
          </button>

          <p className="text-[12px] text-black/40">
            Inventory updates in real time. Orders placed here immediately reduce stock in the admin.
          </p>
        </div>
      </div>
    </div>
  );
}
