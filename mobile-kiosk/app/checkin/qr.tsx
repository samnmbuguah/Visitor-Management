import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { checkInVisitor, searchVisitor } from '../../src/api/visitors';
import { ArrowLeft, RefreshCw } from 'lucide-react-native';

export default function QRScannerScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const router = useRouter();

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>We need your permission to show the camera</Text>
                <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                    <Text style={styles.buttonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        if (scanned) return;
        setScanned(true);

        try {
            // Assuming data is a UUID token from pre-registration
            await checkInVisitor({ token: data });
            Alert.alert('Welcome!', 'Check-in successful based on your digital invite.', [
                { text: 'Finish', onPress: () => router.replace('/') }
            ]);
        } catch (error: any) {
            Alert.alert('Scan Failed', 'This QR code is invalid or has already been used.');
            setScanned(false);
        }
    };

    return (
        <View style={styles.container}>
            <CameraView
                style={styles.camera}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                }}
            >
                <View style={styles.overlay}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft color="#fff" size={30} />
                    </TouchableOpacity>

                    <View style={styles.scanFrame} />

                    <Text style={styles.instructionText}>
                        Align the QR code within the frame
                    </Text>
                </View>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButton: {
        position: 'absolute',
        top: 60,
        left: 20,
        padding: 10,
    },
    scanFrame: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: '#6366f1',
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    instructionText: {
        color: '#fff',
        fontSize: 18,
        marginTop: 40,
        fontWeight: '600',
        textAlign: 'center',
    },
    permissionButton: {
        backgroundColor: '#6366f1',
        padding: 20,
        borderRadius: 12,
        marginTop: 20,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    }
});
