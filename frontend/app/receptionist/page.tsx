'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Users, UserCheck, LogOut, QrCode, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function ReceptionistPageContent() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'checkin' | 'checkout' | 'search'>('checkin');

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
                        <div className="text-center py-12">
                            <QrCode size={64} className="mx-auto mb-4 text-primary" />
                            <h2 className="text-2xl font-black mb-2">Visitor Check-In</h2>
                            <p className="text-muted-foreground mb-6">Scan QR code or register new visitor</p>
                            <div className="flex gap-4 justify-center">
                                <Button size="lg">Scan QR Code</Button>
                                <Button variant="outline" size="lg">Manual Registration</Button>
                            </div>
                        </div>
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
