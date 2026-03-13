import client from './client';

export const login = async (data: { email?: string; username?: string; password: string }) => {
    // Django REST Framework SimpleJWT expects the credential in the "username" field,
    // even if it contains an email address.
    const payload = {
        username: data.email || data.username,
        password: data.password
    };
    const response = await client.post('/auth/login/', payload);
    return response.data;
};

export const getMe = async () => {
    const response = await client.get('/auth/me/');
    return response.data;
};
