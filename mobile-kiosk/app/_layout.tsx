import { Stack } from 'expo-router';
import { useColorScheme, View } from 'react-native';
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { KioskAuth } from '../src/utils/auth';

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            const inAuthGroup = segments[0] === 'auth';
            const authenticated = await KioskAuth.isAuthenticated();

            if (!authenticated && !inAuthGroup) {
                // Redirect to auth if not authenticated and not in auth screen
                router.replace('/auth');
            } else if (authenticated && inAuthGroup) {
                // Redirect to home if authenticated but on auth screen
                router.replace('/');
            }
        };

        checkAuth();
    }, [segments]);

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#0f172a' }
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="lock" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="checkout/index" />
            <Stack.Screen name="checkin/waiting" />
        </Stack>
    );
}
