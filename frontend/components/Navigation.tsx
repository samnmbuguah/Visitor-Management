'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LogOut, LayoutDashboard, UserCheck, Settings, Bell, ShieldCheck, Mail, Menu, X, User } from 'lucide-react';

export default function Navigation() {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    if (!user) return null;

    const navItems = [
        { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN'] },
        { href: '/host', label: 'Host Portal', icon: UserCheck, roles: ['HOST'] },
        { href: '/admin/invites', label: 'Invites', icon: Mail, roles: ['SUPER_ADMIN', 'ADMIN', 'HOST'] },
    ];

    const filteredItems = navItems.filter(item => item.roles.includes(user.role));

    return (
        <>
            <nav className="nav-blur">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="text-xl font-black bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white text-xs">VM</div>
                            <span className="hidden sm:inline">Visitor Management</span>
                        </Link>

                        <div className="hidden md:flex items-center gap-2">
                            {filteredItems.map(item => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isActive
                                            ? 'bg-primary/10 text-primary border border-primary/20'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                            }`}
                                    >
                                        <Icon size={18} />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex flex-col items-end mr-2">
                            <span className="text-sm font-black text-foreground">{user.username}</span>
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">{user.role}</span>
                        </div>

                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="md:hidden p-3 rounded-2xl bg-white/5 border border-white/10 text-foreground active:scale-90 transition-all font-bold"
                        >
                            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>

                        <button
                            onClick={logout}
                            className="hidden md:flex p-3 rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all border border-destructive/20 active:scale-95"
                            title="Logout"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Sidebar / Menu Overlay */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-[60] md:hidden">
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
                    <div className="absolute right-0 top-0 bottom-0 w-3/4 max-w-sm glass-card rounded-none rounded-l-[3rem] p-8 border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.3)] animate-in slide-in-from-right duration-300">
                        <div className="flex items-center justify-between mb-12">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20">
                                    <User size={24} />
                                </div>
                                <div>
                                    <p className="font-black text-foreground">{user.username}</p>
                                    <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{user.role}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsMenuOpen(false)} className="p-2 text-muted-foreground"><X size={24} /></button>
                        </div>

                        <div className="space-y-4">
                            {filteredItems.map(item => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsMenuOpen(false)}
                                        className={`flex items-center gap-4 p-5 rounded-2xl text-lg font-black transition-all ${isActive
                                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                                            : 'text-muted-foreground hover:bg-white/5'
                                            }`}
                                    >
                                        <Icon size={24} />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="absolute bottom-12 left-8 right-8">
                            <button
                                onClick={logout}
                                className="w-full flex items-center justify-center gap-3 p-5 rounded-2xl bg-destructive/10 text-destructive font-black text-lg border border-destructive/20 active:scale-95 transition-all"
                            >
                                <LogOut size={24} />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
