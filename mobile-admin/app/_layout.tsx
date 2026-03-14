import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            const inAuthGroup = segments[0] === '(auth)';
            const token = await SecureStore.getItemAsync('userToken');

            if (!token && !inAuthGroup) {
                router.replace('/(auth)/login');
            } else if (token && inAuthGroup) {
                router.replace('/(tabs)');
            }
        };

        checkAuth();
    }, [segments]);

    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: colorScheme === 'dark' ? '#000' : '#fff',
                },
                headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
            }}
        >
            <Stack.Screen name="(auth)/login" options={{ title: 'Login', headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
    );
}
