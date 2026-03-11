'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyProfile, updateMyProfile } from '@/lib/api';
import { User, Mail, Phone, Shield, Bell, Save, UserCircle, Camera } from 'lucide-react';

export default function ProfilePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: ''
    });
    const [activeTab, setActiveTab] = useState('personal');

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ['myProfile'],
        queryFn: () => getMyProfile().then(res => res.data),
        enabled: !!user,
    });

    useEffect(() => {
        if (profile) {
            setFormData({
                username: profile.user.username,
                first_name: profile.user.first_name || '',
                last_name: profile.user.last_name || '',
                email: profile.user.email,
                phone: profile.profile.phone || ''
            });
        }
    }, [profile]);

    const updateMutation = useMutation({
        mutationFn: updateMyProfile,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myProfile'] })
    });

    if (loading || !user || profileLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    const tabs = [
        { id: 'personal', label: 'Personal Info', icon: UserCircle },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Shield },
    ];

    return (
        <main className="min-h-screen bg-background pb-20">
            <div className="animated-bg" />

            <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-10">
                {/* Header */}
                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[2rem] bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary overflow-hidden">
                            <User size={48} />
                        </div>
                        <button className="absolute -bottom-2 -right-2 p-2 bg-primary rounded-xl text-primary-foreground shadow-lg hover:scale-110 transition-transform">
                            <Camera size={16} />
                        </button>
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
                            Account <span className="text-primary italic">Settings</span>
                        </h1>
                        <p className="text-muted-foreground font-medium flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            {profile?.profile.role || user.role} · Member since {new Date(profile?.profile.created_at || Date.now()).getFullYear()}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Sidebar Tabs */}
                    <div className="lg:col-span-1 space-y-2">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full p-4 rounded-2xl flex items-center gap-3 font-black text-sm transition-all ${
                                        isActive
                                            ? 'bg-primary/10 border border-primary/20 text-primary'
                                            : 'hover:bg-white/5 border border-transparent text-muted-foreground'
                                    }`}
                                >
                                    <Icon size={20} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Form */}
                    <div className="lg:col-span-2 glass-card p-8">
                        {activeTab === 'personal' && (
                            <div className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Username</label>
                                        <input
                                            value={formData.username}
                                            readOnly
                                            className="premium-input opacity-50 cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                            <input
                                                value={formData.email}
                                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                                className="premium-input pl-12"
                                                placeholder="john@example.com"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">First Name</label>
                                        <input
                                            value={formData.first_name}
                                            onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                                            className="premium-input"
                                            placeholder="John"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Last Name</label>
                                        <input
                                            value={formData.last_name}
                                            onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                                            className="premium-input"
                                            placeholder="Doe"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Phone Number</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                            <input
                                                value={formData.phone}
                                                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                                className="premium-input pl-12"
                                                placeholder="+1 (555) 000-0000"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-white/5">
                                    <button
                                        onClick={() => updateMutation.mutate(formData)}
                                        className="btn-primary w-full md:w-auto flex items-center gap-2 px-8 py-4"
                                        disabled={updateMutation.isPending}
                                    >
                                        <Save size={20} />
                                        {updateMutation.isPending ? 'Saving Changes...' : 'Update Profile'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-black text-foreground">Notification Preferences</h3>
                                <div className="space-y-4">
                                    {[
                                        { label: 'Email Notifications', description: 'Receive alerts via email' },
                                        { label: 'Push Notifications', description: 'Browser and mobile push alerts' },
                                        { label: 'Security Alerts', description: 'Critical security events' },
                                        { label: 'Visitor Arrivals', description: 'When visitors check in' },
                                    ].map((pref, i) => (
                                        <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/5">
                                            <div>
                                                <p className="font-bold text-foreground text-sm">{pref.label}</p>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{pref.description}</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" defaultChecked={i < 2} className="sr-only peer" />
                                                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-white/10 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-black text-foreground">Security Settings</h3>
                                <div className="space-y-4">
                                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                                        <p className="font-bold text-foreground text-sm mb-2">Change Password</p>
                                        <div className="space-y-3">
                                            <input type="password" className="premium-input" placeholder="Current Password" />
                                            <input type="password" className="premium-input" placeholder="New Password" />
                                            <input type="password" className="premium-input" placeholder="Confirm New Password" />
                                        </div>
                                        <button className="btn-primary w-full md:w-auto mt-4 px-8">Update Password</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
