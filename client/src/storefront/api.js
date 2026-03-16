async function request(path, options) {
  const res = await fetch(path, options);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  const data = await res.json();
  return data.data ?? data;
}

export function fetchProducts() {
  return request('/api/store/products');
}

export function fetchProductById(id) {
  return request(`/api/store/products/${id}`);
}

export function submitCheckout(payload) {
  const storeKey = import.meta.env.VITE_STORE_API_KEY;
  return request('/api/store/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(storeKey ? { 'X-STORE-KEY': storeKey } : {}),
    },
    body: JSON.stringify(payload),
  });
}

export function fetchWilayas() {
  return request('/api/yalidine/wilayas');
}

export function fetchCommunes(wilayaId) {
  return request(`/api/yalidine/communes?wilaya_id=${wilayaId}`);
}

export function fetchDeliveryFees({ wilayaId, isStopdesk }) {
  const stopdesk = isStopdesk ? 1 : 0;
  return request(`/api/yalidine/fees?wilaya_id=${wilayaId}&is_stopdesk=${stopdesk}`);
}

export function fetchCenters({ wilayaId, communeId }) {
  if (!wilayaId) return Promise.resolve([]);
  const params = new URLSearchParams();
  params.set('wilaya_id', wilayaId);
  if (communeId) params.set('commune_id', communeId);
  return request(`/api/yalidine/centers?${params.toString()}`);
}
