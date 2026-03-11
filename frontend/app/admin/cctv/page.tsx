'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getCameras, getLiveCamera, Camera } from '@/lib/api';
import { Shield, Camera as CameraIcon, Activity, RefreshCw, Eye } from 'lucide-react';

export default function CCTVPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
    const [liveFrame, setLiveFrame] = useState<string | null>(null);
    const [refreshInterval, setRefreshInterval] = useState(1000);

    useEffect(() => {
        if (!loading && (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN'))) {
            router.push('/login');
        }
    }, [user, loading, router]);

    // Fetch all cameras
    const { data: cameras = [], isLoading: loadingCameras } = useQuery({
        queryKey: ['cameras'],
        queryFn: () => getCameras().then(res => res.data.results || res.data),
        enabled: !!user,
    });

    // Fetch live frame for selected camera
    useEffect(() => {
        let interval: NodeJS.Timeout;

        const fetchFrame = async () => {
            if (selectedCamera || (cameras.length > 0 && !selectedCamera)) {
                try {
                    const id = selectedCamera || cameras.find((c: Camera) => c.status === 'ONLINE')?.id;
                    if (id) {
                        const res = await getLiveCamera(id);
                        setLiveFrame(res.data.frame);
                    }
                } catch (err) {
                    console.error("Error fetching camera frame:", err);
                }
            }
        };

        if (cameras.length > 0) {
            fetchFrame();
            interval = setInterval(fetchFrame, refreshInterval);
        }

        return () => clearInterval(interval);
    }, [selectedCamera, cameras, refreshInterval]);

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

            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground flex items-center gap-3">
                            <Shield className="text-primary" size={32} />
                            CCTV <span className="text-primary italic">Live</span>
                        </h1>
                        <p className="text-muted-foreground font-medium flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Real-time security monitoring & recognition
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={refreshInterval}
                            onChange={(e) => setRefreshInterval(Number(e.target.value))}
                            className="premium-input bg-white/5 border-white/10 py-3 px-4 min-w-[180px]"
                        >
                            <option value={500}>High Detail (2fps)</option>
                            <option value={1000}>Standard (1fps)</option>
                            <option value={3000}>Efficient (0.3fps)</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Camera List */}
                    <div className="lg:col-span-1 space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Active Feeds</h3>
                        {loadingCameras ? (
                            <div className="animate-pulse space-y-3">
                                {[1, 2, 3].map(i => <div key={i} className="h-20 glass-card" />)}
                            </div>
                        ) : cameras.length === 0 ? (
                            <div className="text-center py-10 glass-card">
                                <CameraIcon size={32} className="mx-auto text-muted-foreground opacity-20 mb-2" />
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No Cameras Found</p>
                            </div>
                        ) : (
                            cameras.map((camera: Camera) => (
                                <button
                                    key={camera.id}
                                    onClick={() => setSelectedCamera(camera.id)}
                                    className={`w-full p-4 rounded-2xl border transition-all text-left flex items-center gap-4 ${
                                        selectedCamera === camera.id || (!selectedCamera && cameras[0].id === camera.id)
                                            ? 'glass-card bg-primary/10 border-primary/20 shadow-[0_0_20px_rgba(79,70,229,0.1)]'
                                            : 'glass-card border-white/5 hover:border-white/20'
                                    }`}
                                >
                                    <div className={`w-3 h-3 rounded-full ${camera.status === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-destructive'}`} />
                                    <div>
                                        <p className="font-black text-sm text-foreground">{camera.name}</p>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{camera.location_name || 'Main Entrance'}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Live Feed View */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="relative aspect-video rounded-[2rem] overflow-hidden bg-card border border-border shadow-2xl group">
                            {liveFrame ? (
                                <img src={liveFrame} alt="Live Feed" className="w-full h-full object-cover" />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                                    <RefreshCw className="animate-spin mb-4" size={48} />
                                    <p className="font-black uppercase tracking-widest text-xs">Initializing Secure Stream...</p>
                                </div>
                            )}

                            {/* HUD Overlays */}
                            <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <div className="bg-card/60 backdrop-blur-md p-3 rounded-xl border border-border flex items-center gap-3">
                                        <Activity className="text-primary" size={16} />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Live // 1080P // OCR Active</span>
                                    </div>
                                    <div className="text-xs font-mono text-foreground/40">{new Date().toLocaleTimeString()}</div>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="space-y-2">
                                        <div className="bg-primary/20 backdrop-blur-md px-3 py-1 rounded-full border border-primary/30 flex items-center gap-2">
                                            <Eye size={12} className="text-primary" />
                                            <span className="text-[10px] font-black text-primary uppercase">Face Recognition Online</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detection Feed */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="glass-card p-6">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Plate Detections</h3>
                                <div className="space-y-3">
                                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                                        <span className="font-mono text-lg font-black tracking-tighter text-foreground">KCA-492X</span>
                                        <span className="text-[10px] font-black text-emerald-500 uppercase">Authorized</span>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between opacity-50">
                                        <span className="font-mono text-lg font-black tracking-tighter text-foreground">KBD-112Z</span>
                                        <span className="text-[10px] font-black text-muted-foreground uppercase">10:32 AM</span>
                                    </div>
                                </div>
                            </div>
                            <div className="glass-card p-6">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Face Recognition</h3>
                                <div className="space-y-3">
                                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">JD</div>
                                        <div>
                                            <p className="text-xs font-black text-foreground">John Doe (Host)</p>
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase">Confidence 98%</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
