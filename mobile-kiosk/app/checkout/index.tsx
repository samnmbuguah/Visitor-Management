import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { checkOutVisitor } from '../../src/api/visitors';
import { ArrowLeft, LogOut } from 'lucide-react-native';

export default function CheckoutScreen() {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleCheckout = async () => {
        if (!query) {
            Alert.alert('Error', 'Please enter your email or phone number used for check-in');
            return;
        }

        setLoading(true);
        try {
            await checkOutVisitor(query);
            Alert.alert('Goodbye!', 'You have been successfully checked out. Have a safe journey!', [
                { text: 'OK', onPress: () => router.replace('/') }
            ]);
        } catch (error: any) {
            Alert.alert('Check-Out Failed', 'No active visit found for this information.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft color="#fff" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Check-Out</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.formCard}>
                    <LogOut color="#f43f5e" size={60} style={styles.icon} />
                    <Text style={styles.title}>Leaving us?</Text>
                    <Text style={styles.subtitle}>Enter your email or phone to check out</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Email or Phone Number"
                        placeholderTextColor="#64748b"
                        value={query}
                        onChangeText={setQuery}
                        autoCapitalize="none"
                    />

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleCheckout}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Confirm Check-Out</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
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
        padding: 30,
        justifyContent: 'center',
    },
    formCard: {
        backgroundColor: '#1e293b',
        borderRadius: 30,
        padding: 40,
        alignItems: 'center',
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
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#94a3b8',
        textAlign: 'center',
        marginBottom: 30,
    },
    input: {
        width: '100%',
        height: 60,
        backgroundColor: '#334155',
        borderRadius: 16,
        paddingHorizontal: 20,
        color: '#fff',
        fontSize: 18,
        marginBottom: 20,
    },
    button: {
        width: '100%',
        height: 60,
        backgroundColor: '#f43f5e',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
