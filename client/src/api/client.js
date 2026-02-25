/**
 * Axios API client - centralized HTTP configuration
 */
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Response interceptor: unwrap data
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error || 'حدث خطأ في الاتصال بالخادم';
    return Promise.reject(new Error(message));
  }
);

export default api;
