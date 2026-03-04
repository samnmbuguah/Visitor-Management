import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { getLocations, getHosts } from '../../src/api/visitors';
import { ArrowLeft, User, Mail, Phone, Building, UserCheck, Camera as CameraIcon, CheckCircle2, RefreshCw } from 'lucide-react-native';

export default function CheckinForm() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const [locations, setLocations] = useState<any[]>([]);
    const [hosts, setHosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [permission, requestPermission] = useCameraPermissions();
    const [showCamera, setShowCamera] = useState(false);
    const cameraRef = useRef<any>(null);

    const [formData, setFormData] = useState({
        name: params.name?.toString() || '',
        email: params.email?.toString() || '',
        phone: params.phone?.toString() || '',
        company: params.company?.toString() || '',
        purpose: '',
        location: '',
        host: '',
        photo: '',
    });

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const locs = await getLocations();
                setLocations(locs);
                if (locs.length > 0) {
                    setFormData(prev => ({ ...prev, location: locs[0].id.toString() }));
                    const hst = await getHosts(locs[0].id);
                    setHosts(hst);
                }
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []);

    const handleLocationChange = async (locId: string) => {
        setFormData(prev => ({ ...prev, location: locId, host: '' }));
        try {
            const hst = await getHosts(parseInt(locId));
            setHosts(hst);
        } catch (error) {
            console.error('Error loading hosts:', error);
        }
    };

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
                setFormData(prev => ({ ...prev, photo: `data:image/jpeg;base64,${photo.base64}` }));
                setShowCamera(false);
            } catch (error) {
                Alert.alert('Error', 'Failed to take photo');
            }
        }
    };

    const startCamera = async () => {
        if (!permission?.granted) {
            const { granted } = await requestPermission();
            if (!granted) {
                Alert.alert('Permission needed', 'Camera permission is required to take a visitor photo.');
                return;
            }
        }
        setShowCamera(true);
    };

    const handleNext = () => {
        if (!formData.name || !formData.email || !formData.host) {
            Alert.alert('Required Fields', 'Please fill in Name, Email and select a Host.');
            return;
        }

        if (!formData.photo) {
            Alert.alert('Photo Required', 'Please take a photo for your visitor badge.');
            return;
        }

        // Pass data to next step (NDA)
        router.push({
            pathname: '/checkin/nda',
            params: { ...formData }
        });
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    if (showCamera) {
        return (
            <View style={styles.container}>
                <CameraView style={styles.camera} ref={cameraRef} facing="front">
                    <View style={styles.cameraOverlay}>
                        <View style={styles.cameraHeader}>
                            <TouchableOpacity style={styles.cameraBackButton} onPress={() => setShowCamera(false)}>
                                <ArrowLeft color="#fff" size={24} />
                            </TouchableOpacity>
                            <Text style={styles.cameraTitle}>Take Photo</Text>
                            <View style={{ width: 40 }} />
                        </View>
                        <View style={styles.cameraFrame} />
                        <View style={styles.cameraFooter}>
                            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                                <View style={styles.captureButtonInner} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </CameraView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft color="#fff" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Visitor Registration</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.formContainer}>
                    {formData.photo ? (
                        <View style={styles.photoPreviewContainer}>
                            <Image source={{ uri: formData.photo }} style={styles.photoPreview} />
                            <TouchableOpacity style={styles.retakeButton} onPress={startCamera}>
                                <RefreshCw color="#fff" size={16} />
                                <Text style={styles.retakeText}>Retake Photo</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.photoPlaceholder} onPress={startCamera}>
                            <View style={styles.cameraIconContainer}>
                                <CameraIcon color="#6366f1" size={32} />
                            </View>
                            <Text style={styles.photoText}>Tap to take visitor photo</Text>
                            <Text style={styles.photoSubtext}>Required for security badge</Text>
                        </TouchableOpacity>
                    )}

                    <Text style={styles.sectionTitle}>Your Information</Text>

                    <View style={styles.inputGroup}>
                        <User color="#64748b" size={20} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            placeholderTextColor="#64748b"
                            value={formData.name}
                            onChangeText={(text) => setFormData({ ...formData, name: text })}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Mail color="#64748b" size={20} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email Address"
                            placeholderTextColor="#64748b"
                            autoCapitalize="none"
                            keyboardType="email-address"
                            value={formData.email}
                            onChangeText={(text) => setFormData({ ...formData, email: text })}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Phone color="#64748b" size={20} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number"
                            placeholderTextColor="#64748b"
                            keyboardType="phone-pad"
                            value={formData.phone}
                            onChangeText={(text) => setFormData({ ...formData, phone: text })}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Building color="#64748b" size={20} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Company (Optional)"
                            placeholderTextColor="#64748b"
                            value={formData.company}
                            onChangeText={(text) => setFormData({ ...formData, company: text })}
                        />
                    </View>

                    <Text style={styles.sectionTitle}>Visit Details</Text>

                    <View style={styles.inputGroup}>
                        <UserCheck color="#64748b" size={20} style={styles.inputIcon} />
                        <View style={styles.pickerContainer}>
                            {/* Simplified picker for AI demo, usually use @react-native-picker/picker */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {hosts.map(host => (
                                    <TouchableOpacity
                                        key={host.id}
                                        style={[styles.chip, formData.host === host.id.toString() && styles.activeChip]}
                                        onPress={() => setFormData({ ...formData, host: host.id.toString() })}
                                    >
                                        <Text style={[styles.chipText, formData.host === host.id.toString() && styles.activeChipText]}>
                                            {host.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            {hosts.length === 0 && <Text style={styles.errorText}>No hosts available for this location</Text>}
                        </View>
                    </View>

                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Purpose of Visit"
                        placeholderTextColor="#64748b"
                        multiline
                        numberOfLines={3}
                        value={formData.purpose}
                        onChangeText={(text) => setFormData({ ...formData, purpose: text })}
                    />

                    <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                        <Text style={styles.nextButtonText}>Continue to NDA</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    centered: {
        flex: 1,
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
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
        padding: 30,
    },
    formContainer: {
        paddingBottom: 40,
    },
    photoPlaceholder: {
        height: 200,
        backgroundColor: '#1e293b',
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#334155',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 25,
    },
    cameraIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#6366f120',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    photoText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    photoSubtext: {
        color: '#64748b',
        fontSize: 14,
    },
    photoPreviewContainer: {
        alignItems: 'center',
        marginBottom: 25,
    },
    photoPreview: {
        width: 160,
        height: 160,
        borderRadius: 80,
        borderWidth: 4,
        borderColor: '#6366f1',
    },
    retakeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#334155',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        marginTop: 15,
        gap: 8,
    },
    retakeText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#94a3b8',
        marginBottom: 20,
        marginTop: 10,
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        borderRadius: 16,
        paddingHorizontal: 15,
        marginBottom: 20,
        height: 60,
        borderWidth: 1,
        borderColor: '#334155',
    },
    inputIcon: {
        marginRight: 15,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        height: '100%',
    },
    textArea: {
        height: 120,
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 15,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 30,
        textAlignVertical: 'top',
    },
    pickerContainer: {
        flex: 1,
        paddingVertical: 10,
    },
    chip: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: '#334155',
        marginRight: 10,
    },
    activeChip: {
        backgroundColor: '#6366f1',
    },
    chipText: {
        color: '#94a3b8',
        fontWeight: '600',
    },
    activeChipText: {
        color: '#fff',
    },
    nextButton: {
        backgroundColor: '#6366f1',
        height: 70,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#6366f1',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
        marginBottom: 50,
    },
    nextButtonText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 12,
    },
    // Camera styles
    camera: {
        flex: 1,
    },
    cameraOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'space-between',
    },
    cameraHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
    },
    cameraBackButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    cameraFrame: {
        width: 250,
        height: 250,
        borderRadius: 125,
        borderWidth: 2,
        borderColor: '#fff',
        alignSelf: 'center',
        backgroundColor: 'transparent',
    },
    cameraFooter: {
        padding: 40,
        alignItems: 'center',
        paddingBottom: 60,
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureButtonInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#fff',
    },
});
