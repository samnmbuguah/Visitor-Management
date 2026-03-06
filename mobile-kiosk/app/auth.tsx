import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { KioskAuth } from '../src/utils/auth';
import { Lock, Eye, EyeOff } from 'lucide-react-native';

export default function AuthScreen() {
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleAuth = async () => {
        if (!pin) {
            Alert.alert('Error', 'Please enter PIN');
            return;
        }

        setLoading(true);
        try {
            const isValid = await KioskAuth.verifyPin(pin);
            
            if (isValid) {
                // Set as authenticated
                await KioskAuth.setAuthenticated('kiosk_authenticated');
                
                // If using default PIN, suggest setting a new one
                if (KioskAuth.isDefaultPin(pin)) {
                    Alert.alert(
                        'Security Notice', 
                        'You are using the default PIN. Consider changing it for better security.',
                        [
                            { text: 'Continue', onPress: () => router.replace('/') },
                            { text: 'Change PIN', onPress: () => router.push('/settings') }
                        ]
                    );
                } else {
                    router.replace('/');
                }
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
                <Text style={styles.title}>Kiosk Authentication</Text>
                <Text style={styles.subtitle}>Enter PIN to access visitor management</Text>

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
                    onPress={handleAuth}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Unlock Kiosk</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={() => router.push('/settings')}
                >
                    <Text style={styles.settingsButtonText}>Settings</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 30,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#667eea',
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
        color: '#333',
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 30,
        color: '#666',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    input: {
        flex: 1,
        height: 50,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingHorizontal: 15,
        fontSize: 16,
    },
    eyeButton: {
        padding: 10,
    },
    button: {
        backgroundColor: '#667eea',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 15,
    },
    buttonDisabled: {
        backgroundColor: '#ccc',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    settingsButton: {
        alignItems: 'center',
    },
    settingsButtonText: {
        color: '#667eea',
        fontSize: 14,
        fontWeight: '600',
    },
});
