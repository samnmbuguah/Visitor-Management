import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { createInvite } from '../../src/api/visitors';
import { getProfile } from '../../src/api/auth';
import { UserPlus, Calendar, Clock } from 'lucide-react-native';

// For native date/time pickers, you'd normally use:
// - @react-native-community/datetimepicker
// - expo-datetimepicker
// For this web/Expo demo, we'll show a simple native HTML picker when on web

export default function InvitesScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [company, setCompany] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [expectedDuration, setExpectedDuration] = useState('');
    const [loading, setLoading] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);

    React.useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const profile = await getProfile();
            setUserProfile(profile);
        } catch (error) {
            console.error('Failed to fetch profile', error);
        }
    };

    const handleInvite = async () => {
        if (!name || !email || !date || !time) {
            Alert.alert('Error', 'Please fill in Name, Email, and Expected Arrival (date and time)');
            return;
        }

        if (!userProfile) {
            Alert.alert('Error', 'User profile not loaded. Please try again.');
            fetchProfile();
            return;
        }

        setLoading(true);
        try {
            // Combine date and time
            const isoDateTime = new Date(`${date}T${time}`).toISOString();
            await createInvite({
                visitor_name: name,
                visitor_email: email,
                visitor_phone: phone,
                visitor_company: company,
                expected_arrival: isoDateTime,
                expected_duration: expectedDuration ? parseInt(expectedDuration) : null,
                host: userProfile.host_id,
                location: userProfile.location,
            });
            Alert.alert('Success', 'Invite sent successfully');
            setName('');
            setEmail('');
            setPhone('');
            setCompany('');
            setDate('');
            setTime('');
            setExpectedDuration('');
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to create invite');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <ScrollView style={styles.container} keyboardShouldPersistTaps='handled'>
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

                <Text style={styles.label}>Visitor Phone (Optional)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. +1234567890"
                    placeholderTextColor="#64748b"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                />

                <Text style={styles.label}>Company (Optional)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. Acme Corp"
                    placeholderTextColor="#64748b"
                    value={company}
                    onChangeText={setCompany}
                />

                <View style={styles.dateTimeRow}>
                    <View style={styles.dateTimeColumn}>
                        <Text style={styles.label}>Expected Arrival Date</Text>
                        {Platform.OS === 'web' ? (
                            <input
                                type="date"
                                style={styles.webInput}
                                value={date}
                                onChange={(e: any) => setDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                            />
                        ) : (
                            <TextInput
                                style={styles.input}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="#64748b"
                                value={date}
                                onChangeText={setDate}
                            />
                        )}
                        <View style={styles.quickButtons}>
                            <TouchableOpacity style={styles.quickButton} onPress={() => setDate(new Date().toISOString().split('T')[0])}>
                                <Text style={styles.quickButtonText}>Today</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.quickButton} onPress={() => {
                                const tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                setDate(tomorrow.toISOString().split('T')[0]);
                            }}>
                                <Text style={styles.quickButtonText}>Tomorrow</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.dateTimeColumn}>
                        <Text style={styles.label}>Expected Arrival Time</Text>
                        {Platform.OS === 'web' ? (
                            <input
                                type="time"
                                style={styles.webInput}
                                value={time}
                                onChange={(e: any) => setTime(e.target.value)}
                                min="08:00"
                                max="18:00"
                            />
                        ) : (
                            <TextInput
                                style={styles.input}
                                placeholder="HH:MM"
                                placeholderTextColor="#64748b"
                                value={time}
                                onChangeText={setTime}
                            />
                        )}
                        <View style={styles.timeButtons}>
                            {['09:00', '11:00', '14:00', '16:00'].map(t => (
                                <TouchableOpacity key={t} style={styles.quickButton} onPress={() => setTime(t)}>
                                    <Text style={styles.quickButtonText}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                <Text style={styles.label}>Expected Duration (Minutes)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. 60"
                    placeholderTextColor="#64748b"
                    value={expectedDuration}
                    onChangeText={setExpectedDuration}
                    keyboardType="numeric"
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
        </KeyboardAvoidingView>
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
    dateTimeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 15,
    },
    dateTimeColumn: {
        flex: 1,
        marginRight: 10,
    },
    webInput: {
        backgroundColor: '#047857',
        height: 55,
        borderRadius: 12,
        paddingHorizontal: 15,
        color: '#fff',
        fontSize: 16,
        borderWidth: 0,
    },
    quickButtons: {
        flexDirection: 'row',
        marginTop: 8,
        gap: 8,
    },
    timeButtons: {
        flexDirection: 'row',
        marginTop: 8,
        flexWrap: 'wrap',
        gap: 8,
    },
    quickButton: {
        backgroundColor: '#065f46',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#10b981',
    },
    quickButtonText: {
        color: '#a7f3d0',
        fontSize: 12,
        fontWeight: '500',
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
