import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import client from '../../src/api/client';
import { Users, Clock, AlertTriangle } from 'lucide-react-native';

export default function DashboardScreen() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async () => {
        try {
            const response = await client.get('/analytics/dashboard/');
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchStats();
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.header}>
                <Text style={styles.greeting}>Overview</Text>
                <Text style={styles.date}>{new Date().toLocaleDateString()}</Text>
            </View>

            <View style={styles.grid}>
                <StatCard
                    title="Live Visitors"
                    value={stats?.total_visitors || 0}
                    icon={<Users color="#6366f1" size={24} />}
                    color="#6366f1"
                />
                <StatCard
                    title="New Today"
                    value={stats?.today_visitors || 0}
                    icon={<Clock color="#10b981" size={24} />}
                    color="#10b981"
                />
                <StatCard
                    title="Pending"
                    value={stats?.pending_approvals || 0}
                    icon={<AlertTriangle color="#f59e0b" size={24} />}
                    color="#f59e0b"
                />
            </View>

            <Text style={styles.sectionTitle}>Recent Insights</Text>
            <View style={styles.insightsCard}>
                <Text style={styles.insightText}>
                    Peak visiting hours usually occur around 10:00 AM.
                </Text>
            </View>
        </ScrollView>
    );
}

function StatCard({ title, value, icon, color }: any) {
    return (
        <View style={styles.card}>
            <View style={[styles.iconBg, { backgroundColor: color + '20' }]}>
                {icon}
            </View>
            <Text style={styles.cardValue}>{value}</Text>
            <Text style={styles.cardTitle}>{title}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
        padding: 20,
    },
    centered: {
        flex: 1,
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        marginBottom: 25,
    },
    greeting: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    date: {
        fontSize: 16,
        color: '#94a3b8',
        marginTop: 5,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    card: {
        width: '48%',
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 20,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#334155',
    },
    iconBg: {
        width: 45,
        height: 45,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    cardValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
    },
    cardTitle: {
        fontSize: 14,
        color: '#94a3b8',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 15,
        marginBottom: 15,
    },
    insightsCard: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#334155',
    },
    insightText: {
        color: '#cbd5e1',
        lineHeight: 22,
    },
});
