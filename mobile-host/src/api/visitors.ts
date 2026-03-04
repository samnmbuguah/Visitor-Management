import client from './client';

export const getPendingVisitors = async () => {
    const response = await client.get('/visitors/?status=PENDING');
    return response.data.results || response.data;
};

export const approveVisitor = async (id: number) => {
    const response = await client.post(`/visitors/${id}/approve/`);
    return response.data;
};

export const rejectVisitor = async (id: number) => {
    const response = await client.post(`/visitors/${id}/reject/`);
    return response.data;
};

export const getMyVisitors = async () => {
    const response = await client.get('/visitors/');
    return response.data.results || response.data;
};

export const createInvite = async (data: any) => {
    const response = await client.post('/pre-registrations/', data);
    return response.data;
};
