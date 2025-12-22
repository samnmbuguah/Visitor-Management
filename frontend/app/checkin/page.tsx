'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createVisitor, getHosts, Host, VisitorCreate } from '@/lib/api';

export default function CheckInPage() {
    const router = useRouter();
    const [hosts, setHosts] = useState<Host[]>([]);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState<VisitorCreate>({
        name: '',
        email: '',
        phone: '',
        host: 0,
        purpose: '',
    });

    useEffect(() => {
        loadHosts();
    }, []);

    const loadHosts = async () => {
        try {
            const response = await getHosts();
            setHosts(response.data);
        } catch (err) {
            console.error('Failed to load hosts:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await createVisitor(formData);
            setSuccess(true);
            setTimeout(() => {
                router.push('/');
            }, 3000);
        } catch (err) {
            setError('Failed to check in. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'host' ? parseInt(value) : value
        }));
    };

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
                    <h1 className="text-3xl font-bold mb-3 text-white">Welcome!</h1>
                    <p className="text-gray-400 text-lg mb-2">You have successfully checked in.</p>
                    <p className="text-gray-500 text-sm">Your host has been notified.</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen flex items-center justify-center p-8">
            <div className="animated-bg" />

            <div className="glass-card p-10 max-w-lg w-full">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        Visitor Check-In
                    </h1>
                    <p className="text-gray-400">Please fill in your details</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Full Name *</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="premium-input"
                            placeholder="Enter your full name"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email Address *</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="premium-input"
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Phone Number *</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="premium-input"
                            placeholder="+1 (555) 000-0000"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Who are you visiting? *</label>
                        <select
                            name="host"
                            value={formData.host}
                            onChange={handleChange}
                            className="premium-select"
                            required
                        >
                            <option value="">Select a host</option>
                            {hosts.map(host => (
                                <option key={host.id} value={host.id}>
                                    {host.name} - {host.department}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Purpose of Visit *</label>
                        <input
                            type="text"
                            name="purpose"
                            value={formData.purpose}
                            onChange={handleChange}
                            className="premium-input"
                            placeholder="Meeting, Interview, Delivery..."
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-primary mt-4"
                        disabled={loading}
                    >
                        {loading ? 'Checking In...' : 'Complete Check-In'}
                    </button>

                    <Link href="/" className="block mt-4">
                        <button type="button" className="btn-secondary">
                            Cancel
                        </button>
                    </Link>
                </form>
            </div>
        </main>
    );
}
