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

// GET /api/yalidine/fees?wilaya_id=16&is_stopdesk=0 – Delivery fees
router.get('/fees', async (req, res) => {
  try {
    const { wilaya_id, is_stopdesk, debug } = req.query;
    if (!wilaya_id) return error(res, 'wilaya_id is required', 400);
    const result = await yalidineService.getFees({
      wilayaId: wilaya_id,
      isStopdesk: String(is_stopdesk) === '1' || String(is_stopdesk).toLowerCase() === 'true',
    });
    if (String(debug) === '1') {
      return success(res, { raw: result });
    }
    const payload = result && result.data ? result.data : result;
    const data = Array.isArray(payload) ? payload[0] || {} : payload || {};
    const isStopdesk = String(is_stopdesk) === '1' || String(is_stopdesk).toLowerCase() === 'true';
    const price = isStopdesk
      ? data.stopdesk_price ?? data.stopdesk ?? data.stop_desk_price ?? data.price
      : data.home_price ?? data.home ?? data.domicile_price ?? data.price;

    success(res, { price: typeof price === 'number' ? price : Number(price) || 0 });
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
  success(res, yalidineService.getConfigStatus());
});

module.exports = router;
