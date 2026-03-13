'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';

function WaitingPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const visitorId = searchParams.get('id');
    const [status, setStatus] = useState('PENDING');

    useEffect(() => {
        if (!visitorId) return;

        const interval = setInterval(async () => {
            try {
                const res = await api.get(`/visitors/${visitorId}/`);
                const visitor = res.data;
                setStatus(visitor.status);

                if (visitor.status === 'CHECKED_IN') {
                    router.push('/checkin/success');
                } else if (visitor.status === 'REJECTED') {
                    alert('Your visit request was rejected.');
                    router.push('/');
                }
            } catch (err) {
                console.error(err);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [visitorId, router]);

    return (
        <main className="min-h-screen flex items-center justify-center p-8">
            <div className="animated-bg" />
            <div className="glass-card p-12 max-w-lg w-full text-center">
                <div className="flex justify-center mb-6">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
                </div>
                <h1 className="text-3xl font-bold mb-3 text-white">Waiting for Approval</h1>
                <p className="text-gray-400 text-lg mb-2">Please wait while your host approves your visit.</p>
                <div className="mt-8 text-sm text-gray-500">
                    Status: <span className="text-blue-400 font-bold tracking-wider">{status}</span>
                </div>
            </div>
        </main>
    );
}

export default function WaitingPage() {
    return (
        <Suspense fallback={
            <main className="min-h-screen flex items-center justify-center p-8">
                <div className="animated-bg" />
                <div className="glass-card p-12 max-w-lg w-full text-center text-white">
                    Loading your visit status...
                </div>
            </main>
        }>
            <WaitingPageContent />
        </Suspense>
    );
}
