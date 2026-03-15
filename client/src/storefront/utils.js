export function formatDzd(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US').format(amount) + ' DZD';
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
  if (!image) return 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200';
  if (image.startsWith('http')) return image;
  if (image.startsWith('/')) return image;
  return `/${image}`;
}
