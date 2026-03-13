import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { KioskAuth } from '../src/utils/auth';
import { Lock, Eye, EyeOff } from 'lucide-react-native';

export default function LockScreen() {
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleUnlock = async () => {
        if (!pin) {
            Alert.alert('Error', 'Please enter PIN');
            return;
        }

        setLoading(true);
        try {
            const isValid = await KioskAuth.verifyPin(pin);
            
            if (isValid) {
                await KioskAuth.setLocked(false);
                router.replace('/');
            } else {
                Alert.alert('Authentication Failed', 'Invalid PIN');
            }
        } catch (error) {
            Alert.alert('Error', 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.card}>
                <View style={styles.iconContainer}>
                    <Lock color="#fff" size={40} />
                </View>
                <Text style={styles.title}>Kiosk Locked</Text>
                <Text style={styles.subtitle}>Enter PIN to unlock</Text>

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter PIN"
                        value={pin}
                        onChangeText={setPin}
                        secureTextEntry={!showPin}
                        keyboardType="numeric"
                        maxLength={10}
                        autoFocus
                    />
                    <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setShowPin(!showPin)}
                    >
                        {showPin ? <EyeOff color="#666" size={20} /> : <Eye color="#666" size={20} />}
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleUnlock}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Unlock Kiosk</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: '#1e293b',
        borderRadius: 20,
        padding: 30,
        width: '100%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: '#334155',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        alignSelf: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
        color: '#fff',
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 30,
        color: '#94a3b8',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: '#0f172a',
        borderRadius: 12,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: '#334155',
    },
    input: {
        flex: 1,
        height: 50,
        color: '#fff',
        fontSize: 18,
    },
    eyeButton: {
        padding: 10,
    },
    button: {
        backgroundColor: '#6366f1',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonDisabled: {
        backgroundColor: '#475569',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
