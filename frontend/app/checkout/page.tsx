'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getVisitors, checkoutVisitor, Visitor } from '@/lib/api';
import { UserMinus, Search, History, Clock, ArrowLeft, CheckCircle2, User, RefreshCw } from 'lucide-react';

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
            const data = Array.isArray(response.data) ? response.data : response.data.results || [];
            const activeVisitors = data.filter((v: any) => v.status === 'CHECKED_IN');
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
            }, 3000);
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
            <main className="min-h-screen flex items-center justify-center p-8 bg-background">
                <div className="animated-bg" />
                <div className="glass-card p-12 max-w-lg w-full text-center scale-up">
                    <div className="mb-8 bg-indigo-500/10 p-6 rounded-full inline-block ring-2 ring-indigo-500/20">
                        <History size={64} className="text-indigo-400" />
                    </div>
                    <h1 className="text-5xl font-black mb-4 text-foreground tracking-tight">Goodbye!</h1>
                    <p className="text-muted-foreground text-xl mb-2 font-medium">You have successfully checked out.</p>
                    <p className="text-primary text-sm font-bold uppercase tracking-widest mt-6 animate-pulse">Safely on your way...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
            <div className="animated-bg" />

            <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all group">
                <div className="p-2 rounded-xl bg-white/5 border border-white/10 group-hover:bg-white/10">
                    <ArrowLeft size={20} />
                </div>
                <span className="font-bold uppercase tracking-widest text-xs">Exit Kiosk</span>
            </Link>

            <div className="glass-card p-10 max-w-2xl w-full border-white/5 shadow-2xl backdrop-blur-3xl">
                <div className="mb-10 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold mb-2 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                            Self Check-Out
                        </h1>
                        <p className="text-muted-foreground font-medium">Please locate your name to sign out</p>
                    </div>
                    <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400 ring-1 ring-indigo-500/20 hidden md:block">
                        <UserMinus size={32} />
                    </div>
                </div>

                <div className="relative mb-8">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="premium-input pl-12"
                        placeholder="Search your name..."
                    />
                </div>

                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    {loading ? (
                        <div className="text-center py-20 flex flex-col items-center gap-4">
                            <RefreshCw className="animate-spin text-primary" size={32} />
                            <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Accessing Visitor Log...</p>
                        </div>
                    ) : filteredVisitors.length === 0 ? (
                        <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                            <p className="text-muted-foreground font-medium italic">
                                {searchQuery ? "We couldn't find a visitor by that name." : "No visitors are currently checked in."}
                            </p>
                        </div>
                    ) : (
                        filteredVisitors.map(visitor => (
                            <div
                                key={visitor.id}
                                className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between hover:bg-white/10 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-muted-foreground font-bold transition-all group-hover:bg-primary/10 group-hover:text-primary">
                                        {visitor.photo ? (
                                            <img src={visitor.photo} alt="" className="h-full w-full object-cover rounded-2xl" />
                                        ) : <User size={24} />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{visitor.name}</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <div className="flex items-center gap-1 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                                <Clock size={10} />
                                                {new Date(visitor.checkin_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleCheckout(visitor.id)}
                                    disabled={checkingOut === visitor.id}
                                    className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                                >
                                    {checkingOut === visitor.id ? (
                                        <RefreshCw className="animate-spin" size={18} />
                                    ) : (
                                        <>Finalize <ArrowLeft size={18} className="rotate-180" /></>
                                    )}
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-10 pt-8 border-t border-white/5">
                    <Link href="/" className="block">
                        <button className="btn-secondary">
                            Return to Welcome Screen
                        </button>
                    </Link>
                </div>
            </div>
        </main>
    );
}
