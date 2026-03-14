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

// For Kiosk app, we might use a fixed Kiosk Token instead of user login
// But we'll keep the base client structure for consistency
client.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('kiosk_token');
    // Only send token if it exists and looks like a real JWT (has dots)
    // Avoid sending 'kiosk_authenticated' dummy token which triggers 401 on backend
    if (token && token.includes('.')) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor to handle 401s
client.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            console.warn('Unauthorized request, clearing session...');
            await SecureStore.deleteItemAsync('kiosk_token');
            // We can't easily redirect from here without access to router
            // But clearing the token will trigger redirect on the next check
        }
        return Promise.reject(error);
    }
);

export default client;
