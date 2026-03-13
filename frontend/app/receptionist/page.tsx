'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Users, UserCheck, LogOut, QrCode, Search, User, Mail, Phone, Building, Plus, X, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLocations, createVisitor, getHosts, getVisitorTypes, Location, Host, VisitorType } from '@/lib/api';

function ReceptionistPageContent() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'checkin' | 'checkout' | 'search'>('checkin');
    const [showManualForm, setShowManualForm] = useState(false);
    const [visitorData, setVisitorData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        visitor_type: '',
        purpose: '',
        expected_duration: '',
        host: '',
        location: ''
    });
    
    const queryClient = useQueryClient();

    // Get locations and hosts for the form
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

    const createVisitorMutation = useMutation({
        mutationFn: createVisitor,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['visitors'] });
            setShowManualForm(false);
            setVisitorData({
                name: '',
                email: '',
                phone: '',
                company: '',
                visitor_type: '',
                purpose: '',
                expected_duration: '',
                host: '',
                location: ''
            });
            alert('Guest registered successfully! They are now awaiting host approval.');
        },
        onError: (error) => {
            alert('Failed to register visitor. Please check the information and try again.');
        }
    });

    const handleManualRegistration = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!visitorData.name || !visitorData.email || !visitorData.host || !visitorData.location) {
            alert('Please fill in all required fields');
            return;
        }

        createVisitorMutation.mutate({
            name: visitorData.name,
            email: visitorData.email,
            phone: visitorData.phone,
            company: visitorData.company,
            purpose: visitorData.purpose,
            visitor_type: visitorData.visitor_type ? parseInt(visitorData.visitor_type) : undefined,
            expected_duration: visitorData.expected_duration ? parseInt(visitorData.expected_duration) : null,
            host: parseInt(visitorData.host),
            location: parseInt(visitorData.location),
            status: 'PENDING'  // Explicitly set to PENDING for host approval
        });
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-foreground">Receptionist Portal</h1>
                        <p className="text-muted-foreground">Visitor check-in and check-out management</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="font-black text-foreground">{user.username}</p>
                            <p className="text-sm uppercase font-black tracking-widest text-muted-foreground opacity-60">{user.role}</p>
                        </div>
                        <Button onClick={logout} variant="destructive" size="sm">
                            <LogOut size={16} className="mr-2" />
                            Logout
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="max-w-7xl mx-auto mb-6">
                <div className="flex gap-2 p-1 bg-white rounded-xl border border-border/50 shadow-sm">
                    <button
                        onClick={() => setActiveTab('checkin')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold transition-all ${
                            activeTab === 'checkin'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
                        }`}
                    >
                        <UserCheck size={18} />
                        Check-In
                    </button>
                    <button
                        onClick={() => setActiveTab('checkout')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold transition-all ${
                            activeTab === 'checkout'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
                        }`}
                    >
                        <LogOut size={18} />
                        Check-Out
                    </button>
                    <button
                        onClick={() => setActiveTab('search')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold transition-all ${
                            activeTab === 'search'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
                        }`}
                    >
                        <Search size={18} />
                        Search
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto">
                <Card className="p-8">
                    {activeTab === 'checkin' && (
                        !showManualForm ? (
                            <div className="text-center py-12">
                                <QrCode size={64} className="mx-auto mb-4 text-primary" />
                                <h2 className="text-2xl font-black mb-2">Guest Check-In</h2>
                                <p className="text-muted-foreground mb-6">Scan QR code or register guest for host approval</p>
                                <div className="flex gap-4 justify-center">
                                    <Button size="lg">Scan QR Code</Button>
                                    <Button 
                                        variant="outline" 
                                        size="lg"
                                        onClick={() => setShowManualForm(true)}
                                    >
                                        Register Guest
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-2xl font-black mb-2">Register Guest for Host Approval</h2>
                                        <p className="text-muted-foreground">Register a new guest who will await host approval before check-in</p>
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => setShowManualForm(false)}
                                    >
                                        <X size={16} className="mr-2" />
                                        Cancel
                                    </Button>
                                </div>
                                
                                <form onSubmit={handleManualRegistration} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-black text-foreground flex items-center gap-2">
                                                <User size={14} />
                                                Visitor Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={visitorData.name}
                                                onChange={(e) => setVisitorData({...visitorData, name: e.target.value})}
                                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                placeholder="Enter visitor name"
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
                                                value={visitorData.email}
                                                onChange={(e) => setVisitorData({...visitorData, email: e.target.value})}
                                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                placeholder="visitor@example.com"
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
                                                value={visitorData.phone}
                                                onChange={(e) => setVisitorData({...visitorData, phone: e.target.value})}
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
                                                value={visitorData.company}
                                                onChange={(e) => setVisitorData({...visitorData, company: e.target.value})}
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
                                                value={visitorData.visitor_type}
                                                onChange={(e) => setVisitorData({...visitorData, visitor_type: e.target.value})}
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
                                            <label className="text-sm font-black text-foreground">
                                                Host *
                                            </label>
                                            <select
                                                value={visitorData.host}
                                                onChange={(e) => setVisitorData({...visitorData, host: e.target.value})}
                                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                required
                                            >
                                                <option value="">Select a host</option>
                                                {hosts.map((host: Host) => (
                                                    <option key={host.id} value={host.id}>
                                                        {host.name} - {host.email}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-black text-foreground">
                                                Location *
                                            </label>
                                            <select
                                                value={visitorData.location}
                                                onChange={(e) => setVisitorData({...visitorData, location: e.target.value})}
                                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                required
                                            >
                                                <option value="">Select a location</option>
                                                {locations.map((location: Location) => (
                                                    <option key={location.id} value={location.id}>
                                                        {location.name} - {location.floor}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-black text-foreground flex items-center gap-2">
                                                <Clock size={14} />
                                                Expected Duration (minutes)
                                            </label>
                                            <input
                                                type="number"
                                                value={visitorData.expected_duration}
                                                onChange={(e) => setVisitorData({...visitorData, expected_duration: e.target.value})}
                                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                placeholder="60"
                                                min="1"
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-sm font-black text-foreground">
                                                Purpose of Visit
                                            </label>
                                            <textarea
                                                value={visitorData.purpose}
                                                onChange={(e) => setVisitorData({...visitorData, purpose: e.target.value})}
                                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                                                rows={3}
                                                placeholder="Purpose of the visit..."
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <Button
                                            type="submit"
                                            disabled={createVisitorMutation.isPending}
                                            className="flex-1"
                                        >
                                            {createVisitorMutation.isPending ? 'Registering...' : 'Register Visitor'}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setShowManualForm(false)}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        )
                    )}

                    {activeTab === 'checkout' && (
                        <div className="text-center py-12">
                            <LogOut size={64} className="mx-auto mb-4 text-primary" />
                            <h2 className="text-2xl font-black mb-2">Visitor Check-Out</h2>
                            <p className="text-muted-foreground mb-6">Search visitor to check out</p>
                            <Button size="lg">Search Visitors</Button>
                        </div>
                    )}

                    {activeTab === 'search' && (
                        <div className="text-center py-12">
                            <Search size={64} className="mx-auto mb-4 text-primary" />
                            <h2 className="text-2xl font-black mb-2">Search Visitors</h2>
                            <p className="text-muted-foreground mb-6">Find visitors by name, email, or phone</p>
                            <Button size="lg">Search Database</Button>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

export default function ReceptionistPage() {
    return (
        <ReceptionistPageContent />
    );
}
