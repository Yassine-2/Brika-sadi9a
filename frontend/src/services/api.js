import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login/json', data),
  getMe: () => api.get('/auth/me'),
  getModes: () => api.get('/auth/modes'),
};

// Products API
export const productsAPI = {
  getAll: (params) => api.get('/products/', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getByQR: (qrCode) => api.get(`/products/qr/${qrCode}`),
  create: (data) => api.post('/products/', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  updateQuantity: (id, change) => api.put(`/products/${id}/quantity?quantity_change=${change}`),
  delete: (id) => api.delete(`/products/${id}`),
  addPosition: (id, data) => api.post(`/products/${id}/positions`, data),
};

// Tasks API
export const tasksAPI = {
  getAll: (params) => api.get('/tasks/', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks/', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  addItem: (taskId, data) => api.post(`/tasks/${taskId}/items`, data),
  updateItem: (taskId, itemId, data) => api.put(`/tasks/${taskId}/items/${itemId}`, data),
  completeItem: (taskId, itemId) => api.post(`/tasks/${taskId}/items/${itemId}/complete`),
  deleteItem: (taskId, itemId) => api.delete(`/tasks/${taskId}/items/${itemId}`),
};

// Raspberry Pi API
export const raspberryPiAPI = {
  getDevices: (params) => api.get('/raspberry-pi/devices', { params }),
  getDevice: (deviceId) => api.get(`/raspberry-pi/devices/${deviceId}`),
  registerDevice: (data) => api.post('/raspberry-pi/devices', data),
  updateDevice: (deviceId, data) => api.put(`/raspberry-pi/devices/${deviceId}`, data),
  deleteDevice: (deviceId) => api.delete(`/raspberry-pi/devices/${deviceId}`),
  sendCommand: (data) => api.post('/raspberry-pi/command', data),
};

export default api;
