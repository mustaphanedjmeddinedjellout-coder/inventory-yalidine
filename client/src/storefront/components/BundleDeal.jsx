import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatDzd, resolveImageUrl, slugForProduct, getEffectivePrice, isTshirtCategory, isPantsCategory, BUNDLE_DISCOUNT_RATE } from '../utils';
import SmartImage from './SmartImage';

export default function BundleDeal({ currentProduct, catalog }) {
  const currentCategory = String(currentProduct?.category || '').trim().toLowerCase();
  const isTshirt = isTshirtCategory(currentCategory);
  const isPants = isPantsCategory(currentCategory);

  const PREFERRED_PANTS_IDS = ['31', '32'];

  const bundlePartner = useMemo(() => {
    if (!catalog.length || (!isTshirt && !isPants)) return null;

    const currentId = String(currentProduct?.id || '');
    const pool = catalog.filter((item) => String(item?.id || '') !== currentId);

    if (isTshirt) {
      const preferred = PREFERRED_PANTS_IDS
        .map((id) => pool.find((item) => String(item?.id || '') === id))
        .filter((item) => item && (item.total_stock || item.variants?.reduce((s, v) => s + (v.quantity || 0), 0)) > 0);
      if (preferred.length > 0) {
        return preferred[Math.floor(Math.random() * preferred.length)];
      }
    }

    const matcher = isTshirt ? isPantsCategory : isTshirtCategory;
    const inStock = pool.filter(
      (item) => matcher(item.category) && (item.total_stock || item.variants?.reduce((s, v) => s + (v.quantity || 0), 0)) > 0
    );

    if (inStock.length === 0) return null;
    return inStock[Math.floor(Math.random() * inStock.length)];
  }, [catalog, currentProduct?.id, isTshirt, isPants]);

  if (!bundlePartner) return null;

  const currentPrice = getEffectivePrice(currentProduct);
  const partnerPrice = getEffectivePrice(bundlePartner);
  const combinedPrice = currentPrice + partnerPrice;
  const discountAmount = Math.round(combinedPrice * BUNDLE_DISCOUNT_RATE);
  const bundlePrice = combinedPrice - discountAmount;
  const discountPct = Math.round(BUNDLE_DISCOUNT_RATE * 100);

  const partnerLabel = isTshirt ? 'بنطلون' : 'تي شيرت';

  return (
    <div className="mt-6 rounded-2xl border-2 border-dashed border-black/15 bg-gradient-to-br from-amber-50/60 to-orange-50/40 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center rounded-full bg-black px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
          -{discountPct}% عرض
        </span>
        <p className="text-[13px] font-semibold text-ink">اشترِ معاً ووفّر!</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 h-20 w-16 rounded-xl overflow-hidden bg-[#efeae2]">
          <SmartImage
            src={resolveImageUrl(currentProduct.image)}
            alt={currentProduct.model_name}
            className="h-full w-full object-cover"
          />
        </div>

        <span className="text-[18px] font-bold text-black/30">+</span>

        <Link
          to={`/product/${slugForProduct(bundlePartner)}`}
          className="flex-shrink-0 h-20 w-16 rounded-xl overflow-hidden bg-[#efeae2] ring-2 ring-amber-400/50 ring-offset-1"
        >
          <SmartImage
            src={resolveImageUrl(bundlePartner.image || bundlePartner.variants?.[0]?.image)}
            alt={bundlePartner.model_name}
            className="h-full w-full object-cover"
          />
        </Link>

        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-black/50 truncate">أضف {partnerLabel}</p>
          <Link
            to={`/product/${slugForProduct(bundlePartner)}`}
            className="text-[13px] font-medium text-ink truncate block hover:underline"
          >
            {bundlePartner.model_name}
          </Link>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-[14px] font-bold text-green-700">{formatDzd(bundlePrice)}</span>
            <span className="text-[11px] text-black/35 line-through">{formatDzd(combinedPrice)}</span>
          </div>
        </div>
      </div>

      <Link
        to={`/product/${slugForProduct(bundlePartner)}`}
        className="mt-4 flex w-full items-center justify-center rounded-full bg-black px-6 py-2.5 text-[12px] font-semibold uppercase tracking-wider text-white transition-colors hover:bg-black/80"
      >
        اختر {partnerLabel} واستفد من العرض
      </Link>
    </div>
  );
}
