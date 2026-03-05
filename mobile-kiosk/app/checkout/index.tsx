import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ActivityIndicator, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { getActiveVisitors, checkOutVisitor } from '../../src/api/visitors';
import { ArrowLeft, LogOut, User, Check } from 'lucide-react-native';

export default function CheckoutScreen() {
    const [visitors, setVisitors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchActiveVisitors();
    }, []);

    const fetchActiveVisitors = async () => {
        try {
            const data = await getActiveVisitors();
            setVisitors(data.results || data);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch active visitors');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckout = (visitor: any) => {
        Alert.alert(
            'Check-Out',
            `Are you sure you want to check out ${visitor.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            await checkOutVisitor(visitor.id);
                            Alert.alert('Goodbye!', `${visitor.name} has been successfully checked out.`, [
                                { text: 'OK', onPress: () => router.replace('/') }
                            ]);
                        } catch (error) {
                            Alert.alert('Error', 'Check-out failed. Please try again.');
                        } finally {
                            setActionLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const renderVisitor = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.visitorCard}
            onPress={() => handleCheckout(item)}
            disabled={actionLoading}
        >
            <View style={styles.visitorIcon}>
                <User color="#6366f1" size={24} />
            </View>
            <View style={styles.visitorInfo}>
                <Text style={styles.visitorName}>{item.name}</Text>
                <Text style={styles.visitorTime}>Checked in: {new Date(item.checkin_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            <LogOut color="#94a3b8" size={20} />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft color="#fff" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Check-Out</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.infoBox}>
                    <LogOut color="#f43f5e" size={40} style={styles.icon} />
                    <Text style={styles.title}>Leaving us?</Text>
                    <Text style={styles.subtitle}>Select your name from the list to check out</Text>
                </View>

                {loading ? (
                    <ActivityIndicator color="#6366f1" size="large" style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={visitors}
                        renderItem={renderVisitor}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.listContainer}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Check color="#10b981" size={48} />
                                <Text style={styles.emptyText}>No visitors currently checked in.</Text>
                            </View>
                        }
                    />
                )}
            </View>

            {actionLoading && (
                <View style={styles.overlay}>
                    <ActivityIndicator color="#fff" size="large" />
                </View>
            )}
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
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    infoBox: {
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 20,
    },
    icon: {
        marginBottom: 10,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        color: '#94a3b8',
        textAlign: 'center',
    },
    listContainer: {
        paddingBottom: 40,
    },
    visitorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        borderRadius: 20,
        padding: 20,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#334155',
    },
    visitorIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    visitorInfo: {
        flex: 1,
    },
    visitorName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    visitorTime: {
        fontSize: 14,
        color: '#94a3b8',
        marginTop: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        color: '#94a3b8',
        fontSize: 18,
        marginTop: 20,
        textAlign: 'center',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    }
});
