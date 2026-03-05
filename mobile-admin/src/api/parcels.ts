import client from './client';

export interface Parcel {
    id: number;
    recipient: number;
    recipient_name: string;
    location: number;
    location_name: string;
    courier: string;
    tracking_number: string;
    received_at: string;
    status: 'RECEIVED' | 'NOTIFIED' | 'COLLECTED';
    photo?: string;
    signature_required: boolean;
    collected_at?: string;
    collection_signature?: string;
}

export const logParcel = async (data: Partial<Parcel>) => {
    const response = await client.post('/parcels/', data);
    return response.data;
};

export const getParcels = async (params?: any) => {
    const response = await client.get('/parcels/', { params });
    return response.data;
};

export const collectParcel = async (id: number, signature: string) => {
    const response = await client.post(`/parcels/${id}/collect/`, { collection_signature: signature });
    return response.data;
};

export const notifyRecipient = async (id: number) => {
    const response = await client.post(`/parcels/${id}/notify/`);
    return response.data;
};
