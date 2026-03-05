import client from './client';

export const checkInVisitor = async (data: any) => {
    const response = await client.post('/visitors/', data);
    return response.data;
};

export const checkOutVisitor = async (id: number) => {
    const response = await client.post(`/visitors/${id}/checkout/`);
    return response.data;
};

export const getActiveVisitors = async () => {
    const response = await client.get('/visitors/active/');
    return response.data;
};

export const searchVisitor = async (query: string) => {
    const response = await client.get(`/visitors/search/?query=${query}`);
    return response.data;
};

export const getLocations = async () => {
    const response = await client.get('/locations/');
    return response.data.results || response.data;
};

export const getHosts = async (locationId: number) => {
    const response = await client.get(`/hosts/?location=${locationId}`);
    return response.data.results || response.data;
};
