'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getVisitors,
    getHosts,
    getDashboardStats,
    getLocations,
    Visitor,
    Host,
    DashboardStats,
    Location,
    approveVisitor,
    rejectVisitor
} from '@/lib/api';

export default function AdminPage() {
    const pathname = usePathname();
    const [activeTab, setActiveTab] = useState<'visitors' | 'hosts'>('visitors');
    const [selectedLocation, setSelectedLocation] = useState<number | undefined>(undefined);

    // Fetch data
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['dashboardStats', selectedLocation],
        queryFn: () => getDashboardStats(selectedLocation).then(res => res.data),
    });

    const { data: visitors = [], isLoading: visitorsLoading } = useQuery({
        queryKey: ['visitors', selectedLocation],
        queryFn: () => getVisitors({ location: selectedLocation }).then(res => res.data),
    });

    const { data: hosts = [], isLoading: hostsLoading } = useQuery({
        queryKey: ['hosts', selectedLocation],
        queryFn: () => getHosts({ location: selectedLocation }).then(res => res.data),
    });

    const { data: locations = [] } = useQuery({
        queryKey: ['locations'],
        queryFn: () => getLocations().then(res => res.data),
    });

    const activeVisitors = visitors.filter(v => v.status === 'CHECKED_IN');
    const pendingVisitors = visitors.filter(v => v.status === 'PENDING');
    const checkedOutVisitors = visitors.filter(v => v.status === 'CHECKED_OUT' || v.status === 'REJECTED');

    const navItems = [
        { href: '/admin', label: 'Dashboard', icon: '📊' },
        { href: '/admin/analytics', label: 'Analytics', icon: '📈' },
        { href: '/admin/locations', label: 'Locations', icon: '🏢' },
        { href: '/admin/users', label: 'Users', icon: '👥' },
        { href: '/admin/invites', label: 'Invites', icon: '📨' },
        { href: '/admin/watchlist', label: 'Watchlist', icon: '🛡️' },
        { href: '/admin/notifications', label: 'Notifications', icon: '🔔' },
    ];

    return (
        <main className="min-h-screen p-8">
            <div className="animated-bg" />

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                            Admin Dashboard
                        </h1>
                        <p className="text-gray-400 mt-1">Manage visitors, hosts, and settings</p>
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

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="glass-card p-6">
                        <p className="text-sm text-gray-400 mb-1">Active Visitors</p>
                        <p className="text-3xl font-bold text-green-400">
                            {statsLoading ? '...' : stats?.active_visitors || 0}
                        </p>
                    </div>
                    <div className="glass-card p-6">
                        <p className="text-sm text-gray-400 mb-1">Today</p>
                        <p className="text-3xl font-bold text-indigo-400">
                            {statsLoading ? '...' : stats?.today_visitors || 0}
                        </p>
                    </div>
                    <div className="glass-card p-6">
                        <p className="text-sm text-gray-400 mb-1">This Week</p>
                        <p className="text-3xl font-bold text-purple-400">
                            {statsLoading ? '...' : stats?.week_visitors || 0}
                        </p>
                    </div>
                    <div className="glass-card p-6">
                        <p className="text-sm text-gray-400 mb-1">Hosts</p>
                        <p className="text-3xl font-bold text-orange-400">
                            {statsLoading ? '...' : stats?.total_hosts || 0}
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('visitors')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'visitors'
                            ? 'bg-indigo-500 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        Visitors
                    </button>
                    <button
                        onClick={() => setActiveTab('hosts')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'hosts'
                            ? 'bg-indigo-500 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        Hosts
                    </button>
                </div>

                {/* Content */}
                <div className="glass-card p-6">
                    {activeTab === 'visitors' ? (
                        <VisitorsTab
                            activeVisitors={activeVisitors}
                            pendingVisitors={pendingVisitors}
                            checkedOutVisitors={checkedOutVisitors}
                            loading={visitorsLoading}
                            queryClient={useQueryClient()} // Need to wrap component or pass invalidator
                        />
                    ) : (
                        <HostsTab hosts={hosts} loading={hostsLoading} />
                    )}
                </div>
            </div>
        </main>
    );
}

function VisitorsTab({
    activeVisitors,
    pendingVisitors,
    checkedOutVisitors,
    loading,
    queryClient
}: {
    activeVisitors: Visitor[];
    pendingVisitors: Visitor[];
    checkedOutVisitors: Visitor[];
    loading: boolean;
    queryClient: any;
}) {
    const approveMutation = useMutation({
        mutationFn: approveVisitor,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visitors'] })
    });

    const rejectMutation = useMutation({
        mutationFn: rejectVisitor,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visitors'] })
    });
    if (loading) {
        return <div className="text-center py-12 text-gray-400">Loading...</div>;
    }

    return (
        <>
            <h2 className="text-lg font-semibold text-white mb-4">Active Visitors ({activeVisitors.length})</h2>
            {activeVisitors.length === 0 ? (
                <p className="text-gray-400 py-8 text-center">No active visitors</p>
            ) : (
                <div className="overflow-x-auto mb-8">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-sm text-gray-400 border-b border-white/10">
                                <th className="pb-3 font-medium">Name</th>
                                <th className="pb-3 font-medium">Email</th>
                                <th className="pb-3 font-medium">Host</th>
                                <th className="pb-3 font-medium">Purpose</th>
                                <th className="pb-3 font-medium">Location</th>
                                <th className="pb-3 font-medium">Check-in Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeVisitors.map(visitor => (
                                <tr key={visitor.id} className="border-b border-white/5">
                                    <td className="py-3">
                                        {visitor.photo ? (
                                            <img src={visitor.photo} alt={visitor.name} className="w-8 h-8 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-gray-400">
                                                {visitor.name.charAt(0)}
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-3 text-white">{visitor.name}</td>
                                    <td className="py-3 text-gray-300">{visitor.email}</td>
                                    <td className="py-3 text-gray-300">{visitor.host_name || '-'}</td>
                                    <td className="py-3 text-gray-300">{visitor.purpose}</td>
                                    <td className="py-3 text-gray-300">{visitor.location_name || '-'}</td>
                                    <td className="py-3 text-gray-400">
                                        {new Date(visitor.checkin_time).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <h2 className="text-lg font-semibold text-white mb-4 mt-8">History ({checkedOutVisitors.length})</h2>
            {checkedOutVisitors.length === 0 ? (
                <p className="text-gray-400 py-8 text-center">No history yet</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-sm text-gray-400 border-b border-white/10">
                                <th className="pb-3 font-medium">Name</th>
                                <th className="pb-3 font-medium">Email</th>
                                <th className="pb-3 font-medium">Check-in</th>
                                <th className="pb-3 font-medium">Check-out</th>
                            </tr>
                        </thead>
                        <tbody>
                            {checkedOutVisitors.slice(0, 20).map(visitor => (
                                <tr key={visitor.id} className="border-b border-white/5 opacity-60">
                                    <td className="py-3 text-white">{visitor.name}</td>
                                    <td className="py-3 text-gray-300">{visitor.email}</td>
                                    <td className="py-3 text-gray-400">
                                        {new Date(visitor.checkin_time).toLocaleString()}
                                    </td>
                                    <td className="py-3 text-gray-400">
                                        {visitor.checkout_time
                                            ? new Date(visitor.checkout_time).toLocaleString()
                                            : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}

function HostsTab({ hosts, loading }: { hosts: Host[]; loading: boolean }) {
    const [showAddHost, setShowAddHost] = useState(false);
    const [newHost, setNewHost] = useState({ name: '', email: '', department: '', phone: '' });

    if (loading) {
        return <div className="text-center py-12 text-gray-400">Loading...</div>;
    }

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Registered Hosts ({hosts.length})</h2>
                <button
                    onClick={() => setShowAddHost(!showAddHost)}
                    className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors"
                >
                    + Add Host
                </button>
            </div>

            {showAddHost && (
                <form className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            placeholder="Name"
                            value={newHost.name}
                            onChange={(e) => setNewHost({ ...newHost, name: e.target.value })}
                            className="premium-input"
                            required
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            value={newHost.email}
                            onChange={(e) => setNewHost({ ...newHost, email: e.target.value })}
                            className="premium-input"
                            required
                        />
                        <input
                            type="text"
                            placeholder="Department"
                            value={newHost.department}
                            onChange={(e) => setNewHost({ ...newHost, department: e.target.value })}
                            className="premium-input"
                            required
                        />
                        <input
                            type="tel"
                            placeholder="Phone (optional)"
                            value={newHost.phone}
                            onChange={(e) => setNewHost({ ...newHost, phone: e.target.value })}
                            className="premium-input"
                        />
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button type="submit" className="btn-primary">Save Host</button>
                        <button type="button" onClick={() => setShowAddHost(false)} className="btn-secondary">Cancel</button>
                    </div>
                </form>
            )}

            {hosts.length === 0 ? (
                <p className="text-gray-400 py-8 text-center">No hosts registered yet. Add your first host above.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-sm text-gray-400 border-b border-white/10">
                                <th className="pb-3 font-medium">Name</th>
                                <th className="pb-3 font-medium">Email</th>
                                <th className="pb-3 font-medium">Department</th>
                                <th className="pb-3 font-medium">Location</th>
                                <th className="pb-3 font-medium">Phone</th>
                                <th className="pb-3 font-medium">Visitors</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hosts.map(host => (
                                <tr key={host.id} className="border-b border-white/5">
                                    <td className="py-3 text-white">{host.name}</td>
                                    <td className="py-3 text-gray-300">{host.email}</td>
                                    <td className="py-3 text-gray-300">{host.department}</td>
                                    <td className="py-3 text-gray-300">{host.location_name || '-'}</td>
                                    <td className="py-3 text-gray-400">{host.phone || '-'}</td>
                                    <td className="py-3 text-gray-400">{host.visitor_count || 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
