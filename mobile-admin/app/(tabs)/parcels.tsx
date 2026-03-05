import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, FlatList, ScrollView } from 'react-native';
import { Package, Search, Plus, Camera, Bell, CheckCircle } from 'lucide-react-native';
import { getParcels, logParcel, notifyRecipient } from '../../src/api/parcels';
import { getHosts } from '../../src/api/visitors';

export default function ParcelsScreen() {
    const [parcels, setParcels] = useState<any[]>([]);
    const [hosts, setHosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLogging, setIsLogging] = useState(false);

    // Form state
    const [recipient, setRecipient] = useState<number | null>(null);
    const [courier, setCourier] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [parcelData, hostData] = await Promise.all([
                getParcels(),
                getHosts(1) // Default to location 1 for now
            ]);
            setParcels(parcelData.results || parcelData);
            setHosts(hostData.results || hostData);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleLogParcel = async () => {
        if (!recipient || !courier) {
            Alert.alert('Error', 'Please select a recipient and enter courier details');
            return;
        }

        setSubmitting(true);
        try {
            await logParcel({
                recipient,
                courier,
                tracking_number: trackingNumber,
                location: 1 // Default
            });
            Alert.alert('Success', 'Parcel logged successfully');
            setIsLogging(false);
            setRecipient(null);
            setCourier('');
            setTrackingNumber('');
            fetchData();
        } catch (error) {
            Alert.alert('Error', 'Failed to log parcel');
        } finally {
            setSubmitting(false);
        }
    };

    const handleNotify = async (id: number) => {
        try {
            await notifyRecipient(id);
            Alert.alert('Success', 'Recipient notified');
            fetchData();
        } catch (error) {
            Alert.alert('Error', 'Failed to send notification');
        }
    };

    const renderParcel = ({ item }: { item: any }) => (
        <View style={styles.parcelCard}>
            <View style={styles.parcelInfo}>
                <Text style={styles.recipientName}>{item.recipient_name}</Text>
                <Text style={styles.courierText}>{item.courier} • {item.tracking_number || 'No tracking'}</Text>
                <Text style={styles.dateText}>{new Date(item.received_at).toLocaleDateString()} {new Date(item.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            <View style={styles.statusContainer}>
                <View style={[styles.statusBadge, item.status === 'COLLECTED' ? styles.statusCollected : styles.statusReceived]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
                {item.status === 'RECEIVED' && (
                    <TouchableOpacity onPress={() => handleNotify(item.id)} style={styles.notifyButton}>
                        <Bell color="#6366f1" size={20} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    if (isLogging) {
        return (
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                <View style={styles.formCard}>
                    <Text style={styles.formTitle}>Log New Delivery</Text>

                    <Text style={styles.label}>Recipient</Text>
                    <View style={styles.hostList}>
                        {hosts.map(host => (
                            <TouchableOpacity
                                key={host.id}
                                style={[styles.hostChip, recipient === host.id && styles.hostChipSelected]}
                                onPress={() => setRecipient(host.id)}
                            >
                                <Text style={[styles.hostChipText, recipient === host.id && styles.hostChipTextSelected]}>{host.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Courier</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. FedEx, DHL, UPS"
                        placeholderTextColor="#64748b"
                        value={courier}
                        onChangeText={setCourier}
                    />

                    <Text style={styles.label}>Tracking Number (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Scan or enter manually"
                        placeholderTextColor="#64748b"
                        value={trackingNumber}
                        onChangeText={setTrackingNumber}
                    />

                    <TouchableOpacity style={styles.photoButton}>
                        <Camera color="#94a3b8" size={24} />
                        <Text style={styles.photoButtonText}>Take Parcel Photo</Text>
                    </TouchableOpacity>

                    <View style={styles.formButtons}>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => setIsLogging(false)}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.submitButton, submitting && styles.buttonDisabled]}
                            onPress={handleLogParcel}
                            disabled={submitting}
                        >
                            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Log Parcel</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Parcels</Text>
                <TouchableOpacity style={styles.addButton} onPress={() => setIsLogging(true)}>
                    <Plus color="#fff" size={24} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={parcels}
                renderItem={renderParcel}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshing={loading}
                onRefresh={fetchData}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Package color="#475569" size={64} />
                        <Text style={styles.emptyText}>No parcels logged yet.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    scrollContent: {
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#1e293b',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 20,
    },
    parcelCard: {
        flexDirection: 'row',
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#334155',
    },
    parcelInfo: {
        flex: 1,
    },
    recipientName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    courierText: {
        fontSize: 14,
        color: '#94a3b8',
        marginBottom: 4,
    },
    dateText: {
        fontSize: 12,
        color: '#64748b',
    },
    statusContainer: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusReceived: {
        backgroundColor: '#334155',
    },
    statusCollected: {
        backgroundColor: '#05966933',
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#fff',
    },
    notifyButton: {
        padding: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        color: '#94a3b8',
        fontSize: 16,
        marginTop: 20,
    },
    formCard: {
        backgroundColor: '#1e293b',
        borderRadius: 20,
        padding: 25,
        borderWidth: 1,
        borderColor: '#334155',
    },
    formTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 20,
        textAlign: 'center',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#94a3b8',
        marginBottom: 8,
        marginTop: 15,
    },
    input: {
        backgroundColor: '#334155',
        borderRadius: 12,
        height: 50,
        paddingHorizontal: 15,
        color: '#fff',
        fontSize: 16,
    },
    hostList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    hostChip: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#334155',
    },
    hostChipSelected: {
        backgroundColor: '#6366f1',
    },
    hostChipText: {
        color: '#94a3b8',
        fontSize: 14,
    },
    hostChipTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },
    photoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#334155',
        borderRadius: 12,
        height: 60,
        marginTop: 20,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#475569',
    },
    photoButtonText: {
        color: '#94a3b8',
        marginLeft: 10,
        fontSize: 16,
    },
    formButtons: {
        flexDirection: 'row',
        gap: 15,
        marginTop: 30,
    },
    cancelButton: {
        flex: 1,
        height: 55,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#334155',
    },
    cancelButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    submitButton: {
        flex: 2,
        height: 55,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#6366f1',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
});
