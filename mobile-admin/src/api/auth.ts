import client from './client';
import * as SecureStore from 'expo-secure-store';

export const login = async (username: string, password: string) => {
    try {
        const response = await client.post('/auth/login/', { username, password });
        const { access, refresh } = response.data;
        await SecureStore.setItemAsync('userToken', access);
        await SecureStore.setItemAsync('refreshToken', refresh);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const logout = async () => {
    try {
        const refresh = await SecureStore.getItemAsync('refreshToken');
        await client.post('/auth/logout/', { refresh });
        await SecureStore.deleteItemAsync('userToken');
        await SecureStore.deleteItemAsync('refreshToken');
    } catch (error) {
        // Even if logout fails on server, clear local tokens
        await SecureStore.deleteItemAsync('userToken');
        await SecureStore.deleteItemAsync('refreshToken');
    }
};

export const getProfile = async () => {
    const response = await client.get('/auth/me/');
    const { user, profile } = response.data;
    // Flatten the nested response into the shape auth utilities expect
    return {
        user_id: user.id,
        username: user.username,
        email: user.email,
        role: profile.role,
        ...profile,
    };
};
