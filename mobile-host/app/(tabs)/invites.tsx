import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { createInvite } from '../../src/api/visitors';
import { UserPlus, Calendar, Clock } from 'lucide-react-native';

export default function InvitesScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [company, setCompany] = useState('');
    const [date, setDate] = useState('');
    const [loading, setLoading] = useState(false);

    const handleInvite = async () => {
        if (!name || !email || !date) {
            Alert.alert('Error', 'Please fill in Name, Email, and Expected Arrival');
            return;
        }

        setLoading(true);
        try {
            // Basic implementation - in a real app you'd use a date picker
            await createInvite({
                visitor_name: name,
                visitor_email: email,
                visitor_company: company,
                expected_arrival: new Date(date).toISOString(),
            });
            Alert.alert('Success', 'Invite sent successfully');
            setName('');
            setEmail('');
            setCompany('');
            setDate('');
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to create invite');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <UserPlus color="#10b981" size={40} />
                <Text style={styles.headerTitle}>Pre-Register Visitor</Text>
                <Text style={styles.headerSubtitle}>Send a digital invite with a QR code</Text>
            </View>

            <View style={styles.form}>
                <Text style={styles.label}>Visitor Name</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. John Doe"
                    placeholderTextColor="#64748b"
                    value={name}
                    onChangeText={setName}
                />

                <Text style={styles.label}>Visitor Email</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. john@example.com"
                    placeholderTextColor="#64748b"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />

                <Text style={styles.label}>Company (Optional)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. Acme Corp"
                    placeholderTextColor="#64748b"
                    value={company}
                    onChangeText={setCompany}
                />

                <Text style={styles.label}>Expected Arrival (YYYY-MM-DD HH:MM)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. 2026-03-04 14:00"
                    placeholderTextColor="#64748b"
                    value={date}
                    onChangeText={setDate}
                />

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleInvite}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Send Invite</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#064e3b',
    },
    header: {
        padding: 30,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 15,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#a7f3d0',
        marginTop: 5,
    },
    form: {
        padding: 20,
        backgroundColor: '#065f46',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        flex: 1,
        minHeight: 500,
    },
    label: {
        color: '#a7f3d0',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
        marginTop: 15,
    },
    input: {
        backgroundColor: '#047857',
        height: 55,
        borderRadius: 12,
        paddingHorizontal: 15,
        color: '#fff',
        fontSize: 16,
    },
    button: {
        backgroundColor: '#10b981',
        height: 55,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 30,
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
