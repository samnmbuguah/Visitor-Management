'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { loginUser } from '@/lib/api';
import { Lock, User, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await loginUser(credentials);
            login(res.data.access);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || 'Invalid username or password');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCredentials(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-6 bg-background">
            <div className="animated-bg" />

            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="inline-flex p-4 bg-primary/10 rounded-3xl mb-6 text-primary ring-1 ring-primary/20">
                        <ShieldCheck size={40} />
                    </div>
                    <h1 className="text-4xl font-extrabold text-foreground mb-3 tracking-tight">Welcome Back</h1>
                    <p className="text-muted-foreground text-lg">Secure Access to Visitor Management</p>
                </div>

                <div className="glass-card p-10 border-white/5 bg-white/5 backdrop-blur-3xl shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium animate-shake">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground/80 px-1">Username</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                                <input
                                    type="text"
                                    name="username"
                                    value={credentials.username}
                                    onChange={handleChange}
                                    className="premium-input pl-12"
                                    placeholder="Enter your username"
                                    autoComplete="username"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground/80 px-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={credentials.password}
                                    onChange={handleChange}
                                    className="premium-input pl-12 pr-12"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                className="btn-primary group"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <>
                                        Sign In
                                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 pt-8 border-t border-white/5 text-center">
                        <p className="text-muted-foreground text-sm">
                            Only authorized personnel can access the dashboard.
                            <span className="block mt-1">Need help? Contact system administrator.</span>
                        </p>
                    </div>
                </div>

                <div className="mt-12 flex items-center justify-center gap-6">
                    <span className="h-px bg-white/5 flex-1"></span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Secure Session</span>
                    <span className="h-px bg-white/5 flex-1"></span>
                </div>
            </div>
        </main>
    );
}
