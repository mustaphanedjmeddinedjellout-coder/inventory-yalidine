import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchProductById, fetchProducts } from '../api';
import { formatDzd, extractIdFromSlug, resolveImageUrl } from '../utils';
import QuantityPicker from '../components/QuantityPicker';
import { useCart } from '../cart-context';
import SmartImage from '../components/SmartImage';
import ProductCard from '../components/ProductCard';

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

export default function Product() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [catalog, setCatalog] = useState([]);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

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
        setSelectedColor(String(firstAvailable?.color || '').trim());
        setSelectedSize(String(firstAvailable?.size || '').trim());
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

  useEffect(() => {
    let active = true;

    fetchProducts()
      .then((data) => {
        if (!active) return;
        setCatalog(data || []);
      })
      .catch(() => {
        if (!active) return;
        setCatalog([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const availableVariants = useMemo(() => product?.variants || [], [product]);
  const sizes = useMemo(() => {
    return Array.from(
      new Set(availableVariants.map((v) => String(v.size || '').trim()))
    ).filter(Boolean);
  }, [availableVariants]);

  const colors = useMemo(() => {
    const byNormalized = new Map();
    for (const v of availableVariants) {
      const label = String(v.color || '').trim();
      const key = normalizeText(label);
      if (!key || byNormalized.has(key)) continue;
      byNormalized.set(key, label);
    }
    return Array.from(byNormalized.entries()).map(([value, label]) => ({ value, label }));
  }, [availableVariants]);

  const selectedVariant = useMemo(
    () =>
      availableVariants.find(
        (v) =>
          normalizeText(v.size) === normalizeText(selectedSize)
          && normalizeText(v.color) === normalizeText(selectedColor)
      ),
    [availableVariants, selectedColor, selectedSize]
  );

  const selectedColorImage = useMemo(() => {
    return availableVariants.find(
      (v) => normalizeText(v.color) === normalizeText(selectedColor) && v.image
    )?.image || '';
  }, [availableVariants, selectedColor]);

  const swipableColors = useMemo(() => {
    return colors.filter((color) =>
      availableVariants.some((v) => normalizeText(v.color) === color.value && v.quantity > 0)
    );
  }, [colors, availableVariants]);

  function applyColorSelection(color) {
    if (!color) return;

    setSelectedColor(color.label);
    const hasSizeForColor = availableVariants.some(
      (v) =>
        normalizeText(v.color) === color.value
        && normalizeText(v.size) === normalizeText(selectedSize)
        && v.quantity > 0
    );

    if (!hasSizeForColor) {
      const firstMatch = availableVariants.find(
        (v) => normalizeText(v.color) === color.value && v.quantity > 0
      ) || availableVariants.find((v) => normalizeText(v.color) === color.value);

      if (firstMatch?.size) {
        setSelectedSize(String(firstMatch.size).trim());
      }
    }
  }

  function goToRelativeColor(step) {
    if (swipableColors.length < 2) return;

    const currentIndex = swipableColors.findIndex(
      (color) => color.value === normalizeText(selectedColor)
    );
    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + step + swipableColors.length) % swipableColors.length;
    applyColorSelection(swipableColors[nextIndex]);
  }

  function handleImageTouchStart(event) {
    const touch = event.touches?.[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setIsDragging(true);
    setDragOffsetX(0);
  }

  function handleImageTouchMove(event) {
    const touch = event.touches?.[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      event.preventDefault();
    }

    const limitedOffset = Math.max(-90, Math.min(90, deltaX));
    setDragOffsetX(limitedOffset);
  }

  function handleImageTouchEnd(event) {
    const touch = event.changedTouches?.[0];
    if (!touch) {
      setIsDragging(false);
      setDragOffsetX(0);
      return;
    }

    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    setIsDragging(false);
    setDragOffsetX(0);

    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY)) {
      return;
    }

    if (deltaX < 0) {
      goToRelativeColor(1);
    } else {
      goToRelativeColor(-1);
    }
  }

  useEffect(() => {
    if (!availableVariants.length && !product?.image) return;

    const uniqueImagePaths = new Set();

    for (const variant of availableVariants) {
      if (variant?.image) {
        uniqueImagePaths.add(variant.image);
      }
    }

    if (product?.image) {
      uniqueImagePaths.add(product.image);
    }

    const preloaders = [];
    for (const imagePath of uniqueImagePaths) {
      const img = new Image();
      img.decoding = 'async';
      img.src = resolveImageUrl(imagePath);
      preloaders.push(img);
    }
  }, [availableVariants, product?.image]);

  const maxQuantity = selectedVariant?.quantity || 0;
  const displayImage = selectedVariant?.image || selectedColorImage || product?.image;
  const suggestedProducts = useMemo(() => {
    if (!catalog.length) return [];

    const currentId = String(product?.id || '');
    const pool = catalog.filter((item) => String(item?.id || '') !== currentId);
    const pickedIds = new Set();

    const groups = [
      {
        key: 'tshirt',
        match: (item) => {
          const category = normalizeText(item?.category);
          const name = normalizeText(item?.model_name);
          return category.includes('t-shirt') || category.includes('tshirt') || name.includes('t-shirt') || name.includes('tshirt');
        },
      },
      {
        key: 'pants',
        match: (item) => {
          const category = normalizeText(item?.category);
          const name = normalizeText(item?.model_name);
          return category.includes('pants') || category.includes('pantalon') || name.includes('pants') || name.includes('pantalon');
        },
      },
      {
        key: 'shoes',
        match: (item) => {
          const category = normalizeText(item?.category);
          const name = normalizeText(item?.model_name);
          return category.includes('shoes') || category.includes('shoe') || category.includes('chaussure') || name.includes('shoes') || name.includes('shoe') || name.includes('chaussure');
        },
      },
    ];

    const picks = [];
    for (const group of groups) {
      const withStock = pool.find((item) => !pickedIds.has(item.id) && group.match(item) && Number(item.total_stock || 0) > 0);
      const fallback = pool.find((item) => !pickedIds.has(item.id) && group.match(item));
      const selected = withStock || fallback;
      if (!selected) continue;
      pickedIds.add(selected.id);
      picks.push(selected);
    }

    return picks;
  }, [catalog, product?.id]);

  const onAdd = () => {
    if (!product || !selectedVariant || maxQuantity <= 0) return;
    addItem({
      productId: String(product.id),
      variantId: String(selectedVariant.id),
      title: product.model_name,
      image: resolveImageUrl(selectedVariant.image || selectedColorImage || product.image),
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
          <div
            className={`h-full w-full ${isDragging ? '' : 'transition-transform duration-300 ease-out'}`}
            style={{ transform: `translateX(${dragOffsetX}px)` }}
          >
            <SmartImage
              key={displayImage}
              src={resolveImageUrl(displayImage)}
              alt={product.model_name}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="h-full w-full object-cover"
              onTouchStart={handleImageTouchStart}
              onTouchMove={handleImageTouchMove}
              onTouchEnd={handleImageTouchEnd}
            />
          </div>

          {swipableColors.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous color"
                onClick={() => goToRelativeColor(-1)}
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-black/15 bg-white/75 p-2 text-black shadow-sm backdrop-blur transition hover:bg-white"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                aria-label="Next color"
                onClick={() => goToRelativeColor(1)}
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-black/15 bg-white/75 p-2 text-black shadow-sm backdrop-blur transition hover:bg-white"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}
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
                  const isAvailable = availableVariants.some(
                    (v) => normalizeText(v.color) === color.value && v.quantity > 0
                  );
                  return (
                    <button
                      key={color.value}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => applyColorSelection(color)}
                      className={`rounded-full border px-4 py-2 text-[12px] uppercase tracking-wider transition-all ${
                        normalizeText(selectedColor) === color.value
                          ? 'border-black bg-black text-white'
                          : isAvailable
                          ? 'border-black/20 text-black/70 hover:border-black'
                          : 'border-black/10 text-black/30'
                      }`}
                    >
                      {color.label || 'افتراضي'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-black/40">المقاس</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {sizes.map((size) => {
                  const isAvailable = availableVariants.some(
                    (v) =>
                      normalizeText(v.size) === normalizeText(size)
                      && normalizeText(v.color) === normalizeText(selectedColor)
                      && v.quantity > 0
                  );
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
                {maxQuantity > 0 && maxQuantity < 3 && (
                  <p className="text-[11px] text-black/50">كمية قليلة</p>
                )}
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

      {suggestedProducts.length > 0 && (
        <section className="mt-16 border-t border-black/10 pt-10">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="section-heading">Suggested for you</h2>
            <Link to="/" className="text-[11px] uppercase tracking-[0.3em] text-black/40">
              More products
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
            {suggestedProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
