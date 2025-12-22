'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getVisitors, checkoutVisitor, Visitor } from '@/lib/api';

export default function CheckOutPage() {
    const router = useRouter();
    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [loading, setLoading] = useState(true);
    const [checkingOut, setCheckingOut] = useState<number | null>(null);
    const [success, setSuccess] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadVisitors();
    }, []);

    const loadVisitors = async () => {
        try {
            const response = await getVisitors();
            // Filter for checked-in visitors only
            const activeVisitors = response.data.filter(v => v.status === 'CHECKED_IN');
            setVisitors(activeVisitors);
        } catch (err) {
            console.error('Failed to load visitors:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckout = async (id: number) => {
        setCheckingOut(id);
        try {
            await checkoutVisitor(id);
            setSuccess(true);
            setTimeout(() => {
                router.push('/');
            }, 2000);
        } catch (err) {
            console.error('Failed to checkout:', err);
            setCheckingOut(null);
        }
    };

    const filteredVisitors = visitors.filter(v =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (success) {
        return (
            <main className="min-h-screen flex items-center justify-center p-8">
                <div className="animated-bg" />
                <div className="glass-card p-12 max-w-lg w-full text-center">
                    <div className="success-checkmark mx-auto mb-6">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold mb-3 text-white">Goodbye!</h1>
                    <p className="text-gray-400 text-lg">You have successfully checked out.</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen flex items-center justify-center p-8">
            <div className="animated-bg" />

            <div className="glass-card p-10 max-w-2xl w-full">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        Visitor Check-Out
                    </h1>
                    <p className="text-gray-400">Find your name and check out</p>
                </div>

                <div className="form-group">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="premium-input"
                        placeholder="Search by name or email..."
                    />
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-400">Loading visitors...</div>
                ) : filteredVisitors.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        {searchQuery ? 'No visitors found matching your search.' : 'No active visitors.'}
                    </div>
                ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {filteredVisitors.map(visitor => (
                            <div
                                key={visitor.id}
                                className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between hover:bg-white/10 transition-colors"
                            >
                                <div>
                                    <h3 className="font-semibold text-white">{visitor.name}</h3>
                                    <p className="text-sm text-gray-400">{visitor.email}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Checked in: {new Date(visitor.checkin_time).toLocaleTimeString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleCheckout(visitor.id)}
                                    disabled={checkingOut === visitor.id}
                                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {checkingOut === visitor.id ? 'Processing...' : 'Check Out'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <Link href="/" className="block mt-6">
                    <button className="btn-secondary">
                        Back to Home
                    </button>
                </Link>
            </div>
        </main>
    );
}
