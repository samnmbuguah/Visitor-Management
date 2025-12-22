'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getVisitors, getHosts, createHost, Visitor, Host } from '@/lib/api';

export default function AdminPage() {
    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [hosts, setHosts] = useState<Host[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'visitors' | 'hosts'>('visitors');
    const [showAddHost, setShowAddHost] = useState(false);
    const [newHost, setNewHost] = useState({ name: '', email: '', department: '', phone: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [visitorsRes, hostsRes] = await Promise.all([getVisitors(), getHosts()]);
            setVisitors(visitorsRes.data);
            setHosts(hostsRes.data);
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddHost = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createHost(newHost);
            setNewHost({ name: '', email: '', department: '', phone: '' });
            setShowAddHost(false);
            loadData();
        } catch (err) {
            console.error('Failed to add host:', err);
        }
    };

    const activeVisitors = visitors.filter(v => v.status === 'CHECKED_IN');
    const checkedOutVisitors = visitors.filter(v => v.status === 'CHECKED_OUT');

    return (
        <main className="min-h-screen p-8">
            <div className="animated-bg" />

            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                            Admin Dashboard
                        </h1>
                        <p className="text-gray-400 mt-1">Manage visitors and hosts</p>
                    </div>
                    <Link href="/">
                        <button className="px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/5 transition-colors">
                            ← Back to Kiosk
                        </button>
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="glass-card p-6">
                        <p className="text-sm text-gray-400 mb-1">Active Visitors</p>
                        <p className="text-3xl font-bold text-green-400">{activeVisitors.length}</p>
                    </div>
                    <div className="glass-card p-6">
                        <p className="text-sm text-gray-400 mb-1">Total Today</p>
                        <p className="text-3xl font-bold text-indigo-400">{visitors.length}</p>
                    </div>
                    <div className="glass-card p-6">
                        <p className="text-sm text-gray-400 mb-1">Registered Hosts</p>
                        <p className="text-3xl font-bold text-purple-400">{hosts.length}</p>
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
                    {loading ? (
                        <div className="text-center py-12 text-gray-400">Loading...</div>
                    ) : activeTab === 'visitors' ? (
                        <>
                            <h2 className="text-lg font-semibold text-white mb-4">Active Visitors</h2>
                            {activeVisitors.length === 0 ? (
                                <p className="text-gray-400 py-8 text-center">No active visitors</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-left text-sm text-gray-400 border-b border-white/10">
                                                <th className="pb-3 font-medium">Name</th>
                                                <th className="pb-3 font-medium">Email</th>
                                                <th className="pb-3 font-medium">Host</th>
                                                <th className="pb-3 font-medium">Purpose</th>
                                                <th className="pb-3 font-medium">Check-in Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeVisitors.map(visitor => (
                                                <tr key={visitor.id} className="border-b border-white/5">
                                                    <td className="py-3 text-white">{visitor.name}</td>
                                                    <td className="py-3 text-gray-300">{visitor.email}</td>
                                                    <td className="py-3 text-gray-300">{visitor.host_name || '-'}</td>
                                                    <td className="py-3 text-gray-300">{visitor.purpose}</td>
                                                    <td className="py-3 text-gray-400">
                                                        {new Date(visitor.checkin_time).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <h2 className="text-lg font-semibold text-white mb-4 mt-8">History</h2>
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
                                            {checkedOutVisitors.map(visitor => (
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
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-white">Registered Hosts</h2>
                                <button
                                    onClick={() => setShowAddHost(!showAddHost)}
                                    className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors"
                                >
                                    + Add Host
                                </button>
                            </div>

                            {showAddHost && (
                                <form onSubmit={handleAddHost} className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
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
                                                <th className="pb-3 font-medium">Phone</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {hosts.map(host => (
                                                <tr key={host.id} className="border-b border-white/5">
                                                    <td className="py-3 text-white">{host.name}</td>
                                                    <td className="py-3 text-gray-300">{host.email}</td>
                                                    <td className="py-3 text-gray-300">{host.department}</td>
                                                    <td className="py-3 text-gray-400">{host.phone || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}
