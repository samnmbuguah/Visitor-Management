import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { getProfile, logout } from '../../src/api/auth';
import { useRouter } from 'expo-router';
import { User, LogOut, Mail, Shield, Building } from 'lucide-react-native';

export default function ProfileScreen() {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const data = await getProfile();
            setProfile(data);
        } catch (error) {
            console.error('Failed to load profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            router.replace('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#10b981" />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>Failed to load profile</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>
                        {profile.username?.charAt(0).toUpperCase() || '?'}
                    </Text>
                </View>
                <Text style={styles.name}>{profile.username}</Text>
                <Text style={styles.role}>{profile.role?.replace('_', ' ')}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account Details</Text>
                
                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <Mail color="#8b5cf6" size={20} />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>Email</Text>
                            <Text style={styles.infoValue}>{profile.email || 'Not set'}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <Shield color="#10b981" size={20} />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>Role</Text>
                            <Text style={styles.infoValue}>{profile.role?.replace('_', ' ')}</Text>
                        </View>
                    </View>
                    
                    {profile.location_name && (
                        <>
                            <View style={styles.divider} />
                            <View style={styles.infoRow}>
                                <Building color="#f59e0b" size={20} />
                                <View style={styles.infoTextContainer}>
                                    <Text style={styles.infoLabel}>Location</Text>
                                    <Text style={styles.infoValue}>{profile.location_name}</Text>
                                </View>
                            </View>
                        </>
                    )}
                </View>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <LogOut color="#ef4444" size={20} style={styles.buttonIcon} />
                <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    centerContainer: {
        flex: 1,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        paddingVertical: 40,
        backgroundColor: '#064e3b',
        borderBottomWidth: 1,
        borderBottomColor: '#065f46',
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 4,
    },
    role: {
        fontSize: 16,
        color: '#a7f3d0',
        fontWeight: '500',
    },
    section: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 16,
    },
    infoCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    infoTextContainer: {
        marginLeft: 16,
    },
    infoLabel: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 16,
        color: '#0f172a',
    },
    divider: {
        height: 1,
        backgroundColor: '#e2e8f0',
        marginVertical: 12,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 40,
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ef4444',
    },
    buttonIcon: {
        marginRight: 8,
    },
    logoutText: {
        color: '#ef4444',
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 16,
    },
});
