import { Tabs } from 'expo-router';
import { Bell, UserPlus, History } from 'lucide-react-native';

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarStyle: {
                    backgroundColor: '#064e3b',
                    borderTopColor: '#065f46',
                },
                tabBarActiveTintColor: '#10b981',
                tabBarInactiveTintColor: '#a7f3d0',
                headerStyle: {
                    backgroundColor: '#064e3b',
                },
                headerTintColor: '#fff',
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Arrivals',
                    tabBarIcon: ({ color }) => <Bell color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="invites"
                options={{
                    title: 'Pre-Register',
                    tabBarIcon: ({ color }) => <UserPlus color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="parcels"
                options={{
                    title: 'My Parcels',
                    tabBarIcon: ({ color }) => <Package color={color} size={24} />,
                }}
            />
        </Tabs>
    );
}
