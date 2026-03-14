import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { KioskAuth } from '../src/utils/auth';
import { login } from '../src/api/auth';
import { Lock, Eye, EyeOff, Mail, Key } from 'lucide-react-native';

export default function AuthScreen() {
    const [credentials, setCredentials] = useState({
        email: '',
        password: '',
    });
    const [pin, setPin] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [needsPin, setNeedsPin] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            const authed = await KioskAuth.isAuthenticated();
            if (authed) {
                const storedPin = await KioskAuth.getPin();
                if (!storedPin) {
                    setNeedsPin(true);
                } else {
                    router.replace('/');
                }
            }
        };
        checkAuth();
    }, []);

    const handleLogin = async () => {
        if (!credentials.email || !credentials.password) {
            setError('Please enter email and password');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await login({
                email: credentials.email,
                password: credentials.password
            });
            
            if (data.access) {
                await KioskAuth.setAuthenticated(data.access);
                const storedPin = await KioskAuth.getPin();
                if (!storedPin) {
                    setNeedsPin(true);
                } else {
                    router.replace('/');
                }
            } else {
                setError('Invalid credentials');
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.detail || error.message || 'Authentication failed';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleSetPin = async () => {
        if (pin.length < 4) {
            Alert.alert('Error', 'PIN must be at least 4 digits');
            return;
        }
        await KioskAuth.setPin(pin);
        Alert.alert('PIN Set', 'Your security PIN has been set successfully.');
        router.replace('/');
    };

    if (needsPin) {
        return (
            <View style={styles.container}>
                <View style={styles.card}>
                    <View style={styles.iconContainer}>
                        <Lock color="#fff" size={40} />
                    </View>
                    <Text style={styles.title}>Set Kiosk PIN</Text>
                    <Text style={styles.subtitle}>Create a PIN to lock/unlock this kiosk</Text>
                    
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter 4-digit PIN"
                            value={pin}
                            onChangeText={setPin}
                            secureTextEntry
                            keyboardType="numeric"
                            maxLength={10}
                        />
                    </View>

                    <TouchableOpacity style={styles.button} onPress={handleSetPin}>
                        <Text style={styles.buttonText}>Set PIN & Continue</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', width: '100%' }}>
                <View style={styles.card}>
                    <View style={styles.iconContainer}>
                        <Lock color="#fff" size={40} />
                    </View>
                    <Text style={styles.title}>Kiosk Login</Text>
                    <Text style={styles.subtitle}>Sign in with your host/admin credentials</Text>

                    <View style={styles.inputContainer}>
                        <Mail color="#666" size={20} style={{ marginRight: 10 }} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email Address"
                            value={credentials.email}
                            onChangeText={(text) => {
                                setCredentials(prev => ({ ...prev, email: text }));
                                if (error) setError(null);
                            }}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Key color="#666" size={20} style={{ marginRight: 10 }} />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            value={credentials.password}
                            onChangeText={(text) => {
                                setCredentials(prev => ({ ...prev, password: text }));
                                if (error) setError(null);
                            }}
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity
                            style={styles.eyeButton}
                            onPress={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeOff color="#666" size={20} /> : <Eye color="#666" size={20} />}
                        </TouchableOpacity>
                    </View>

                    {error && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
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
    errorContainer: {
        backgroundColor: '#fee2e2',
        padding: 12,
        borderRadius: 10,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#fca5a5',
    },
    errorText: {
        color: '#b91c1c',
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '500',
    },
});
