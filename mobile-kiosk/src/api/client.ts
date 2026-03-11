import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://213.199.50.129:8001/api';

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
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default client;
