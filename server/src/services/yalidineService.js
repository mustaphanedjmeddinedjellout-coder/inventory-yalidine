/**
 * Yalidine Delivery Service
 * Integrates with https://api.yalidine.app/v1 to create parcels,
 * list wilayas/communes, and track shipments.
 */

const BASE_URL = 'https://api.yalidine.app/v1';
const MIN_REQUEST_INTERVAL_MS = Number(process.env.YALIDINE_MIN_INTERVAL_MS || 1300);

let yalidineQueue = Promise.resolve();
let nextRequestAt = 0;
let pauseUntil = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForQuotaWindow() {
  const now = Date.now();
  const waitMs = Math.max(nextRequestAt, pauseUntil) - now;
  if (waitMs > 0) {
    await sleep(waitMs);
  }
  nextRequestAt = Date.now() + MIN_REQUEST_INTERVAL_MS;
}

function parseQuotaHeader(headersObj, name) {
  const raw = headersObj.get(name);
  if (raw == null || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function updateQuotaPause(headersObj) {
  const now = Date.now();
  const secondLeft = parseQuotaHeader(headersObj, 'x-second-quota-left');
  const minuteLeft = parseQuotaHeader(headersObj, 'x-minute-quota-left');
  const hourLeft = parseQuotaHeader(headersObj, 'x-hour-quota-left');
  const dayLeft = parseQuotaHeader(headersObj, 'x-day-quota-left');

  if (dayLeft === 0) {
    throw new Error('Yalidine daily quota is exhausted. Try again after the daily quota resets.');
  }
  if (hourLeft === 0) {
    throw new Error('Yalidine hourly quota is exhausted. Try again after the hourly quota resets.');
  }
  if (minuteLeft === 0) {
    pauseUntil = Math.max(pauseUntil, now + 61000);
    return;
  }
  if (secondLeft === 0) {
    pauseUntil = Math.max(pauseUntil, now + 1100);
  }
}

function enqueueYalidineRequest(task) {
  const run = yalidineQueue.then(task, task);
  yalidineQueue = run.catch(() => {});
  return run;
}

function toQueryString(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

function getCredentials() {
  return {
    apiId: (process.env.YALIDINE_API_ID || '').trim(),
    apiToken: (process.env.YALIDINE_API_TOKEN || '').trim(),
  };
}

function getConfigStatus() {
  const { apiId, apiToken } = getCredentials();
  const missing = [];
  if (!apiId) missing.push('YALIDINE_API_ID');
  if (!apiToken || apiToken === 'YOUR_TOKEN_HERE' || apiToken.startsWith('REPLACE_WITH_')) {
    missing.push('YALIDINE_API_TOKEN');
  }

  return {
    configured: missing.length === 0,
    missing,
  };
}

function ensureConfigured() {
  const status = getConfigStatus();
  if (!status.configured) {
    throw new Error(`Yalidine is not configured. Missing: ${status.missing.join(', ')}`);
  }
}

function headers() {
  const { apiId, apiToken } = getCredentials();
  return {
    'X-API-ID': apiId,
    'X-API-TOKEN': apiToken,
    'Content-Type': 'application/json',
  };
}

async function performRequest(method, path, body) {
  ensureConfigured();
  const url = `${BASE_URL}${path}`;
  const opts = { method, headers: headers() };
  if (body) opts.body = JSON.stringify(body);

  await waitForQuotaWindow();
  const res = await fetch(url, opts);
  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  updateQuotaPause(res.headers);

  if (res.status === 429) {
    const retryAfterSeconds = Number(res.headers.get('retry-after') || 60);
    const retryAfterMs = Number.isFinite(retryAfterSeconds)
      ? Math.max(1000, retryAfterSeconds * 1000)
      : 60000;
    pauseUntil = Math.max(pauseUntil, Date.now() + retryAfterMs);
    throw new Error(`Yalidine rate limit reached. Retry after ${Math.ceil(retryAfterMs / 1000)} seconds.`);
  }

  if (!res.ok) {
    const msg = typeof data === 'object' ? JSON.stringify(data) : data;
    throw new Error(`Yalidine API error ${res.status}: ${msg}`);
  }
  return data;
}

async function request(method, path, body) {
  return enqueueYalidineRequest(async () => {
    try {
      return await performRequest(method, path, body);
    } catch (err) {
      if (!String(err.message || '').includes('rate limit reached')) {
        throw err;
      }
      await waitForQuotaWindow();
      return performRequest(method, path, body);
    }
  });
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
   * Get delivery fees for a wilaya and method.
   */
  async getFees({ wilayaId, isStopdesk } = {}) {
    if (!wilayaId) throw new Error('wilayaId is required');
    const stopdeskFlag = isStopdesk ? 1 : 0;
    const fromWilayaId = (process.env.YALIDINE_FROM_WILAYA_ID || '').trim() || wilayaId;
    return request(
      'GET',
      `/fees/?from_wilaya_id=${fromWilayaId}&to_wilaya_id=${wilayaId}&is_stopdesk=${stopdeskFlag}`
    );
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
   * Get parcel status history by tracking number.
   */
  async getHistories(tracking, params = {}) {
    const safeTracking = String(tracking || '').trim();
    if (!safeTracking) throw new Error('tracking is required');

    const query = toQueryString(params);
    return request('GET', `/histories/${encodeURIComponent(safeTracking)}${query}`);
  },

  /**
   * List status histories by filters, including comma-separated tracking values.
   */
  async listHistories(params = {}) {
    const query = toQueryString(params);
    return request('GET', `/histories/${query}`);
  },

  /**
   * List parcels by filters (used for account-wide sync flows).
   */
  async getParcels(params = {}) {
    const query = toQueryString(params);
    return request('GET', `/parcels/${query}`);
  },

  /**
   * Fetch all pages of parcels for a given phone number.
   */
  async getAllParcelsByPhone(phone, options = {}) {
    const pageSize = Number(options.pageSize || 100);
    const maxPages = Number(options.maxPages || 5);
    const all = [];
    let page = 1;

    while (page <= maxPages) {
      const result = await this.getParcels({
        contact_phone: phone,
        page,
        page_size: pageSize,
      });

      const rows = Array.isArray(result) ? result : (Array.isArray(result?.data) ? result.data : []);
      all.push(...rows);

      const hasMore = Boolean(result?.has_more) || (rows.length === pageSize);
      if (!hasMore) break;
      page += 1;
    }

    return all;
  },

  /**
   * Check if Yalidine credentials are configured
   */
  isConfigured() {
    return getConfigStatus().configured;
  },

  /**
   * Get config status for diagnostics
   */
  getConfigStatus() {
    return getConfigStatus();
  },
};

module.exports = yalidineService;
