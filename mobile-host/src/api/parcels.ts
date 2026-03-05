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

export const getMyParcels = async () => {
    const response = await client.get('/parcels/');
    return response.data;
};

export const collectParcel = async (id: number, signature: string) => {
    const response = await client.post(`/parcels/${id}/collect/`, { collection_signature: signature });
    return response.data;
};
