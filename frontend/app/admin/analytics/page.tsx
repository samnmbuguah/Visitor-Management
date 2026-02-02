'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import {
    getDashboardStats,
    getVisitorTrends,
    getPeakHours,
    getHostStats,
    getLocations
} from '@/lib/api';
import { useState } from 'react';

export default function AnalyticsPage() {
    const pathname = usePathname();
    const [selectedLocation, setSelectedLocation] = useState<number | undefined>(undefined);
    const [periodDays, setPeriodDays] = useState(30);

    const navItems = [
        { href: '/admin', label: 'Dashboard', icon: '📊' },
        { href: '/admin/analytics', label: 'Analytics', icon: '📈' },
        { href: '/admin/locations', label: 'Locations', icon: '🏢' },
        { href: '/admin/users', label: 'Users', icon: '👥' },
        { href: '/admin/notifications', label: 'Notifications', icon: '🔔' },
    ];

    const { data: stats } = useQuery({
        queryKey: ['dashboardStats', selectedLocation],
        queryFn: () => getDashboardStats(selectedLocation).then(res => res.data),
    });

    const { data: trendsData } = useQuery({
        queryKey: ['visitorTrends', selectedLocation, periodDays],
        queryFn: () => getVisitorTrends({ location: selectedLocation, days: periodDays }).then(res => res.data),
    });

    const { data: peakHoursData } = useQuery({
        queryKey: ['peakHours', selectedLocation],
        queryFn: () => getPeakHours({ location: selectedLocation, days: 7 }).then(res => res.data),
    });

    const { data: hostStatsData } = useQuery({
        queryKey: ['hostStats', selectedLocation, periodDays],
        queryFn: () => getHostStats({ location: selectedLocation, days: periodDays }).then(res => res.data),
    });

    const { data: locations = [] } = useQuery({
        queryKey: ['locations'],
        queryFn: () => getLocations().then(res => res.data),
    });

    // Format peak hours for display
    const formattedPeakHours = peakHoursData?.data.map(item => ({
        ...item,
        label: `${item.hour}:00`
    })) || [];

    // Format trends data for display
    const formattedTrends = trendsData?.data.map(item => ({
        ...item,
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })) || [];

    return (
        <main className="min-h-screen p-8">
            <div className="animated-bg" />

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                            Analytics
                        </h1>
                        <p className="text-gray-400 mt-1">Visitor trends and insights</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {locations.length > 0 && (
                            <select
                                value={selectedLocation || ''}
                                onChange={(e) => setSelectedLocation(e.target.value ? Number(e.target.value) : undefined)}
                                className="premium-select bg-white/5 border-white/10 text-sm py-2"
                            >
                                <option value="">All Locations</option>
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                        )}
                        <select
                            value={periodDays}
                            onChange={(e) => setPeriodDays(Number(e.target.value))}
                            className="premium-select bg-white/5 border-white/10 text-sm py-2"
                        >
                            <option value={7}>Last 7 days</option>
                            <option value={30}>Last 30 days</option>
                            <option value={90}>Last 90 days</option>
                        </select>
                        <Link href="/">
                            <button className="px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/5 transition-colors">
                                ← Back to Kiosk
                            </button>
                        </Link>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {navItems.map(item => (
                        <Link key={item.href} href={item.href}>
                            <button
                                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${pathname === item.href
                                        ? 'bg-indigo-500 text-white'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                <span>{item.icon}</span>
                                {item.label}
                            </button>
                        </Link>
                    ))}
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="glass-card p-6">
                        <p className="text-sm text-gray-400 mb-1">Active Now</p>
                        <p className="text-3xl font-bold text-green-400">{stats?.active_visitors || 0}</p>
                    </div>
                    <div className="glass-card p-6">
                        <p className="text-sm text-gray-400 mb-1">This Month</p>
                        <p className="text-3xl font-bold text-indigo-400">{stats?.month_visitors || 0}</p>
                    </div>
                    <div className="glass-card p-6">
                        <p className="text-sm text-gray-400 mb-1">Avg Duration</p>
                        <p className="text-3xl font-bold text-purple-400">
                            {stats?.avg_visit_duration_minutes ? `${stats.avg_visit_duration_minutes}m` : 'N/A'}
                        </p>
                    </div>
                    <div className="glass-card p-6">
                        <p className="text-sm text-gray-400 mb-1">Locations</p>
                        <p className="text-3xl font-bold text-orange-400">{stats?.total_locations || 0}</p>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Visitor Trends */}
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Visitor Trends</h2>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={formattedTrends}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="date" stroke="#888" fontSize={12} />
                                    <YAxis stroke="#888" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1a1a2e',
                                            border: '1px solid #333',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#6366f1"
                                        strokeWidth={2}
                                        dot={{ fill: '#6366f1' }}
                                        name="Visitors"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Peak Hours */}
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Peak Hours (Last 7 Days)</h2>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={formattedPeakHours}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="label" stroke="#888" fontSize={10} />
                                    <YAxis stroke="#888" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1a1a2e',
                                            border: '1px solid #333',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Bar
                                        dataKey="count"
                                        fill="#8b5cf6"
                                        radius={[4, 4, 0, 0]}
                                        name="Visitors"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Host Activity Table */}
                <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Top Hosts by Visitor Count</h2>
                    {hostStatsData?.data && hostStatsData.data.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-sm text-gray-400 border-b border-white/10">
                                        <th className="pb-3 font-medium">Rank</th>
                                        <th className="pb-3 font-medium">Host Name</th>
                                        <th className="pb-3 font-medium">Department</th>
                                        <th className="pb-3 font-medium">Total Visitors</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {hostStatsData.data.map((host, index) => (
                                        <tr key={host.id} className="border-b border-white/5">
                                            <td className="py-3 text-gray-400">#{index + 1}</td>
                                            <td className="py-3 text-white">{host.name}</td>
                                            <td className="py-3 text-gray-300">{host.department}</td>
                                            <td className="py-3">
                                                <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-sm">
                                                    {host.total_visitors}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-gray-400 py-8 text-center">No host activity data available</p>
                    )}
                </div>
            </div>
        </main>
    );
}
