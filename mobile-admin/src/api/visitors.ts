import client from './client';

export const getVisitors = async () => {
    const response = await client.get('/visitors/');
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

export const getHosts = async (locationId?: number) => {
    const response = await client.get('/hosts/', { params: { location: locationId } });
    return response.data;
};
