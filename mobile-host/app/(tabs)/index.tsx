import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { getPendingVisitors, approveVisitor, rejectVisitor } from '../../src/api/visitors';
import { User, Check, X, Clock } from 'lucide-react-native';

export default function ArrivalsScreen() {
    const [visitors, setVisitors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchVisitors = async () => {
        try {
            const data = await getPendingVisitors();
            setVisitors(data);
        } catch (error) {
            console.error('Error fetching pending visitors:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchVisitors();
    }, []);

    const handleApprove = async (id: number) => {
        try {
            await approveVisitor(id);
            Alert.alert('Success', 'Visitor approved');
            fetchVisitors();
        } catch (error) {
            Alert.alert('Error', 'Failed to approve visitor');
        }
    };

    const handleReject = async (id: number) => {
        Alert.alert(
            'Confirm Rejection',
            'Are you sure you want to reject this visitor?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await rejectVisitor(id);
                            fetchVisitors();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to reject visitor');
                        }
                    }
                }
            ]
        );
    };

    const renderVisitor = ({ item }: { item: any }) => (
        <View style={styles.visitorCard}>
            <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                    <User color="#fff" size={24} />
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.company}>{item.company || 'Private Visit'}</Text>
                </View>
            </View>

            <View style={styles.details}>
                <View style={styles.detailRow}>
                    <Clock size={16} color="#64748b" />
                    <Text style={styles.detailText}>Arrived at {new Date(item.checkin_time).toLocaleTimeString()}</Text>
                </View>
                <Text style={styles.purposeLabel}>Purpose:</Text>
                <Text style={styles.purposeText}>{item.purpose}</Text>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleApprove(item.id)}
                >
                    <Check color="#fff" size={20} />
                    <Text style={styles.actionText}>Approve</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleReject(item.id)}
                >
                    <X color="#fff" size={20} />
                    <Text style={styles.actionText}>Reject</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#10b981" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={visitors}
                renderItem={renderVisitor}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchVisitors(); }} tintColor="#10b981" />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyTitle}>All Clear!</Text>
                        <Text style={styles.emptySubtitle}>No pending visitor approvals.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#064e3b',
    },
    centered: {
        flex: 1,
        backgroundColor: '#064e3b',
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 20,
    },
    visitorCard: {
        backgroundColor: '#065f46',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    company: {
        fontSize: 14,
        color: '#a7f3d0',
        marginTop: 2,
    },
    details: {
        backgroundColor: '#047857',
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    detailText: {
        color: '#fff',
        marginLeft: 8,
        fontSize: 14,
    },
    purposeLabel: {
        color: '#a7f3d0',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    purposeText: {
        color: '#fff',
        fontSize: 14,
        lineHeight: 20,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionButton: {
        flexDirection: 'row',
        width: '48%',
        height: 45,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    approveButton: {
        backgroundColor: '#10b981',
    },
    rejectButton: {
        backgroundColor: '#991b1b',
    },
    actionText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    empty: {
        marginTop: 100,
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 16,
        color: '#a7f3d0',
    },
});
