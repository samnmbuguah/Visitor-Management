import React, { useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import SignatureScreen from 'react-native-signature-canvas';
import { checkInVisitor } from '../../src/api/visitors';
import { ArrowLeft, Check } from 'lucide-react-native';

export default function NDAScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const ref = useRef<any>();
    const [loading, setLoading] = useState(false);

    const handleOK = async (signature: string) => {
        setLoading(true);
        try {
            await checkInVisitor({
                ...params,
                signature: signature,
                nda_accepted: true,
            });
            Alert.alert(
                'Check-In Successful',
                'Thank you! Please wait for host approval if required.',
                [{ text: 'OK', onPress: () => router.replace('/') }]
            );
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to complete check-in');
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        ref.current.clearSignature();
    };

    const handleConfirm = () => {
        ref.current.readSignature();
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft color="#fff" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Legal Agreement</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.docCard}>
                    <ScrollView style={styles.docScroll}>
                        <Text style={styles.docTitle}>Non-Disclosure Agreement</Text>
                        <Text style={styles.docText}>
                            By signing below, you agree to keep all information obtained during your visit confidential.
                            You will not disclose, copy, or distribute any proprietary information, trade secrets,
                            or data belonging to the company or its clients.{"\n\n"}
                            You also agree to follow all safety protocols and security instructions provided to you.
                            The digital signature captured below will be legally binding as your acknowledgement of these terms.
                        </Text>
                    </ScrollView>
                </View>

                <Text style={styles.signLabel}>Please sign below</Text>
                <View style={styles.signatureContainer}>
                    <SignatureScreen
                        ref={ref}
                        onOK={handleOK}
                        descriptionText="Sign here"
                        clearText="Clear"
                        confirmText="Save"
                        webStyle={styles.signatureStyle}
                    />
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                        <Text style={styles.clearButtonText}>Clear</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.confirmButton, loading && styles.disabled]}
                        onPress={handleConfirm}
                        disabled={loading}
                    >
                        <Check color="#fff" size={20} />
                        <Text style={styles.confirmButtonText}>I Agree & Confirm</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
        </KeyboardAvoidingView>
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
    },
    docCard: {
        backgroundColor: '#1e293b',
        borderRadius: 20,
        height: '35%',
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#334155',
    },
    docScroll: {
        flex: 1,
    },
    docTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
    },
    docText: {
        color: '#94a3b8',
        fontSize: 14,
        lineHeight: 22,
    },
    signLabel: {
        color: '#94a3b8',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    signatureContainer: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        height: 200,
    },
    signatureStyle: `
    .m-signature-pad--footer {display: none; margin: 0px;}
    body,html {height: 100%;}
  `,
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 25,
    },
    clearButton: {
        width: '30%',
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#334155',
    },
    clearButtonText: {
        color: '#cbd5e1',
        fontWeight: 'bold',
    },
    confirmButton: {
        flexDirection: 'row',
        width: '65%',
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#10b981',
    },
    confirmButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
        marginLeft: 10,
    },
    disabled: {
        opacity: 0.5,
    }
});
