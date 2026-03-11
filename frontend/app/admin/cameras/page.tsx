'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCameras, createCamera, deleteCamera, getLocations, Camera, Location } from '@/lib/api';
import { Camera as CameraIcon, Plus, Settings2, Trash2, MapPin, Link as LinkIcon, ShieldCheck } from 'lucide-react';

export default function CameraManagementPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        if (!loading && (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN'))) {
            router.push('/login');
        }
    }, [user, loading, router]);

    // Queries
    const { data: cameras = [], isLoading: loadingCameras } = useQuery({
        queryKey: ['cameras'],
        queryFn: () => getCameras().then(res => res.data.results || res.data),
        enabled: !!user,
    });

    const { data: locations = [] } = useQuery({
        queryKey: ['locations'],
        queryFn: () => getLocations().then(res => res.data.results || res.data),
        enabled: !!user,
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: createCamera,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cameras'] });
            setIsAdding(false);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteCamera,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cameras'] })
    });

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-background pb-20">
            <div className="animated-bg" />

            <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
                            Camera <span className="text-primary italic">Control</span>
                        </h1>
                        <p className="text-muted-foreground font-medium flex items-center gap-2">
                            <Settings2 size={16} />
                            Manage RTSP feeds & recognition hardware
                        </p>
                    </div>

                    <button
                        onClick={() => setIsAdding(true)}
                        className="btn-primary w-auto flex items-center gap-2 px-6 py-3"
                    >
                        <Plus size={20} />
                        Add New Camera
                    </button>
                </div>

                {/* Add Form */}
                {isAdding && (
                    <div className="glass-card p-8 bg-primary/[0.02] border-primary/20">
                        <h2 className="text-lg font-black mb-6 flex items-center gap-3 text-foreground">
                            <Plus className="text-primary" size={20} />
                            Register Hardware
                        </h2>
                        <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            createMutation.mutate(Object.fromEntries(formData));
                        }}>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Friendly Name</label>
                                <input name="name" className="premium-input" placeholder="Main Entrance Cam 01" required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Location</label>
                                <select name="location" className="premium-input" required>
                                    <option value="">Select location...</option>
                                    {locations.map((loc: Location) => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">RTSP Stream URL</label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                    <input name="rtsp_url" className="premium-input pl-12" placeholder="rtsp://admin:pass@192.168.1.100:554/live" required />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" className="btn-primary w-auto px-8" disabled={createMutation.isPending}>
                                    {createMutation.isPending ? 'Syncing...' : 'Save Camera'}
                                </button>
                                <button type="button" onClick={() => setIsAdding(false)} className="btn-secondary w-auto px-8">Cancel</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Camera Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loadingCameras ? (
                        [1, 2, 3].map(i => <div key={i} className="h-48 glass-card animate-pulse" />)
                    ) : cameras.length === 0 ? (
                        <div className="col-span-full py-20 text-center glass-card border-dashed border-white/10 bg-transparent">
                            <CameraIcon size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                            <p className="font-black text-muted-foreground uppercase tracking-[0.2em] text-xs">No hardware configured</p>
                        </div>
                    ) : (
                        cameras.map((camera: Camera) => (
                            <div key={camera.id} className="glass-card p-6 hover:border-primary/20 transition-all group relative overflow-hidden">
                                <div className="flex items-start justify-between relative z-10">
                                    <div className={`p-4 rounded-2xl ${camera.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                                        <CameraIcon size={24} />
                                    </div>
                                    <div className="flex gap-1">
                                        <button className="p-2 text-muted-foreground hover:text-primary transition-colors">
                                            <Settings2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => deleteMutation.mutate(camera.id)}
                                            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-6 space-y-1 relative z-10">
                                    <h3 className="text-xl font-black text-foreground">{camera.name}</h3>
                                    <p className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                                        <MapPin size={12} className="text-primary" />
                                        {camera.location_name || 'Main Lobby'}
                                    </p>
                                </div>

                                <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                        camera.status === 'ONLINE' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-destructive/10 border-destructive/20 text-destructive'
                                    }`}>
                                        {camera.status}
                                    </span>
                                    <span className="text-[10px] font-black text-muted-foreground uppercase opacity-40">
                                        {camera.total_detections || 0} detections
                                    </span>
                                </div>

                                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform text-primary">
                                    <ShieldCheck size={120} />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </main>
    );
}
