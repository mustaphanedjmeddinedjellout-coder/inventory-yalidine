/**
 * Yalidine Routes
 * Proxies wilaya/commune lookups and parcel tracking from Yalidine API.
 */

const express = require('express');
const router = express.Router();
const yalidineService = require('../services/yalidineService');
const { success, error } = require('../utils/response');

// GET /api/yalidine/wilayas – List all 58 Algerian wilayas
router.get('/wilayas', async (req, res) => {
  try {
    const result = await yalidineService.getWilayas();
    // Yalidine wraps arrays in { data: [...], has_more, total_data }
    const wilayas = result && result.data ? result.data : result;
    success(res, Array.isArray(wilayas) ? wilayas : []);
  } catch (err) {
    error(res, err.message);
  }
});

// GET /api/yalidine/communes?wilaya_id=16 – List communes for a wilaya
router.get('/communes', async (req, res) => {
  try {
    const { wilaya_id } = req.query;
    if (!wilaya_id) return error(res, 'wilaya_id is required', 400);
    const result = await yalidineService.getCommunes(wilaya_id);
    const communes = result && result.data ? result.data : result;
    success(res, Array.isArray(communes) ? communes : []);
  } catch (err) {
    error(res, err.message);
  }
});

// GET /api/yalidine/centers?wilaya_id=16&commune_id=1601 – List stop-desk centers
router.get('/centers', async (req, res) => {
  try {
    const { wilaya_id, commune_id } = req.query;
    if (!wilaya_id) return error(res, 'wilaya_id is required', 400);
    const result = await yalidineService.getCenters({ wilayaId: wilaya_id, communeId: commune_id });
    const centers = result && result.data ? result.data : result;
    success(res, Array.isArray(centers) ? centers : []);
  } catch (err) {
    error(res, err.message);
  }
});

// GET /api/yalidine/tracking/:tracking – Get parcel tracking info
router.get('/tracking/:tracking', async (req, res) => {
  try {
    const data = await yalidineService.getTracking(req.params.tracking);
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
});

// GET /api/yalidine/status – Check if Yalidine is configured
router.get('/status', (req, res) => {
  success(res, { configured: yalidineService.isConfigured() });
});

module.exports = router;
