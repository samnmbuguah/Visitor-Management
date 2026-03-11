import { Tabs } from 'expo-router';
import { LayoutDashboard, Users, Settings, Package, Wrench, Building } from 'lucide-react-native';

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarStyle: {
                    backgroundColor: '#1e293b',
                    borderTopColor: '#334155',
                },
                tabBarActiveTintColor: '#6366f1',
                tabBarInactiveTintColor: '#94a3b8',
                headerStyle: {
                    backgroundColor: '#0f172a',
                },
                headerTintColor: '#fff',
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color }) => <LayoutDashboard color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="visitors"
                options={{
                    title: 'Visitors',
                    tabBarIcon: ({ color }) => <Users color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="parcels"
                options={{
                    title: 'Parcels',
                    tabBarIcon: ({ color }) => <Package color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="maintenance"
                options={{
                    title: 'Maintenance',
                    tabBarIcon: ({ color }) => <Wrench color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="assets"
                options={{
                    title: 'Assets',
                    tabBarIcon: ({ color }) => <Building color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <Settings color={color} size={24} />,
                }}
            />
        </Tabs>
    );
}
