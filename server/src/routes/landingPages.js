const express = require('express');
const router = express.Router();
const { db } = require('../db/connection');
const { success, error } = require('../utils/response');

async function fetchProductWithVariants(productId) {
  const productResult = await db.execute({
    sql: 'SELECT * FROM products WHERE id = ?',
    args: [productId],
  });
  if (productResult.rows.length === 0) return null;

  const row = productResult.rows[0];
  const variantsResult = await db.execute({
    sql: 'SELECT id, color, size, quantity, image FROM product_variants WHERE product_id = ? ORDER BY color, size',
    args: [productId],
  });

  const imagesResult = await db.execute({
    sql: 'SELECT color_key, image_url FROM product_images WHERE product_id = ? ORDER BY color_key, sort_order',
    args: [productId],
  });
  const colorImages = {};
  for (const img of imagesResult.rows) {
    const key = img.color_key || '';
    if (!colorImages[key]) colorImages[key] = [];
    colorImages[key].push(img.image_url);
  }

  return {
    id: row.id,
    model_name: row.model_name,
    category: row.category,
    selling_price: row.selling_price,
    promotion_price: row.promotion_price ?? null,
    description: row.description || null,
    image: row.image,
    variants: variantsResult.rows,
    color_images: colorImages,
  };
}

// GET /api/landing-pages - list all (admin)
router.get('/', async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM landing_pages ORDER BY created_at DESC',
    });
    success(res, result.rows);
  } catch (err) {
    error(res, err.message);
  }
});

// GET /api/landing-pages/:slug - public: get landing page by slug with full product data
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await db.execute({
      sql: 'SELECT * FROM landing_pages WHERE slug = ? AND active = 1',
      args: [slug],
    });

    if (result.rows.length === 0) {
      return error(res, 'Landing page not found', 404);
    }

    const page = result.rows[0];
    const product1 = await fetchProductWithVariants(page.product1_id);
    const product2 = await fetchProductWithVariants(page.product2_id);

    if (!product1 || !product2) {
      return error(res, 'Products not found', 404);
    }

    const p1AllowedIds = page.product1_variants ? JSON.parse(page.product1_variants) : null;
    const p2AllowedIds = page.product2_variants ? JSON.parse(page.product2_variants) : null;

    if (p1AllowedIds && product1) {
      product1.variants = product1.variants.filter(v => p1AllowedIds.includes(v.id));
    }
    if (p2AllowedIds && product2) {
      product2.variants = product2.variants.filter(v => p2AllowedIds.includes(v.id));
    }

    success(res, {
      id: page.id,
      slug: page.slug,
      title: page.title,
      subtitle: page.subtitle,
      offer_price: page.offer_price,
      original_price: page.original_price,
      image: page.image,
      product1_image: page.product1_image || null,
      product2_image: page.product2_image || null,
      product1_variants: p1AllowedIds,
      product2_variants: p2AllowedIds,
      active: page.active,
      product1,
      product2,
    });
  } catch (err) {
    error(res, err.message);
  }
});

// POST /api/landing-pages - create
router.post('/', async (req, res) => {
  try {
    const { slug, title, subtitle, product1_id, product2_id, offer_price, original_price, image, product1_image, product2_image, product1_variants, product2_variants, active } = req.body;

    if (!slug || !title || !product1_id || !product2_id || offer_price == null) {
      return error(res, 'Missing required fields: slug, title, product1_id, product2_id, offer_price', 400);
    }

    const result = await db.execute({
      sql: `INSERT INTO landing_pages (slug, title, subtitle, product1_id, product2_id, offer_price, original_price, image, product1_image, product2_image, product1_variants, product2_variants, active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        slug,
        title,
        subtitle || null,
        Number(product1_id),
        Number(product2_id),
        Number(offer_price),
        original_price != null ? Number(original_price) : null,
        image || null,
        product1_image || null,
        product2_image || null,
        product1_variants ? JSON.stringify(product1_variants) : null,
        product2_variants ? JSON.stringify(product2_variants) : null,
        active != null ? (active ? 1 : 0) : 1,
      ],
    });

    success(res, { id: Number(result.lastInsertRowid) }, 201);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return error(res, 'A landing page with this slug already exists', 400);
    }
    error(res, err.message);
  }
});

// PUT /api/landing-pages/:id - update
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { slug, title, subtitle, product1_id, product2_id, offer_price, original_price, image, product1_image, product2_image, product1_variants, product2_variants, active } = req.body;

    if (!slug || !title || !product1_id || !product2_id || offer_price == null) {
      return error(res, 'Missing required fields', 400);
    }

    await db.execute({
      sql: `UPDATE landing_pages SET slug = ?, title = ?, subtitle = ?, product1_id = ?, product2_id = ?,
            offer_price = ?, original_price = ?, image = ?, product1_image = ?, product2_image = ?, product1_variants = ?, product2_variants = ?, active = ?, updated_at = datetime('now')
            WHERE id = ?`,
      args: [
        slug,
        title,
        subtitle || null,
        Number(product1_id),
        Number(product2_id),
        Number(offer_price),
        original_price != null ? Number(original_price) : null,
        image || null,
        product1_image || null,
        product2_image || null,
        product1_variants ? JSON.stringify(product1_variants) : null,
        product2_variants ? JSON.stringify(product2_variants) : null,
        active != null ? (active ? 1 : 0) : 1,
        id,
      ],
    });

    success(res, { id });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return error(res, 'A landing page with this slug already exists', 400);
    }
    error(res, err.message);
  }
});

// DELETE /api/landing-pages/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.execute({ sql: 'DELETE FROM landing_pages WHERE id = ?', args: [id] });
    success(res, { deleted: true });
  } catch (err) {
    error(res, err.message);
  }
});

module.exports = router;
