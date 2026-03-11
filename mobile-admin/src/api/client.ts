import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://213.199.50.129:8001/api';

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.error('[AUTH] 401 Unauthorized:', error.config.url);
      const token = await SecureStore.getItemAsync('userToken');
      console.log('[AUTH] Current token exists:', !!token);
    }
    return Promise.reject(error);
  }
);

export default client;
