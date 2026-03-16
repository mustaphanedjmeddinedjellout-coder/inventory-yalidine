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
  return request('/api/store/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
