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
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return Math.round(subtotal * BUNDLE_DISCOUNT_RATE);
  }
  return 0;
}
