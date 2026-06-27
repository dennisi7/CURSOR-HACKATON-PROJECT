import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cb_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token invalid/expired - clear and let the app redirect to login.
      localStorage.removeItem('cb_token');
      localStorage.removeItem('cb_user');
    }
    return Promise.reject(error);
  }
);

export function apiError(err, fallback = 'Something went wrong.') {
  return err?.response?.data?.message || fallback;
}

export default api;
