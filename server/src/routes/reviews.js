/**
 * Review Media Routes
 * CRUD for customer review images/videos shown on product pages.
 */

const express = require('express');
const router = express.Router();
const { db } = require('../db/connection');
const { success, error } = require('../utils/response');

// GET /api/reviews — public: list all review media (ordered)
router.get('/', async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM review_media ORDER BY sort_order ASC, id DESC',
    });
    success(res, result.rows);
  } catch (err) {
    error(res, err.message);
  }
});

// POST /api/reviews — add a new review media entry
router.post('/', async (req, res) => {
  try {
    const { media_type, src, alt, sort_order } = req.body || {};

    if (!src || !String(src).trim()) {
      return error(res, 'src is required', 400);
    }

    const type = media_type === 'video' ? 'video' : 'image';
    const order = Number(sort_order) || 0;

    const result = await db.execute({
      sql: 'INSERT INTO review_media (media_type, src, alt, sort_order) VALUES (?, ?, ?, ?)',
      args: [type, String(src).trim(), alt || null, order],
    });

    const newId = Number(result.lastInsertRowid);
    const row = await db.execute({ sql: 'SELECT * FROM review_media WHERE id = ?', args: [newId] });
    success(res, row.rows[0], 201);
  } catch (err) {
    error(res, err.message);
  }
});

// PUT /api/reviews/:id — update a review media entry
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { media_type, src, alt, sort_order } = req.body || {};

    const existing = await db.execute({ sql: 'SELECT * FROM review_media WHERE id = ?', args: [id] });
    if (existing.rows.length === 0) return error(res, 'Not found', 404);

    const type = media_type === 'video' ? 'video' : 'image';
    const order = sort_order != null ? Number(sort_order) : existing.rows[0].sort_order;
    const newSrc = src ? String(src).trim() : existing.rows[0].src;
    const newAlt = alt !== undefined ? (alt || null) : existing.rows[0].alt;

    await db.execute({
      sql: 'UPDATE review_media SET media_type = ?, src = ?, alt = ?, sort_order = ? WHERE id = ?',
      args: [type, newSrc, newAlt, order, id],
    });

    const row = await db.execute({ sql: 'SELECT * FROM review_media WHERE id = ?', args: [id] });
    success(res, row.rows[0]);
  } catch (err) {
    error(res, err.message);
  }
});

// DELETE /api/reviews/:id — remove a review media entry
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await db.execute({ sql: 'SELECT * FROM review_media WHERE id = ?', args: [id] });
    if (existing.rows.length === 0) return error(res, 'Not found', 404);

    await db.execute({ sql: 'DELETE FROM review_media WHERE id = ?', args: [id] });
    success(res, { message: 'تم الحذف بنجاح' });
  } catch (err) {
    error(res, err.message);
  }
});

module.exports = router;
