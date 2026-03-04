import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { getVisitors, approveVisitor, rejectVisitor } from '../../src/api/visitors';
import { User, Calendar, MapPin, Check, X } from 'lucide-react-native';

export default function VisitorsScreen() {
    const [visitors, setVisitors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PENDING' | 'HISTORY'>('ACTIVE');

    const fetchVisitors = async () => {
        try {
            const data = await getVisitors();
            setVisitors(data);
        } catch (error) {
            console.error('Error fetching visitors:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchVisitors();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchVisitors();
    };

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
        try {
            await rejectVisitor(id);
            Alert.alert('Success', 'Visitor rejected');
            fetchVisitors();
        } catch (error) {
            Alert.alert('Error', 'Failed to reject visitor');
        }
    };

    const filteredVisitors = visitors.filter(v => {
        if (activeTab === 'ACTIVE') return v.status === 'CHECKED_IN';
        if (activeTab === 'PENDING') return v.status === 'PENDING';
        if (activeTab === 'HISTORY') return v.status === 'CHECKED_OUT';
        return false;
    });

    const renderVisitor = ({ item }: { item: any }) => (
        <View style={styles.visitorCard}>
            <View style={styles.visitorHeader}>
                <View style={styles.avatar}>
                    <User color="#fff" size={20} />
                </View>
                <View style={styles.visitorInfo}>
                    <Text style={styles.visitorName}>{item.name}</Text>
                    <Text style={styles.visitorCompany}>{item.company || 'Private Visit'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: item.status === 'CHECKED_IN' ? '#10b98120' : item.status === 'PENDING' ? '#f59e0b20' : '#334155' }]}>
                    <Text style={[styles.statusText, { color: item.status === 'CHECKED_IN' ? '#10b981' : item.status === 'PENDING' ? '#f59e0b' : '#94a3b8' }]}>
                        {item.status.replace('_', ' ')}
                    </Text>
                </View>
            </View>
            <View style={styles.visitorFooter}>
                <View style={styles.footerItem}>
                    <Calendar size={14} color="#64748b" />
                    <Text style={styles.footerText}>{new Date(item.checkin_time).toLocaleTimeString()}</Text>
                </View>
                <View style={styles.footerItem}>
                    <MapPin size={14} color="#64748b" />
                    <Text style={styles.footerText}>{item.location_name || 'Main Office'}</Text>
                </View>
            </View>
            {activeTab === 'PENDING' && (
                <View style={styles.actionsContainer}>
                    <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleApprove(item.id)}>
                        <Check size={16} color="#10b981" />
                        <Text style={styles.approveText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleReject(item.id)}>
                        <X size={16} color="#ef4444" />
                        <Text style={styles.rejectText}>Reject</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.tabsContainer}>
                {['ACTIVE', 'PENDING', 'HISTORY'].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() => setActiveTab(tab as any)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <FlatList
                data={filteredVisitors}
                renderItem={renderVisitor}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>No visitors found</Text>
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
    centered: {
        flex: 1,
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 20,
        gap: 10,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
    },
    activeTab: {
        backgroundColor: '#6366f120',
        borderColor: '#6366f1',
    },
    tabText: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: 'bold',
    },
    activeTabText: {
        color: '#6366f1',
    },
    listContent: {
        padding: 20,
    },
    visitorCard: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#334155',
    },
    visitorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    visitorInfo: {
        flex: 1,
    },
    visitorName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    visitorCompany: {
        fontSize: 13,
        color: '#94a3b8',
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    visitorFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: '#94a3b8',
        marginLeft: 6,
    },
    actionsContainer: {
        flexDirection: 'row',
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#334155',
        gap: 10,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        gap: 6,
    },
    approveBtn: {
        backgroundColor: '#10b98110',
        borderColor: '#10b98130',
    },
    rejectBtn: {
        backgroundColor: '#ef444410',
        borderColor: '#ef444430',
    },
    approveText: {
        color: '#10b981',
        fontWeight: 'bold',
        fontSize: 14,
    },
    rejectText: {
        color: '#ef4444',
        fontWeight: 'bold',
        fontSize: 14,
    },
    empty: {
        marginTop: 100,
        alignItems: 'center',
    },
    emptyText: {
        color: '#94a3b8',
        fontSize: 16,
    },
});
