export function formatDzd(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US').format(amount) + ' DZD';
}

export function getPromotionPrice(product) {
  const promotion = Number(product?.promotion_price ?? 0);
  const regular = Number(product?.selling_price ?? 0);
  if (!Number.isFinite(promotion) || promotion <= 0 || promotion >= regular) return null;
  return promotion;
}

export function getEffectivePrice(product) {
  return getPromotionPrice(product) ?? Number(product?.selling_price || 0);
}

export function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

export function slugForProduct(product) {
  return `${slugify(product.model_name || 'item')}-${product.id}`;
}

export function extractIdFromSlug(slug) {
  const match = slug.match(/-(\d+)$/);
  if (match) return match[1];
  if (/^\d+$/.test(slug)) return slug;
  return null;
}

export function resolveImageUrl(image) {
  if (!image) return '/placeholder-product.svg';
  if (image.startsWith('http') || image.startsWith('/')) return image;
  return `/${image}`;
}

export function isTshirtCategory(category) {
  const c = String(category || '').trim().toLowerCase();
  return c.includes('t-shirt') || c.includes('tshirt');
}

export function isPantsCategory(category) {
  const c = String(category || '').trim().toLowerCase();
  return c.includes('pants') || c.includes('pantalon');
}

export const BUNDLE_DISCOUNT_RATE = 0.10;

export function calculateBundleDiscount(items) {
  const hasTshirt = items.some((item) => isTshirtCategory(item.category));
  const hasPants = items.some((item) => isPantsCategory(item.category));
  if (hasTshirt && hasPants) {
    const pantsTotal = items
      .filter((item) => isPantsCategory(item.category))
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
    return Math.round(pantsTotal * BUNDLE_DISCOUNT_RATE);
  }
  return 0;
}

function readCookie(name) {
  if (typeof document === 'undefined') return '';
  const match = (document.cookie || '').split('; ').find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : '';
}

// Remember the Facebook click ID from the ad URL, so it is still available at checkout
// even if the visitor browsed other pages first.
export function captureFbclid() {
  if (typeof window === 'undefined') return;
  const fbclid = new URLSearchParams(window.location.search || '').get('fbclid');
  if (!fbclid) return;
  try {
    localStorage.setItem('meta_fbc', `fb.1.${Date.now()}.${fbclid}`);
  } catch {
    // Ignore storage errors.
  }
}

// Browser identifiers Meta uses to match server (Conversions API) events to ad clicks.
export function getMetaTracking() {
  let storedFbc = '';
  try {
    storedFbc = localStorage.getItem('meta_fbc') || '';
  } catch {
    storedFbc = '';
  }
  return {
    fbp: readCookie('_fbp'),
    fbc: readCookie('_fbc') || storedFbc,
  };
}
