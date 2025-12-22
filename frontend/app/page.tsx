'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="animated-bg" />

      <div className="glass-card p-12 max-w-lg w-full text-center">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Welcome
          </h1>
          <p className="text-gray-400 text-lg">
            Visitor Management System
          </p>
        </div>

        <div className="space-y-4">
          <Link href="/checkin" className="block">
            <button className="btn-primary">
              Check In
            </button>
          </Link>

          <Link href="/checkout" className="block">
            <button className="btn-secondary">
              Check Out
            </button>
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10">
          <Link
            href="/admin"
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Admin Dashboard →
          </Link>
        </div>
      </div>
    </main>
  );
}
