import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import client from '../../src/api/client';
import { ArrowLeft, Clock, User, CheckCircle2, RefreshCw } from 'lucide-react-native';

export default function WaitingRoomScreen() {
    const [pendingVisitors, setPendingVisitors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchPendingVisitors();
        const interval = setInterval(fetchPendingVisitors, 10000); // Auto-refresh every 10s
        return () => clearInterval(interval);
    }, []);

    const fetchPendingVisitors = async () => {
        try {
            const response = await client.get('/visitors/?status=PENDING');
            setPendingVisitors(response.data.results || response.data);
        } catch (error) {
            console.error('Error fetching pending visitors:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderVisitor = ({ item }: { item: any }) => (
        <View style={styles.visitorCard}>
            <View style={styles.visitorIcon}>
                <User color="#6366f1" size={24} />
            </View>
            <View style={styles.visitorInfo}>
                <Text style={styles.visitorName}>{item.name}</Text>
                <Text style={styles.visitorStatus}>Waiting for: {item.host_name || 'Host'}</Text>
            </View>
            <View style={styles.statusBadge}>
                <Clock color="#f59e0b" size={16} />
                <Text style={styles.statusText}>Pending</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.replace('/')} style={styles.backButton}>
                    <ArrowLeft color="#fff" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Waiting Room</Text>
                <TouchableOpacity onPress={fetchPendingVisitors} style={styles.refreshButton}>
                    <RefreshCw color="#6366f1" size={20} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={styles.infoBox}>
                    <CheckCircle2 color="#10b981" size={48} style={styles.icon} />
                    <Text style={styles.title}>Registration Received</Text>
                    <Text style={styles.subtitle}>Your host has been notified. Please have a seat in the waiting area while we process your request.</Text>
                </View>

                {loading ? (
                    <ActivityIndicator color="#6366f1" size="large" style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={pendingVisitors}
                        renderItem={renderVisitor}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.listContainer}
                        ListHeaderComponent={
                            pendingVisitors.length > 0 ? (
                                <Text style={styles.listTitle}>Current Check-in Requests</Text>
                            ) : null
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>All requests have been processed.</Text>
                            </View>
                        }
                    />
                )}
            </View>

            <TouchableOpacity style={styles.homeButton} onPress={() => router.replace('/')}>
                <Text style={styles.homeButtonText}>Back to Main Menu</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 25,
        paddingTop: 60,
        backgroundColor: '#1e293b',
    },
    backButton: {
        marginRight: 20,
    },
    headerTitle: {
        flex: 1,
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    refreshButton: {
        padding: 8,
    },
    content: {
        flex: 1,
        padding: 24,
    },
    infoBox: {
        alignItems: 'center',
        marginBottom: 40,
        backgroundColor: '#1e293b',
        padding: 30,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#334155',
    },
    icon: {
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 24,
    },
    listTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#94a3b8',
        marginBottom: 16,
        marginTop: 10,
    },
    listContainer: {
        paddingBottom: 100,
    },
    visitorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#334155',
    },
    visitorIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    visitorInfo: {
        flex: 1,
    },
    visitorName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    visitorStatus: {
        fontSize: 14,
        color: '#94a3b8',
        marginTop: 2,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f59e0b20',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 6,
    },
    statusText: {
        color: '#f59e0b',
        fontSize: 12,
        fontWeight: 'bold',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 20,
    },
    emptyText: {
        color: '#64748b',
        fontSize: 16,
    },
    homeButton: {
        position: 'absolute',
        bottom: 30,
        left: 24,
        right: 24,
        backgroundColor: '#6366f1',
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#6366f1',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    homeButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
