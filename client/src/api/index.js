import api from './client';

export const productApi = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getForOrder: () => api.get('/products/for-order'),
  getLowStock: (threshold) => api.get('/products/low-stock', { params: { threshold } }),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

export const orderApi = {
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  delete: (id) => api.delete(`/orders/${id}`),
};

export const analyticsApi = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getRevenue: (params) => api.get('/analytics/revenue', { params }),
  getTopProducts: (params) => api.get('/analytics/top-products', { params }),
  getCategories: (params) => api.get('/analytics/categories', { params }),
  getMonthly: (year) => api.get('/analytics/monthly', { params: { year } }),
};

export const yalidineApi = {
  getWilayas: () => api.get('/yalidine/wilayas'),
  getCommunes: (wilaya_id) => api.get('/yalidine/communes', { params: { wilaya_id } }),
  getCenters: (wilaya_id, commune_id) => api.get('/yalidine/centers', { params: { wilaya_id, commune_id } }),
  getTracking: (tracking) => api.get(`/yalidine/tracking/${tracking}`),
  getStatus: () => api.get('/yalidine/status'),
};
