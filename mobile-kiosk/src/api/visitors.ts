import client from './client';

export const checkInVisitor = async (data: any) => {
    const response = await client.post('/visitors/', data);
    return response.data;
};

export const checkOutVisitor = async (idOrEmail: string) => {
    // If it's a numeric ID, we can use the detail endpoint
    // But usually kiosks work by email or phone search for checkout
    const response = await client.post(`/visitors/search/?query=${idOrEmail}`);
    const visitor = response.data;
    const checkoutResponse = await client.post(`/visitors/${visitor.id}/checkout/`);
    return checkoutResponse.data;
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
