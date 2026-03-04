import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { QrCode, UserPlus, LogOut } from 'lucide-react-native';

export default function WelcomeScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <View style={styles.overlay}>
                <View style={styles.header}>
                    <View style={styles.logo}>
                        <UserPlus color="#fff" size={40} />
                    </View>
                    <Text style={styles.title}>Welcome</Text>
                    <Text style={styles.subtitle}>Visitor Management Kiosk</Text>
                </View>

                <View style={styles.menu}>
                    <TouchableOpacity
                        style={[styles.menuButton, styles.primaryButton]}
                        onPress={() => router.push('/checkin/qr')}
                    >
                        <QrCode color="#fff" size={32} />
                        <View style={styles.buttonInfo}>
                            <Text style={styles.buttonTitle}>Touchless Check-In</Text>
                            <Text style={styles.buttonDesc}>Scan your invite QR code</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuButton}
                        onPress={() => router.push('/checkin/form')}
                    >
                        <UserPlus color="#fff" size={32} />
                        <View style={styles.buttonInfo}>
                            <Text style={styles.buttonTitle}>New Visitor</Text>
                            <Text style={styles.buttonDesc}>Register manually</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.menuButton, styles.secondaryButton]}
                        onPress={() => router.push('/checkin/returning')}
                    >
                        <UserPlus color="#fff" size={32} />
                        <View style={styles.buttonInfo}>
                            <Text style={styles.buttonTitle}>Returning Visitor</Text>
                            <Text style={styles.buttonDesc}>Search by email or phone</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.menuButton, styles.secondaryButton]}
                        onPress={() => router.push('/checkout')}
                    >
                        <LogOut color="#fff" size={32} />
                        <View style={styles.buttonInfo}>
                            <Text style={styles.buttonTitle}>Check-Out</Text>
                            <Text style={styles.buttonDesc}>Leave the premises</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Powered by VisitorPro</Text>
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
    overlay: {
        flex: 1,
        padding: 40,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 60,
    },
    logo: {
        width: 100,
        height: 100,
        borderRadius: 30,
        backgroundColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#6366f1',
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    title: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#fff',
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 20,
        color: '#94a3b8',
        marginTop: 10,
    },
    menu: {
        gap: 20,
    },
    menuButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        borderRadius: 24,
        padding: 25,
        borderWidth: 1,
        borderColor: '#334155',
    },
    primaryButton: {
        backgroundColor: '#6366f1',
        borderColor: '#818cf8',
    },
    secondaryButton: {
        marginTop: 10,
    },
    buttonInfo: {
        marginLeft: 20,
    },
    buttonTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
    },
    buttonDesc: {
        fontSize: 14,
        color: '#cbd5e1',
        marginTop: 4,
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    footerText: {
        color: '#475569',
        fontSize: 14,
        fontWeight: '600',
    },
});
