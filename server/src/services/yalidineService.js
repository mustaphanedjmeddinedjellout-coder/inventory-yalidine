/**
 * Yalidine Delivery Service
 * Integrates with https://api.yalidine.app/v1 to create parcels,
 * list wilayas/communes, and track shipments.
 */

const BASE_URL = 'https://api.yalidine.app/v1';
const API_ID = process.env.YALIDINE_API_ID || '';
const API_TOKEN = process.env.YALIDINE_API_TOKEN || '';

function headers() {
  return {
    'X-API-ID': API_ID,
    'X-API-TOKEN': API_TOKEN,
    'Content-Type': 'application/json',
  };
}

async function request(method, path, body) {
  const url = `${BASE_URL}${path}`;
  const opts = { method, headers: headers() };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = typeof data === 'object' ? JSON.stringify(data) : data;
    throw new Error(`Yalidine API error ${res.status}: ${msg}`);
  }
  return data;
}

const yalidineService = {
  /**
   * Get all 58 Algerian wilayas
   */
  async getWilayas() {
    return request('GET', '/wilayas/');
  },

  /**
   * Get communes for a wilaya (by wilaya_id)
   * Only returns deliverable communes, page_size=200 covers any single wilaya.
   */
  async getCommunes(wilayaId) {
    return request('GET', `/communes/?page=1&page_size=200&is_deliverable=true&wilaya_id=${wilayaId}`);
  },

  /**
   * Get stop-desk centers, optionally filtered by wilaya and/or commune.
   * Response: { has_more, total_data, data: [{ center_id, name, address, gps, commune_id, commune_name, wilaya_id, wilaya_name }] }
   */
  async getCenters({ wilayaId, communeId } = {}) {
    const params = [];
    if (wilayaId) params.push(`wilaya_id=${wilayaId}`);
    if (communeId) params.push(`commune_id=${communeId}`);
    params.push('page_size=200');
    return request('GET', `/centers/?${params.join('&')}`);
  },

  /**
   * Create a parcel (shipment) for an order.
   * @param {Object} order – the order object from DB (must have customer/shipping fields)
   * @param {string} productList – description of products in the parcel
   * @returns {Object} Yalidine parcel response
   */
  async createParcel(order, productList) {
    const fromWilaya = process.env.YALIDINE_FROM_WILAYA || 'Alger';

    const parcel = {
      order_id: order.order_number,
      from_wilaya_name: fromWilaya,
      firstname: order.firstname,
      familyname: order.familyname,
      contact_phone: order.contact_phone,
      address: order.address,
      to_commune_name: order.to_commune_name,
      to_wilaya_name: order.to_wilaya_name,
      product_list: productList,
      price: order.yalidine_price != null ? Math.round(order.yalidine_price) : Math.round(order.total_amount),
      do_insurance: false,
      declared_value: order.yalidine_price != null ? Math.round(order.yalidine_price) : Math.round(order.total_amount),
      length: 30,
      width: 20,
      height: 10,
      weight: 0.5,
      freeshipping: true,
      is_stopdesk: order.is_stopdesk ? true : false,
      has_exchange: false,
      product_to_collect: null,
    };

    // Yalidine expects an array of parcels
    const result = await request('POST', '/parcels/', [parcel]);
    return result;
  },

  /**
   * Get parcel tracking by tracking number
   */
  async getTracking(tracking) {
    return request('GET', `/parcels/${tracking}/`);
  },

  /**
   * Check if Yalidine credentials are configured
   */
  isConfigured() {
    return API_ID && API_TOKEN && API_TOKEN !== 'YOUR_TOKEN_HERE';
  },
};

module.exports = yalidineService;
