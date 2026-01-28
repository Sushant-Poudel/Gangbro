import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_URL = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Upload API
export const uploadAPI = {
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getImageUrl: (path) => `${BACKEND_URL}${path}`,
};

// Products API
export const productsAPI = {
  getAll: (categoryId = null, activeOnly = true) => {
    const params = new URLSearchParams();
    if (categoryId) params.append('category_id', categoryId);
    if (activeOnly) params.append('active_only', 'true');
    return api.get(`/products?${params.toString()}`);
  },
  getOne: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

// Categories API
export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Reviews API
export const reviewsAPI = {
  getAll: () => api.get('/reviews'),
  create: (data) => api.post('/reviews', data),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
};

// FAQ API
export const faqsAPI = {
  getAll: () => api.get('/faqs'),
  create: (data) => api.post('/faqs', data),
  update: (id, data) => api.put(`/faqs/${id}`, data),
  delete: (id) => api.delete(`/faqs/${id}`),
  reorder: (faqIds) => api.put('/faqs/reorder', faqIds),
};

// Pages API
export const pagesAPI = {
  get: (pageKey) => api.get(`/pages/${pageKey}`),
  update: (pageKey, title, content) => 
    api.put(`/pages/${pageKey}?title=${encodeURIComponent(title)}&content=${encodeURIComponent(content)}`),
};

// Social Links API
export const socialLinksAPI = {
  getAll: () => api.get('/social-links'),
  create: (data) => api.post('/social-links', data),
  update: (id, data) => api.put(`/social-links/${id}`, data),
  delete: (id) => api.delete(`/social-links/${id}`),
};

// Seed API
export const seedAPI = {
  seed: () => api.post('/seed'),
  clearProducts: () => api.post('/clear-products'),
};

export default api;
