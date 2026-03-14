'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVisitors, approveVisitor, rejectVisitor, getLocations, getHosts, getVisitorTypes, createInvite, Visitor, Location, Host, VisitorType } from '@/lib/api';
import {
    Users,
    Clock,
    CheckCircle2,
    XCircle,
    ShieldCheck,
    Bell,
    LogOut,
    User,
    Calendar,
    MessageSquare,
    Mail,
    Phone,
    Building,
    Plus,
    Send
} from 'lucide-react';

import { HostPage as HostPageWrapper } from '@/components/ProtectedPage';

export default function HostPortal() {
    return (
        <HostPageWrapper>
            <HostPageContent />
        </HostPageWrapper>
    );
}

function HostPageContent() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    
    // State for invitation form
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [inviteData, setInviteData] = useState({
        visitor_name: '',
        visitor_email: '',
        visitor_phone: '',
        visitor_company: '',
        visitor_type: '',
        expected_arrival: '',
        purpose: '',
        expected_duration: ''
    });

    const { data: visitors = [], isLoading } = useQuery({
        queryKey: ['myVisitors'],
        queryFn: () => getVisitors().then(res => Array.isArray(res.data) ? res.data : res.data.results || []),
        enabled: !!user,
        // In a real app, we'd filter by host_id on the backend
        select: (data: Visitor[]) => data.filter(v => v.host_name === user?.username)
    });

    const { data: locations = [] } = useQuery({
        queryKey: ['locations'],
        queryFn: () => getLocations().then(res => Array.isArray(res.data) ? res.data : res.data.results || []),
        enabled: !!user
    });

    const { data: hosts = [] } = useQuery({
        queryKey: ['hosts'],
        queryFn: () => getHosts().then(res => Array.isArray(res.data) ? res.data : res.data.results || []),
        enabled: !!user
    });

    const { data: visitorTypes = [] } = useQuery({
        queryKey: ['visitorTypes'],
        queryFn: () => getVisitorTypes().then(res => Array.isArray(res.data) ? res.data : res.data.results || []),
        enabled: !!user
    });

    // Get current host's information
    const currentHost = hosts.find((host: Host) => host.email === user?.email);

    const inviteMutation = useMutation({
        mutationFn: createInvite,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invites'] });
            setShowInviteForm(false);
            setInviteData({
                visitor_name: '',
                visitor_email: '',
                visitor_phone: '',
                visitor_company: '',
                visitor_type: '',
                expected_arrival: '',
                purpose: '',
                expected_duration: ''
            });
        }
    });

    const approveMutation = useMutation({
        mutationFn: approveVisitor,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myVisitors'] })
    });

    const rejectMutation = useMutation({
        mutationFn: rejectVisitor,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myVisitors'] })
    });

    const handleInviteSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!inviteData.visitor_name || !inviteData.visitor_email || !inviteData.expected_arrival) {
            return;
        }

        // Find the first location (in a real app, host would have assigned location)
        const location = locations[0];
        if (!location) {
            alert('No locations available');
            return;
        }

        inviteMutation.mutate({
            ...inviteData,
            host: currentHost?.id,  // Add the current host's ID
            location: location.id,
            expected_arrival: new Date(inviteData.expected_arrival).toISOString(),
            expected_duration: inviteData.expected_duration ? parseInt(inviteData.expected_duration) : null
        });
    };

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    const pendingCount = visitors.filter(v => v.status === 'PENDING').length;
    const activeCount = visitors.filter(v => v.status === 'CHECKED_IN').length;

    return (
        <main className="min-h-screen bg-background pb-20">
            <div className="animated-bg" />

            {/* Header / Top Bar */}
            <header className="nav-blur px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary ring-1 ring-primary/20">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-foreground">Host <span className="text-primary italic">Portal</span></h1>
                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground opacity-60">Security Clearance: {user.role}</p>
                    </div>
                </div>

                <button onClick={logout} className="p-3 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 active:scale-90 transition-all">
                    <LogOut size={20} />
                </button>
            </header>

            <div className="max-w-4xl mx-auto px-6 pt-10 space-y-8">
                {/* Welcome Card */}
                <div className="glass-card p-8 bg-primary/5 border-primary/10 relative overflow-hidden group">
                    <div className="absolute -right-10 -top-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <Users size={200} />
                    </div>
                    <h2 className="text-3xl font-black text-foreground mb-2">Hello, {user.username}</h2>
                    <p className="text-muted-foreground font-medium max-w-md">
                        {pendingCount > 0
                            ? `You have ${pendingCount} visitor${pendingCount > 1 ? 's' : ''} waiting for your approval.`
                            : "You don't have any visitors waiting right now."}
                    </p>
                </div>

                {/* Quick Stats Mobile Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="glass-card p-6 border-white/5 flex flex-col gap-2">
                        <div className="p-2 bg-amber-500/10 text-amber-500 w-fit rounded-lg ring-1 ring-amber-500/20">
                            <Clock size={18} />
                        </div>
                        <span className="text-2xl font-black text-foreground">{pendingCount}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pending</span>
                    </div>
                    <div className="glass-card p-6 border-white/5 flex flex-col gap-2">
                        <div className="p-2 bg-emerald-500/10 text-emerald-500 w-fit rounded-lg ring-1 ring-emerald-500/20">
                            <CheckCircle2 size={18} />
                        </div>
                        <span className="text-2xl font-black text-foreground">{activeCount}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active</span>
                    </div>
                </div>

                {/* Invite Guest Section */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                            <Send size={20} className="text-primary" />
                            Invite Guest
                            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        </h3>
                        <button 
                            onClick={() => setShowInviteForm(!showInviteForm)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-black active:scale-95 transition-all"
                        >
                            <Plus size={16} />
                            {showInviteForm ? 'Cancel' : 'New Invitation'}
                        </button>
                    </div>

                    {showInviteForm && (
                        <div className="glass-card p-6 border-primary/10">
                            <form onSubmit={handleInviteSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-black text-foreground flex items-center gap-2">
                                            <User size={14} />
                                            Guest Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={inviteData.visitor_name}
                                            onChange={(e) => setInviteData({...inviteData, visitor_name: e.target.value})}
                                            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            placeholder="Enter guest name"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-black text-foreground flex items-center gap-2">
                                            <Mail size={14} />
                                            Email Address *
                                        </label>
                                        <input
                                            type="email"
                                            value={inviteData.visitor_email}
                                            onChange={(e) => setInviteData({...inviteData, visitor_email: e.target.value})}
                                            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            placeholder="guest@example.com"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-black text-foreground flex items-center gap-2">
                                            <Phone size={14} />
                                            Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            value={inviteData.visitor_phone}
                                            onChange={(e) => setInviteData({...inviteData, visitor_phone: e.target.value})}
                                            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            placeholder="+1 (555) 123-4567"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-black text-foreground flex items-center gap-2">
                                            <Building size={14} />
                                            Company
                                        </label>
                                        <input
                                            type="text"
                                            value={inviteData.visitor_company}
                                            onChange={(e) => setInviteData({...inviteData, visitor_company: e.target.value})}
                                            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            placeholder="Company name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-black text-foreground flex items-center gap-2">
                                            <Building size={14} />
                                            Visit Type *
                                        </label>
                                        <select
                                            value={inviteData.visitor_type}
                                            onChange={(e) => setInviteData({...inviteData, visitor_type: e.target.value})}
                                            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            required
                                        >
                                            <option value="">Select visit type</option>
                                            {visitorTypes.map((visitorType: VisitorType) => (
                                                <option key={visitorType.id} value={visitorType.id}>
                                                    {visitorType.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-black text-foreground flex items-center gap-2">
                                            <Calendar size={14} />
                                            Expected Arrival *
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={inviteData.expected_arrival}
                                            onChange={(e) => setInviteData({...inviteData, expected_arrival: e.target.value})}
                                            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-black text-foreground flex items-center gap-2">
                                            <MessageSquare size={14} />
                                            Purpose of Visit
                                        </label>
                                        <textarea
                                            value={inviteData.purpose}
                                            onChange={(e) => setInviteData({...inviteData, purpose: e.target.value})}
                                            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                                            rows={3}
                                            placeholder="Purpose of the visit..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-black text-foreground flex items-center gap-2">
                                            <Clock size={14} />
                                            Expected Duration (minutes)
                                        </label>
                                        <input
                                            type="number"
                                            value={inviteData.expected_duration}
                                            onChange={(e) => setInviteData({...inviteData, expected_duration: e.target.value})}
                                            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            placeholder="60"
                                            min="1"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="submit"
                                        disabled={inviteMutation.isPending}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-black active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        <Send size={16} />
                                        {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowInviteForm(false)}
                                        className="px-6 py-3 bg-muted text-muted-foreground rounded-xl font-black active:scale-95 transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </section>

                {/* Visitors Section */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                            Recent Activity
                            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        </h3>
                        <button className="text-[10px] font-black uppercase tracking-widest text-primary">View History</button>
                    </div>

                    <div className="space-y-4">
                        {isLoading ? (
                            <div className="p-12 text-center text-muted-foreground animate-pulse font-bold uppercase tracking-widest text-xs">Synchronizing...</div>
                        ) : visitors.length === 0 ? (
                            <div className="p-20 text-center glass-card border-dashed border-white/10 opacity-50">
                                <MessageSquare size={48} className="mx-auto mb-4 text-muted-foreground/30" />
                                <p className="font-bold text-muted-foreground">No recent visitors found.</p>
                            </div>
                        ) : (
                            visitors.map(visitor => (
                                <div key={visitor.id} className="glass-card p-6 border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 group hover:bg-white/[0.02] transition-colors">
                                    <div className="flex items-center gap-5">
                                        <div className="h-14 w-14 rounded-3xl bg-white/5 flex items-center justify-center text-primary font-black text-xl border border-white/10 group-hover:border-primary/30 transition-all overflow-hidden">
                                            {visitor.photo ? (
                                                <img src={visitor.photo} alt={visitor.name} className="h-full w-full object-cover" />
                                            ) : visitor.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-black text-foreground text-lg">{visitor.name}</h4>
                                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${visitor.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                                    visitor.status === 'CHECKED_IN' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                        'bg-white/5 text-muted-foreground border border-white/10'
                                                    }`}>
                                                    {visitor.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 mt-1">
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                                                    <Calendar size={12} />
                                                    {new Date(visitor.checkin_time || Date.now()).toLocaleDateString()}
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                                                    <Clock size={12} />
                                                    {new Date(visitor.checkin_time || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {visitor.status === 'PENDING' && (
                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                            <button
                                                onClick={() => rejectMutation.mutate(visitor.id)}
                                                className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-destructive/10 text-destructive font-black text-xs uppercase tracking-widest border border-destructive/20 hover:bg-destructive/20 transition-all active:scale-95"
                                            >
                                                Decline
                                            </button>
                                            <button
                                                onClick={() => approveMutation.mutate(visitor.id)}
                                                className="flex-1 sm:flex-none px-8 py-3 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-110 transition-all active:scale-95"
                                            >
                                                Approve
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>

            {/* Mobile Bottom Navigation Placeholder */}
            <div className="fixed bottom-0 inset-x-0 h-16 bg-background/80 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-6 sm:hidden">
                <button className="text-primary p-2"><Users size={24} /></button>
                <button className="text-muted-foreground p-2"><Bell size={24} /></button>
                <button className="text-muted-foreground p-2"><User size={24} /></button>
            </div>
        </main>
    );
}
