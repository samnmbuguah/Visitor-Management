import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { KioskAuth } from '../src/utils/auth';
import { ArrowLeft, Save, Lock, Smartphone, LogOut } from 'lucide-react-native';

export default function SettingsScreen() {
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleUpdatePin = async () => {
        if (!currentPin || !newPin || !confirmPin) {
            Alert.alert('Error', 'Please fill all PIN fields');
            return;
        }

        if (newPin !== confirmPin) {
            Alert.alert('Error', 'New PIN and confirmation do not match');
            return;
        }

        if (newPin.length < 4) {
            Alert.alert('Error', 'PIN must be at least 4 digits');
            return;
        }

        setLoading(true);
        try {
            const isValid = await KioskAuth.verifyPin(currentPin);
            if (!isValid) {
                Alert.alert('Error', 'Current PIN is incorrect');
                return;
            }

            await KioskAuth.setPin(newPin);
            Alert.alert('Success', 'Kiosk PIN has been updated successfully');
            setCurrentPin('');
            setNewPin('');
            setConfirmPin('');
        } catch (error) {
            Alert.alert('Error', 'Failed to update PIN');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to log out of this kiosk? This will require re-authentication with employee credentials.',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Logout', 
                    style: 'destructive',
                    onPress: async () => {
                        await KioskAuth.logout();
                        router.replace('/auth');
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft color="#fff" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Kiosk Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Lock color="#6366f1" size={20} />
                        <Text style={styles.sectionTitle}>Security (Change PIN)</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Current PIN</Text>
                        <TextInput
                            style={styles.input}
                            value={currentPin}
                            onChangeText={setCurrentPin}
                            secureTextEntry
                            keyboardType="numeric"
                            placeholder="Enter current PIN"
                            placeholderTextColor="#64748b"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>New PIN</Text>
                        <TextInput
                            style={styles.input}
                            value={newPin}
                            onChangeText={setNewPin}
                            secureTextEntry
                            keyboardType="numeric"
                            placeholder="Enter new PIN"
                            placeholderTextColor="#64748b"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Confirm New PIN</Text>
                        <TextInput
                            style={styles.input}
                            value={confirmPin}
                            onChangeText={setConfirmPin}
                            secureTextEntry
                            keyboardType="numeric"
                            placeholder="Confirm new PIN"
                            placeholderTextColor="#64748b"
                        />
                    </View>

                    <TouchableOpacity 
                        style={[styles.saveButton, loading && styles.disabled]} 
                        onPress={handleUpdatePin}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : (
                            <>
                                <Save color="#fff" size={20} style={styles.buttonIcon} />
                                <Text style={styles.saveButtonText}>Update PIN</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Smartphone color="#6366f1" size={20} />
                        <Text style={styles.sectionTitle}>Device Info</Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>App Version</Text>
                        <Text style={styles.infoValue}>1.0.0</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Platform</Text>
                        <Text style={styles.infoValue}>{Platform.OS.toUpperCase()}</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <LogOut color="#ef4444" size={20} style={styles.buttonIcon} />
                    <Text style={styles.logoutButtonText}>Log Out Kiosk</Text>
                </TouchableOpacity>
            </ScrollView>
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
    scroll: {
        padding: 20,
    },
    section: {
        backgroundColor: '#1e293b',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#334155',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    inputGroup: {
        marginBottom: 15,
    },
    label: {
        color: '#94a3b8',
        fontSize: 14,
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 12,
        padding: 15,
        color: '#fff',
        fontSize: 16,
    },
    saveButton: {
        flexDirection: 'row',
        backgroundColor: '#6366f1',
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    buttonIcon: {
        marginRight: 10,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    disabled: {
        opacity: 0.5,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    infoLabel: {
        color: '#94a3b8',
        fontSize: 14,
    },
    infoValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    logoutButton: {
        flexDirection: 'row',
        backgroundColor: '#ef444420',
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
        borderWidth: 1,
        borderColor: '#ef4444',
    },
    logoutButtonText: {
        color: '#ef4444',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
