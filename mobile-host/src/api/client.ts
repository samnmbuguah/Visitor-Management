import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// API URL: Use env var if set, otherwise default to host machine IP
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://213.199.50.129:8001/api';

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
            console.warn('[AUTH] 401 Unauthorized, clearing session...');
            await SecureStore.deleteItemAsync('userToken');
        }
        return Promise.reject(error);
    }
);

export default client;
