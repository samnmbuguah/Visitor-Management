'use client';

import Link from 'next/link';

export default function SuccessPage() {
    return (
        <main className="min-h-screen flex items-center justify-center p-8">
            <div className="animated-bg" />
            <div className="glass-card p-12 max-w-lg w-full text-center">
                <div className="success-checkmark mx-auto mb-6">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold mb-3 text-white">Welcome!</h1>
                <p className="text-gray-400 text-lg mb-8">You have successfully checked in.</p>

                <Link href="/">
                    <button className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white font-medium">
                        Back to Home
                    </button>
                </Link>
            </div>
        </main>
    );
}
