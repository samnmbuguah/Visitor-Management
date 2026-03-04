'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { UserPlus, UserMinus, ShieldCheck, LogIn, Clock, Users, Building2 } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative overflow-hidden">
      <div className="animated-bg" />

      {/* Top Bar for Admin Link if logged in */}
      {!user ? (
        <Link href="/login" className="absolute top-6 right-6 flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground transition-all hover:bg-white/10 active:scale-95 font-bold text-sm">
          <LogIn size={18} />
          Staff Login
        </Link>
      ) : (
        <div className="absolute top-6 right-6 flex items-center gap-4">
          <Link href="/admin" className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all font-bold text-sm active:scale-95">
            Go to Dashboard
          </Link>
        </div>
      )}

      <div className="w-full max-w-4xl text-center z-10">
        <div className="mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-primary text-sm font-bold uppercase tracking-widest mb-6">
            <Building2 size={16} />
            Visitor Management System
          </div>
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-black text-foreground mb-4 sm:mb-6 tracking-tighter leading-none">
            Welcome to <span className="bg-gradient-to-r from-primary via-indigo-400 to-primary bg-clip-text text-transparent">Our Office</span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
            Experience a seamless, secure, and modern way to visit our facility.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 w-full">
          <Link href="/checkin" className="group">
            <div className="glass-card p-8 sm:p-10 h-full flex flex-col items-center justify-center gap-5 sm:gap-6 border-white/5 hover:border-primary/30 hover:bg-primary/5 transition-all duration-500 active:scale-[0.97]">
              <div className="p-5 sm:p-6 bg-primary/10 rounded-3xl text-primary group-hover:scale-110 transition-transform duration-500 ring-1 ring-primary/20">
                <UserPlus size={40} className="sm:w-12 sm:h-12" />
              </div>
              <div className="space-y-1.5 text-center">
                <h2 className="text-2xl sm:text-3xl font-black text-foreground">Check In</h2>
                <p className="text-muted-foreground text-sm sm:text-base">Register your visit and notify your host</p>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-primary w-0 group-hover:w-full transition-all duration-700 ease-out" />
              </div>
            </div>
          </Link>

          <Link href="/checkout" className="group">
            <div className="glass-card p-8 sm:p-10 h-full flex flex-col items-center justify-center gap-5 sm:gap-6 border-white/5 hover:border-indigo-400/30 hover:bg-indigo-400/5 transition-all duration-500 active:scale-[0.97]">
              <div className="p-5 sm:p-6 bg-indigo-400/10 rounded-3xl text-indigo-400 group-hover:scale-110 transition-transform duration-500 ring-1 ring-indigo-400/20">
                <UserMinus size={40} className="sm:w-12 sm:h-12" />
              </div>
              <div className="space-y-1.5 text-center">
                <h2 className="text-2xl sm:text-3xl font-black text-foreground">Check Out</h2>
                <p className="text-muted-foreground text-sm sm:text-base">Quickly sign out as you leave</p>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-indigo-400 w-0 group-hover:w-full transition-all duration-700 ease-out" />
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-12 sm:mt-20 grid grid-cols-3 gap-4 sm:gap-6 opacity-60">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm font-bold text-muted-foreground">
            <ShieldCheck size={18} className="text-primary" />
            <span>Secure</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm font-bold text-muted-foreground">
            <Clock size={18} className="text-primary" />
            <span>Instant</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm font-bold text-muted-foreground">
            <Users size={18} className="text-primary" />
            <span>Efficient</span>
          </div>
        </div>
      </div>

      {/* Bottom Credit */}
      <div className="absolute bottom-8 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] opacity-30">
        Powered by Global Visitor Network
      </div>
    </main>
  );
}
