import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchLandingPage } from '../api';
import { formatDzd, resolveImageUrl } from '../utils';
import { useCart } from '../cart-context';
import SmartImage from '../components/SmartImage';
import TrustStrip from '../components/TrustStrip';
import CustomerReviews from '../components/CustomerReviews';

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

const SIZE_PRIORITY = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

function sortSizes(sizes) {
  return [...sizes].sort((a, b) => {
    const left = a.toUpperCase();
    const right = b.toUpperCase();
    const li = SIZE_PRIORITY.indexOf(left);
    const ri = SIZE_PRIORITY.indexOf(right);
    if (li !== -1 || ri !== -1) {
      if (li === -1) return 1;
      if (ri === -1) return -1;
      return li - ri;
    }
    return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
  });
}

function ProductSelector({ product, label, selection, onSelectionChange, customImage }) {
  const variants = product?.variants || [];

  const colors = useMemo(() => {
    const map = new Map();
    for (const v of variants) {
      const lbl = String(v.color || '').trim();
      const key = normalizeText(lbl);
      if (!key || map.has(key)) continue;
      map.set(key, lbl);
    }
    return Array.from(map.entries()).map(([value, lbl]) => ({ value, label: lbl }));
  }, [variants]);

  const sizes = useMemo(() => {
    const unique = Array.from(new Set(variants.map((v) => String(v.size || '').trim()))).filter(Boolean);
    return sortSizes(unique);
  }, [variants]);

  const selectedVariant = useMemo(
    () => variants.find(
      (v) => normalizeText(v.color) === normalizeText(selection.color) && normalizeText(v.size) === normalizeText(selection.size)
    ),
    [variants, selection.color, selection.size]
  );

  const colorImage = useMemo(() => {
    const colorKey = normalizeText(selection.color);
    const extraImages = product?.color_images?.[colorKey] || [];
    if (extraImages.length > 0) return extraImages[0];
    const variantImg = variants.find((v) => normalizeText(v.color) === colorKey && v.image)?.image;
    return variantImg || product?.image || '';
  }, [variants, selection.color, product]);

  function selectColor(color) {
    const hasSize = variants.some(
      (v) => normalizeText(v.color) === color.value && normalizeText(v.size) === normalizeText(selection.size) && v.quantity > 0
    );
    if (hasSize) {
      onSelectionChange({ color: color.label, size: selection.size });
    } else {
      const first = variants.find((v) => normalizeText(v.color) === color.value && v.quantity > 0);
      onSelectionChange({ color: color.label, size: first?.size || selection.size });
    }
  }

  const maxQty = selectedVariant?.quantity || 0;

  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-4 space-y-4">
      <div className="flex gap-4">
        <div className="w-24 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-[#f5f1ea]">
          <SmartImage
            src={resolveImageUrl(customImage || colorImage)}
            alt={product.model_name}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-black/40 mb-1">{label}</p>
          <h3 className="text-[15px] font-semibold text-ink truncate">{product.model_name}</h3>
          {maxQty > 0 && maxQty < 3 && (
            <p className="text-[11px] text-red-500 font-medium mt-1">كمية قليلة</p>
          )}
          {maxQty === 0 && selectedVariant && (
            <p className="text-[11px] text-red-500 font-medium mt-1">غير متوفر</p>
          )}
        </div>
      </div>

      {colors.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-black/40 mb-2">اللون</p>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => {
              const isAvailable = variants.some((v) => normalizeText(v.color) === color.value && v.quantity > 0);
              return (
                <button
                  key={color.value}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => selectColor(color)}
                  className={`rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-wider transition-all ${
                    normalizeText(selection.color) === color.value
                      ? 'border-black bg-black text-white'
                      : isAvailable
                      ? 'border-black/20 text-black/70 hover:border-black'
                      : 'border-black/10 text-black/30'
                  }`}
                >
                  {color.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-black/40 mb-2">المقاس</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const isAvailable = variants.some(
                (v) => normalizeText(v.size) === normalizeText(size) && normalizeText(v.color) === normalizeText(selection.color) && v.quantity > 0
              );
              return (
                <button
                  key={size}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => onSelectionChange({ ...selection, size })}
                  className={`rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-wider transition-all ${
                    normalizeText(selection.size) === normalizeText(size)
                      ? 'border-black bg-black text-white'
                      : isAvailable
                      ? 'border-black/20 text-black/70 hover:border-black'
                      : 'border-black/10 text-black/30'
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LandingOffer() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [sel1, setSel1] = useState({ color: '', size: '' });
  const [sel2, setSel2] = useState({ color: '', size: '' });

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    fetchLandingPage(slug)
      .then((res) => {
        if (!active) return;
        setData(res);
        const v1 = res.product1?.variants?.find((v) => v.quantity > 0);
        const v2 = res.product2?.variants?.find((v) => v.quantity > 0);
        if (v1) setSel1({ color: v1.color || '', size: v1.size || '' });
        if (v2) setSel2({ color: v2.color || '', size: v2.size || '' });
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'العرض غير متوفر');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    if (!data || typeof window === 'undefined' || !window.fbq) return;
    window.fbq('track', 'ViewContent', {
      content_type: 'product',
      content_ids: [String(data.product1.id), String(data.product2.id)],
      content_name: data.title,
      currency: 'DZD',
      value: Number(data.offer_price || 0),
    });
  }, [data]);

  const variant1 = useMemo(() => {
    if (!data?.product1) return null;
    return data.product1.variants.find(
      (v) => normalizeText(v.color) === normalizeText(sel1.color) && normalizeText(v.size) === normalizeText(sel1.size)
    );
  }, [data, sel1]);

  const variant2 = useMemo(() => {
    if (!data?.product2) return null;
    return data.product2.variants.find(
      (v) => normalizeText(v.color) === normalizeText(sel2.color) && normalizeText(v.size) === normalizeText(sel2.size)
    );
  }, [data, sel2]);

  const canOrder = variant1 && variant1.quantity > 0 && variant2 && variant2.quantity > 0;

  function handleOrder() {
    if (!canOrder || !data) return;
    const p1 = data.product1;
    const p2 = data.product2;

    const pricePerItem1 = Math.round(data.offer_price * (p1.selling_price / (p1.selling_price + p2.selling_price)));
    const pricePerItem2 = data.offer_price - pricePerItem1;

    addItem({
      productId: String(p1.id),
      variantId: String(variant1.id),
      title: p1.model_name,
      image: resolveImageUrl(variant1.image || p1.image),
      price: pricePerItem1,
      size: variant1.size,
      color: variant1.color,
      category: p1.category || '',
      quantity: 1,
    });

    addItem({
      productId: String(p2.id),
      variantId: String(variant2.id),
      title: p2.model_name,
      image: resolveImageUrl(variant2.image || p2.image),
      price: pricePerItem2,
      size: variant2.size,
      color: variant2.color,
      category: p2.category || '',
      quantity: 1,
    });

    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'AddToCart', {
        content_type: 'product',
        content_ids: [String(p1.id), String(p2.id)],
        content_name: data.title,
        currency: 'DZD',
        value: Number(data.offer_price || 0),
        num_items: 2,
      });
    }

    navigate('/checkout');
  }

  if (loading) {
    return <div className="container-bleed py-16 text-[13px] text-black/50 text-center">جار التحميل...</div>;
  }

  if (error || !data) {
    return (
      <div className="container-bleed py-16 text-center">
        <p className="text-red-500 text-[13px]">{error || 'العرض غير متوفر'}</p>
      </div>
    );
  }

  const discount = data.original_price ? Math.round(((data.original_price - data.offer_price) / data.original_price) * 100) : 0;

  return (
    <div className="container-bleed py-6 pb-36 sm:py-10 sm:pb-12">
      {/* Hero section */}
      <div className="text-center mb-8">
        {discount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-[12px] font-semibold text-red-600 mb-3">
            🔥 وفّر {discount}%
          </span>
        )}
        <h1 className="text-2xl sm:text-3xl font-display text-ink leading-tight">{data.title}</h1>
        {data.subtitle && (
          <p className="mt-2 text-[14px] text-black/55">{data.subtitle}</p>
        )}
        <div className="mt-4 flex items-baseline justify-center gap-3">
          <span className="text-2xl font-bold text-ink">{formatDzd(data.offer_price)}</span>
          {data.original_price && (
            <span className="text-[14px] text-black/35 line-through">{formatDzd(data.original_price)}</span>
          )}
        </div>
      </div>

      {/* Banner image */}
      {data.image && (
        <div className="mb-8 mx-auto max-w-lg rounded-2xl overflow-hidden">
          <img src={resolveImageUrl(data.image)} alt={data.title} className="w-full h-auto" />
        </div>
      )}

      {/* Product selectors */}
      <div className="max-w-lg mx-auto space-y-4">
        <ProductSelector
          product={data.product1}
          label="المنتج الأول"
          selection={sel1}
          onSelectionChange={setSel1}
          customImage={data.product1_image}
        />
        <ProductSelector
          product={data.product2}
          label="المنتج الثاني"
          selection={sel2}
          onSelectionChange={setSel2}
          customImage={data.product2_image}
        />

        {/* CTA */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            className="btn-cta-main btn-cta-fixed"
            disabled={!canOrder}
            onClick={handleOrder}
          >
            <span className="sm:hidden">اطلب الآن · {formatDzd(data.offer_price)}</span>
            <span className="hidden sm:inline">اطلب العرض الآن - الدفع عند الاستلام</span>
          </button>
          {!canOrder && (
            <p className="text-center text-[12px] text-red-500">يرجى اختيار اللون والمقاس المتوفر لكلا المنتجين</p>
          )}
        </div>

        <TrustStrip />

        {/* Urgency */}
        <div className="text-center py-3 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-[13px] font-semibold text-amber-800">⏰ العرض محدود - لا تفوت الفرصة!</p>
        </div>
      </div>

      <CustomerReviews />
    </div>
  );
}
