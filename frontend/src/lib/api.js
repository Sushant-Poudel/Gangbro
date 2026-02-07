import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_URL = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

export const uploadAPI = {
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadPaymentImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/payment', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getImageUrl: (path) => `${BACKEND_URL}${path}`,
};

export const productsAPI = {
  getAll: (categoryId = null, activeOnly = true) => {
    const params = new URLSearchParams();
    if (categoryId) params.append('category_id', categoryId);
    if (activeOnly) params.append('active_only', 'true');
    return api.get(`/products?${params.toString()}`);
  },
  getOne: (id) => api.get(`/products/${id}`),
  getRelated: (id, limit = 4) => api.get(`/products/${id}/related?limit=${limit}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  reorder: (productIds) => api.put('/products/reorder', { product_ids: productIds }),
};

export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

export const reviewsAPI = {
  getAll: () => api.get('/reviews'),
  create: (data) => api.post('/reviews', data),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
  syncTrustpilot: () => api.post('/reviews/sync-trustpilot'),
  getTrustpilotStatus: () => api.get('/reviews/trustpilot-status'),
};

export const faqsAPI = {
  getAll: () => api.get('/faqs'),
  create: (data) => api.post('/faqs', data),
  update: (id, data) => api.put(`/faqs/${id}`, data),
  delete: (id) => api.delete(`/faqs/${id}`),
  reorder: (faqIds) => api.put('/faqs/reorder', faqIds),
};

export const pagesAPI = {
  get: (pageKey) => api.get(`/pages/${pageKey}`),
  update: (pageKey, title, content) =>
    api.put(`/pages/${pageKey}?title=${encodeURIComponent(title)}&content=${encodeURIComponent(content)}`),
};

export const socialLinksAPI = {
  getAll: () => api.get('/social-links'),
  create: (data) => api.post('/social-links', data),
  update: (id, data) => api.put(`/social-links/${id}`, data),
  delete: (id) => api.delete(`/social-links/${id}`),
};

export const seedAPI = {
  seed: () => api.post('/seed'),
  clearProducts: () => api.post('/clear-products'),
};

export const ordersAPI = {
  create: (data) => api.post('/orders/create', data),
  getAll: () => api.get('/orders'),
  uploadPaymentScreenshot: (orderId, screenshotUrl, paymentMethod) =>
    api.post(`/orders/${orderId}/payment-screenshot`, { screenshot_url: screenshotUrl, payment_method: paymentMethod }),
};

export const promoCodesAPI = {
  getAll: () => api.get('/promo-codes'),
  create: (data) => api.post('/promo-codes', data),
  update: (id, data) => api.put(`/promo-codes/${id}`, data),
  delete: (id) => api.delete(`/promo-codes/${id}`),
  validate: (code, subtotal) => api.post(`/promo-codes/validate?code=${encodeURIComponent(code)}&subtotal=${subtotal}`),
};

export const contactsAPI = {
  getAll: () => api.get('/contacts'),
  getAllAdmin: () => api.get('/contacts/all'),
  create: (data) => api.post('/contacts', data),
  update: (id, data) => api.put(`/contacts/${id}`, data),
  delete: (id) => api.delete(`/contacts/${id}`),
};

export const paymentMethodsAPI = {
  getAll: () => api.get('/payment-methods'),
  getAllAdmin: () => api.get('/payment-methods/all'),
  create: (data) => api.post('/payment-methods', data),
  update: (id, data) => api.put(`/payment-methods/${id}`, data),
  delete: (id) => api.delete(`/payment-methods/${id}`),
};

export const notificationBarAPI = {
  get: () => api.get('/notification-bar'),
  update: (data) => api.put('/notification-bar', data),
};

export const blogAPI = {
  getAll: () => api.get('/blog'),
  getOne: (slug) => api.get(`/blog/${slug}`),
  getAllAdmin: () => api.get('/blog/all/admin'),
  create: (data) => api.post('/blog', data),
  update: (id, data) => api.put(`/blog/${id}`, data),
  delete: (id) => api.delete(`/blog/${id}`),
};

export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

export const bundlesAPI = {
  getAll: () => api.get('/bundles'),
  getAllAdmin: () => api.get('/bundles/all'),
  create: (data) => api.post('/bundles', data),
  update: (id, data) => api.put(`/bundles/${id}`, data),
  delete: (id) => api.delete(`/bundles/${id}`),
};

export const recentPurchasesAPI = {
  get: (limit = 10) => api.get(`/recent-purchases?limit=${limit}`),
};

// ==================== WISHLIST ====================
export const wishlistAPI = {
  get: (visitorId) => api.get(`/wishlist/${visitorId}`),
  add: (data) => api.post('/wishlist', data),
  remove: (visitorId, productId, variationId = null) => {
    const url = variationId 
      ? `/wishlist/${visitorId}/${productId}?variation_id=${variationId}`
      : `/wishlist/${visitorId}/${productId}`;
    return api.delete(url);
  },
  updateEmail: (visitorId, email) => api.put(`/wishlist/${visitorId}/email?email=${encodeURIComponent(email)}`),
};

// ==================== ORDER TRACKING ====================
export const orderTrackingAPI = {
  track: (orderId) => api.get(`/orders/track/${orderId}`),
  updateStatus: (orderId, data) => api.put(`/orders/${orderId}/status`, data),
  getDetails: (orderId) => api.get(`/orders/${orderId}`),
};

// ==================== ANALYTICS ====================
export const analyticsAPI = {
  getOverview: () => api.get('/analytics/overview'),
  getTopProducts: (limit = 10) => api.get(`/analytics/top-products?limit=${limit}`),
  getRevenueChart: (days = 30) => api.get(`/analytics/revenue-chart?days=${days}`),
  getOrderStatus: () => api.get('/analytics/order-status'),
};

// ==================== SEO ====================
export const seoAPI = {
  getMeta: (pageType, slug) => api.get(`/seo/meta/${pageType}/${slug}`),
  getSitemap: () => api.get('/sitemap.xml'),
};

// Trustpilot invitation utility
export const sendTrustpilotInvitation = (orderData) => {
  if (typeof window !== 'undefined' && typeof window.tp === 'function') {
    try {
      const invitation = {
        recipientEmail: orderData.email,
        recipientName: orderData.name,
        referenceId: orderData.orderId,
        source: 'InvitationScript',
        productSkus: orderData.products?.map(p => p.sku) || [orderData.orderId],
        products: orderData.products || [{
          sku: orderData.orderId,
          productUrl: `${window.location.origin}/product/${orderData.productSlug}`,
          imageUrl: orderData.productImage,
          name: orderData.productName,
        }],
      };
      window.tp('createInvitation', invitation);
      console.log('Trustpilot invitation sent:', invitation);
      return true;
    } catch (error) {
      console.error('Trustpilot invitation error:', error);
      return false;
    }
  }
  console.warn('Trustpilot not loaded. window.tp:', typeof window.tp);
  return false;
};

export default api;
