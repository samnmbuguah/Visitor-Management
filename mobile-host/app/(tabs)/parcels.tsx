import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ActivityIndicator, FlatList, Modal } from 'react-native';
import { Package, LogOut, CheckCircle, Clock, PenTool, X } from 'lucide-react-native';
import SignatureCanvas from 'react-native-signature-canvas';
import { getMyParcels, collectParcel } from '../../src/api/parcels';

export default function MyParcelsScreen() {
    const [parcels, setParcels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedParcel, setSelectedParcel] = useState<any>(null);
    const [isSigning, setIsSigning] = useState(false);
    const signatureRef = useRef<any>(null);

    useEffect(() => {
        fetchParcels();
    }, []);

    const fetchParcels = async () => {
        try {
            const data = await getMyParcels();
            setParcels(data.results || data);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch parcels');
        } finally {
            setLoading(false);
        }
    };

    const handleSignature = async (signature: string) => {
        if (!selectedParcel) return;

        setLoading(true);
        try {
            await collectParcel(selectedParcel.id, signature);
            Alert.alert('Success', 'Parcel marked as collected');
            setIsSigning(false);
            setSelectedParcel(null);
            fetchParcels();
        } catch (error) {
            Alert.alert('Error', 'Failed to save signature');
        } finally {
            setLoading(false);
        }
    };

    const renderParcel = ({ item }: { item: any }) => (
        <View style={styles.parcelCard}>
            <View style={styles.iconContainer}>
                <Package color={item.status === 'COLLECTED' ? '#10b981' : '#f59e0b'} size={32} />
            </View>
            <View style={styles.infoContainer}>
                <Text style={styles.courierText}>{item.courier}</Text>
                <Text style={styles.statusText}>{item.status}</Text>
                <Text style={styles.dateText}>Received: {new Date(item.received_at).toLocaleDateString()}</Text>
            </View>
            {item.status !== 'COLLECTED' && (
                <TouchableOpacity
                    style={styles.collectButton}
                    onPress={() => {
                        setSelectedParcel(item);
                        setIsSigning(true);
                    }}
                >
                    <PenTool color="#fff" size={20} />
                    <Text style={styles.collectButtonText}>Collect</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const style = `.m-signature-pad--footer {display: none; margin: 0px;}`;

    return (
        <View style={styles.container}>
            <FlatList
                data={parcels}
                renderItem={renderParcel}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshing={loading}
                onRefresh={fetchParcels}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <CheckCircle color="#065f46" size={64} />
                        <Text style={styles.emptyText}>You're all caught up! No pending parcels.</Text>
                    </View>
                }
            />

            <Modal visible={isSigning} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Signature Required</Text>
                        <TouchableOpacity onPress={() => setIsSigning(false)}>
                            <X color="#fff" size={24} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.modalSubtitle}>Please sign below to confirm collection of your {selectedParcel?.courier} parcel.</Text>

                    <View style={styles.signatureContainer}>
                        <SignatureCanvas
                            ref={signatureRef}
                            onOK={handleSignature}
                            descriptionText="Sign here"
                            webStyle={style}
                        />
                    </View>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.clearButton} onPress={() => signatureRef.current?.clearCanvas()}>
                            <Text style={styles.clearButtonText}>Clear</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmButton} onPress={() => signatureRef.current?.readSignature()}>
                            <Text style={styles.confirmButtonText}>Confirm Collection</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#064e3b',
    },
    listContent: {
        padding: 20,
    },
    parcelCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#065f46',
        borderRadius: 16,
        padding: 20,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#064e3b',
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: '#064e3f',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    infoContainer: {
        flex: 1,
    },
    courierText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    statusText: {
        fontSize: 14,
        color: '#f59e0b',
        fontWeight: '600',
        marginTop: 2,
    },
    dateText: {
        fontSize: 12,
        color: '#a7f3d0',
        marginTop: 4,
    },
    collectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10b981',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 10,
    },
    collectButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 150,
    },
    emptyText: {
        color: '#a7f3d0',
        fontSize: 16,
        marginTop: 20,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#064e3b',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 25,
        paddingTop: 60,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
    },
    modalSubtitle: {
        color: '#a7f3d0',
        paddingHorizontal: 25,
        marginBottom: 20,
    },
    signatureContainer: {
        flex: 1,
        margin: 20,
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 20,
        gap: 15,
        marginBottom: 30,
    },
    clearButton: {
        flex: 1,
        height: 60,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#a7f3d0',
    },
    clearButtonText: {
        color: '#a7f3d0',
        fontSize: 16,
    },
    confirmButton: {
        flex: 2,
        height: 60,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#10b981',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
