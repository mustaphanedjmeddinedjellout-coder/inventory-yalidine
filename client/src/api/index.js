import api from './client';

export const productApi = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getForOrder: () => api.get('/products/for-order'),
  getLowStock: (threshold) => api.get('/products/low-stock', { params: { threshold } }),
  runStockSql: (sql) =>
    api.post(
      '/products/stock-sql',
      { sql },
      { headers: { 'X-ADMIN-PASSWORD': import.meta.env.VITE_ADMIN_PASSWORD || '' } }
    ),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  uploadImage: (formData) =>
    api.post('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    }),
};

export const orderApi = {
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.post(`/orders/${id}/update`, data),
  approve: (id) => api.post(`/orders/${id}/approve`),
  syncStatus: (id) => api.post(`/orders/${id}/sync-status`),
  getTrackingHistory: (id) => api.get(`/orders/${id}/tracking-history`),
  syncOld: () => api.post('/orders/sync-old'),
  syncByPhone: (phone) => api.post('/orders/sync-by-phone', phone ? { phone } : {}),
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
  getHistories: (tracking) => api.get(`/yalidine/histories/${tracking}`),
  getStatus: () => api.get('/yalidine/status'),
};

export const reviewApi = {
  getAll: () => api.get('/reviews'),
  create: (data) => api.post('/reviews', data),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
};

export const landingPageApi = {
  getAll: () => api.get('/landing-pages'),
  getBySlug: (slug) => api.get(`/landing-pages/${slug}`),
  create: (data) => api.post('/landing-pages', data),
  update: (id, data) => api.put(`/landing-pages/${id}`, data),
  delete: (id) => api.delete(`/landing-pages/${id}`),
};
