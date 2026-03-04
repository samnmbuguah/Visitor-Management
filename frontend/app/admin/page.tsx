'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
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
import {
    Users,
    Clock,
    CheckCircle2,
    XCircle,
    MapPin,
    TrendingUp,
    Filter,
    ArrowRight,
    ShieldCheck
} from 'lucide-react';

export default function AdminPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [selectedLocation, setSelectedLocation] = useState<number | undefined>(undefined);

    useEffect(() => {
        if (!loading && (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN'))) {
            router.push('/login');
        }
    }, [user, loading, router]);

    // Fetch data
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['dashboardStats', selectedLocation],
        queryFn: () => getDashboardStats(selectedLocation).then(res => res.data),
        enabled: !!user,
    });

    const { data: visitors = [], isLoading: visitorsLoading } = useQuery({
        queryKey: ['visitors', selectedLocation],
        queryFn: () => getVisitors({ location: selectedLocation }).then(res => Array.isArray(res.data) ? res.data : res.data.results || []),
        enabled: !!user,
    });

    const { data: locations = [] } = useQuery({
        queryKey: ['locations'],
        queryFn: () => getLocations().then(res => Array.isArray(res.data) ? res.data : res.data.results || []),
        enabled: !!user,
    });

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    const activeVisitors = visitors.filter(v => v.status === 'CHECKED_IN');
    const pendingVisitors = visitors.filter(v => v.status === 'PENDING');

    return (
        <main className="min-h-screen bg-background pb-20">
            <div className="animated-bg" />

            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
                            Admin <span className="text-primary italic">Portal</span>
                        </h1>
                        <p className="text-muted-foreground font-medium flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            System Monitoring Active
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative group w-full md:w-auto">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={18} />
                            <select
                                value={selectedLocation || ''}
                                onChange={(e) => setSelectedLocation(e.target.value ? Number(e.target.value) : undefined)}
                                className="premium-input pl-12 pr-10 py-3.5 bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer appearance-none min-w-[200px]"
                            >
                                <option value="">Global Network</option>
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Stats Section */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <StatCard
                        label="Active"
                        value={stats?.active_visitors || 0}
                        icon={<Users size={20} />}
                        trend="+12% up"
                        color="text-emerald-400"
                        loading={statsLoading}
                    />
                    <StatCard
                        label="Arrivals"
                        value={stats?.today_visitors || 0}
                        icon={<CheckCircle2 size={20} />}
                        trend="Normal"
                        color="text-indigo-400"
                        loading={statsLoading}
                    />
                    <StatCard
                        label="Pending"
                        value={pendingVisitors.length}
                        icon={<Clock size={20} />}
                        trend="In Queue"
                        color="text-amber-400"
                        loading={visitorsLoading}
                    />
                    <StatCard
                        label="Weekly"
                        value={stats?.week_visitors || 0}
                        icon={<TrendingUp size={20} />}
                        trend="Growth"
                        color="text-purple-400"
                        loading={statsLoading}
                    />
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Live Visitors Table */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="glass-card overflow-hidden border-white/5">
                            <div className="px-6 sm:px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                                <h3 className="text-lg font-black text-foreground uppercase tracking-widest flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-primary rounded-full" />
                                    Live Visitors
                                </h3>
                                <button className="p-2 h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-muted-foreground hover:text-primary transition-all">
                                    <Filter size={16} />
                                </button>
                            </div>

                            <div className="p-0">
                                {visitorsLoading ? (
                                    <div className="p-20 text-center font-black text-xs uppercase tracking-widest text-muted-foreground animate-pulse">Syncing Database...</div>
                                ) : activeVisitors.length === 0 ? (
                                    <div className="p-20 text-center opacity-40">
                                        <Users size={48} className="mx-auto mb-4" />
                                        <p className="font-bold">No active visitors</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] bg-white/[0.01]">
                                                    <th className="px-8 py-5">Guest Profile</th>
                                                    <th className="px-4 py-5 hidden sm:table-cell text-center">Reference</th>
                                                    <th className="px-4 py-5 text-right">Access Time</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {activeVisitors.map(visitor => (
                                                    <tr key={visitor.id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors group">
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary font-black overflow-hidden group-hover:scale-105 group-hover:border-primary/50 transition-all">
                                                                    {visitor.photo ? (
                                                                        <img src={visitor.photo} alt="" className="h-full w-full object-cover" />
                                                                    ) : visitor.name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className="font-black text-foreground group-hover:text-primary transition-colors">{visitor.name}</p>
                                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Host: {visitor.host_name || 'System'}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-6 text-center hidden sm:table-cell">
                                                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-muted-foreground tracking-widest">
                                                                {visitor.purpose?.toUpperCase() || 'GENERAL'}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-6 text-right">
                                                            <div className="inline-flex flex-col items-end">
                                                                <p className="text-sm font-black text-foreground">
                                                                    {new Date(visitor.checkin_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Authenticated</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Approvals Drawer/Sidebar */}
                    <div className="space-y-6">
                        <section className="glass-card bg-primary/[0.03] border-primary/20 p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <ShieldCheck size={80} />
                            </div>
                            <h3 className="text-xl font-black text-foreground mb-6 flex items-center gap-3">
                                Security Check
                                {pendingVisitors.length > 0 && (
                                    <span className="px-2 py-1 rounded-md bg-amber-500 text-black text-[9px] font-black animate-bounce">
                                        {pendingVisitors.length} NEW
                                    </span>
                                )}
                            </h3>

                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {visitorsLoading ? (
                                    <div className="py-10 text-center text-muted-foreground font-bold text-xs uppercase text-[10px] tracking-widest">Awaiting Link...</div>
                                ) : pendingVisitors.length === 0 ? (
                                    <div className="py-20 text-center glass-card border-dashed border-white/10 bg-transparent">
                                        <CheckCircle2 size={32} className="mx-auto mb-3 text-muted-foreground/30" />
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Clear Authorization</p>
                                    </div>
                                ) : (
                                    pendingVisitors.map(visitor => (
                                        <PendingRequestCard key={visitor.id} visitor={visitor} />
                                    ))
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </main>
    );
}

function StatCard({ label, value, icon, trend, color, loading }: any) {
    return (
        <div className="glass-card p-6 flex items-start justify-between group hover:bg-white/5 transition-all">
            <div className="space-y-4">
                <div className={`p-3 rounded-2xl bg-white/5 ${color} ring-1 ring-white/10 group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
                    <p className="text-3xl font-black text-foreground mt-1 tabular-nums">
                        {loading ? '---' : value}
                    </p>
                </div>
                <p className="text-[10px] font-bold text-muted-foreground/60">{trend}</p>
            </div>
        </div>
    );
}

function PendingRequestCard({ visitor }: { visitor: Visitor }) {
    const queryClient = useQueryClient();
    const approveMutation = useMutation({
        mutationFn: approveVisitor,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visitors'] })
    });

    const rejectMutation = useMutation({
        mutationFn: rejectVisitor,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visitors'] })
    });

    return (
        <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all space-y-4">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400 font-bold">
                    {visitor.name.charAt(0)}
                </div>
                <div>
                    <p className="text-sm font-bold text-foreground">{visitor.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Visiting {visitor.host_name}</p>
                </div>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => approveMutation.mutate(visitor.id)}
                    className="flex-1 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-500/30 transition-all border border-emerald-500/10"
                    disabled={approveMutation.isPending}
                >
                    {approveMutation.isPending ? '...' : 'Approve'}
                </button>
                <button
                    onClick={() => rejectMutation.mutate(visitor.id)}
                    className="flex-1 py-2 bg-rose-500/20 text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-500/30 transition-all border border-rose-500/10"
                    disabled={rejectMutation.isPending}
                >
                    {rejectMutation.isPending ? '...' : 'Decline'}
                </button>
            </div>
        </div>
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
