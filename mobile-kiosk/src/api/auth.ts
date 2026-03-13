import client from './client';

export const login = async (data: { email?: string; username?: string; password: string }) => {
    const response = await client.post('/auth/login/', data);
    return response.data;
};

export const getMe = async () => {
    const response = await client.get('/auth/me/');
    return response.data;
};
