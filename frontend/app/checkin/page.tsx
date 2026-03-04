'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createVisitor, getHosts, Host, VisitorCreate, scanPreRegistration, checkinPreRegistration, searchVisitor } from '@/lib/api';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, Camera, RefreshCw, X, ArrowLeft, CheckCircle2, Search, User, Mail, Phone, Briefcase, UserCircle } from 'lucide-react';
import Webcam from 'react-webcam';
import { useRef, useCallback } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { getLocations, Location } from '@/lib/api';

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
        photo: '',
    });

    const webcamRef = useRef<Webcam>(null);
    const [showCamera, setShowCamera] = useState(false);

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            setFormData(prev => ({ ...prev, photo: imageSrc }));
            setShowCamera(false);
        }
    }, [webcamRef]);

    const [scanning, setScanning] = useState(false);
    const [returningMode, setReturningMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState('');

    const [showNda, setShowNda] = useState(false);
    const [locations, setLocations] = useState<Location[]>([]);
    const sigPad = useRef<SignatureCanvas>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setSearching(true);
        setSearchError('');

        try {
            const res = await searchVisitor(searchQuery);
            const visitor = res.data;

            setFormData(prev => ({
                ...prev,
                name: visitor.name,
                email: visitor.email,
                phone: visitor.phone,
                company: visitor.company || '',
            }));

            setReturningMode(false);
        } catch (err) {
            setSearchError('No previous visit found with these details.');
        } finally {
            setSearching(false);
        }
    };

    useEffect(() => {
        if (scanning) {
            const scanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                false
            );

            scanner.render(onScanSuccess, (err) => {
                // Ignore errors
            });

            return () => {
                scanner.clear().catch(console.error);
            };
        }
    }, [scanning]);

    const onScanSuccess = async (decodedText: string) => {
        setScanning(false);
        setLoading(true);
        try {
            const res = await scanPreRegistration(decodedText);
            const invite = res.data;

            setFormData({
                name: invite.visitor_name,
                email: invite.visitor_email,
                phone: invite.visitor_phone || '',
                host: invite.host,
                purpose: 'Pre-registered Visit',
                company: invite.visitor_company
            });

            alert(`Welcome back ${invite.visitor_name}! Please review your details.`);
        } catch (err: any) {
            console.error(err);
            setError('Invalid or expired QR code.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHosts();
        loadLocations();
    }, []);

    const loadLocations = async () => {
        try {
            const response = await getLocations();
            setLocations(response.data);
        } catch (err) {
            console.error(err);
        }
    }

    const loadHosts = async () => {
        try {
            const response = await getHosts();
            // Handle paginated responses
            const hostData = Array.isArray(response.data) ? response.data : response.data.results || [];
            setHosts(hostData);
        } catch (err) {
            console.error('Failed to load hosts:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const selectedHost = hosts.find(h => h.id === formData.host);
        if (selectedHost && selectedHost.location) {
            const loc = locations.find(l => l.id === selectedHost.location);
            if (loc && loc.require_nda && !formData.nda_accepted) {
                setShowNda(true);
                return;
            }
        }

        setLoading(true);

        try {
            const res = await createVisitor(formData);

            if (res.data.status === 'PENDING') {
                router.push(`/checkin/waiting?id=${res.data.id}`);
            } else {
                setSuccess(true);
                setTimeout(() => router.push('/'), 3000);
            }
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
            <main className="min-h-screen flex items-center justify-center p-8 bg-background">
                <div className="animated-bg" />
                <div className="glass-card p-12 max-w-lg w-full text-center scale-up">
                    <div className="success-checkmark mx-auto mb-8 bg-emerald-500/10 p-6 rounded-full inline-block ring-2 ring-emerald-500/20">
                        <CheckCircle2 size={64} className="text-emerald-400" />
                    </div>
                    <h1 className="text-5xl font-black mb-4 text-foreground tracking-tight">Welcome!</h1>
                    <p className="text-muted-foreground text-xl mb-2 font-medium">You have successfully checked in.</p>
                    <p className="text-primary text-sm font-bold uppercase tracking-widest mt-6 animate-pulse">Redirecting home...</p>
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

            <div className="glass-card p-10 max-w-2xl w-full border-white/5 shadow-2xl backdrop-blur-3xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <UserCircle size={120} className="text-primary" />
                </div>

                <div className="mb-10 text-center md:text-left">
                    <h1 className="text-4xl font-extrabold mb-2 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                        Visitor Registration
                    </h1>
                    <p className="text-muted-foreground font-medium">Identify yourself to begin your visit</p>

                    <div className="flex flex-col sm:flex-row gap-4 mt-8">
                        <button
                            onClick={() => setScanning(true)}
                            className="flex-1 px-6 py-4 bg-primary/10 text-primary rounded-2xl hover:bg-primary/20 transition-all flex items-center justify-center gap-3 border border-primary/20 font-bold"
                        >
                            <QrCode size={24} />
                            Scan Invite
                        </button>

                        <button
                            onClick={() => setReturningMode(true)}
                            className="flex-1 px-6 py-4 bg-white/5 text-foreground rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-3 border border-white/10 font-bold"
                        >
                            <Search size={24} />
                            Returning Visitor
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mb-8 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-bold animate-shake">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 col-span-2 md:col-span-1">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="premium-input pl-12"
                                placeholder="John Doe"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2 col-span-2 md:col-span-1">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="premium-input pl-12"
                                placeholder="john@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2 col-span-2 md:col-span-1">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Phone Number</label>
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="premium-input pl-12"
                                placeholder="+1 (555) 000-0000"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2 col-span-2 md:col-span-1">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Visiting Whom?</label>
                        <div className="relative">
                            <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <select
                                name="host"
                                value={formData.host}
                                onChange={handleChange}
                                className="premium-input pl-12 appearance-none cursor-pointer"
                                required
                            >
                                <option value="">Select a host</option>
                                {hosts.map(host => (
                                    <option key={host.id} value={host.id}>
                                        {host.name} ({host.department})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2 col-span-2">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Purpose of Visit</label>
                        <div className="relative">
                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <input
                                type="text"
                                name="purpose"
                                value={formData.purpose}
                                onChange={handleChange}
                                className="premium-input pl-12"
                                placeholder="Meeting, Delivery, etc."
                                required
                            />
                        </div>
                    </div>

                    <div className="col-span-2 pt-2">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1 block mb-3">Identification Photo</label>
                        {!formData.photo && !showCamera && (
                            <button
                                type="button"
                                onClick={() => setShowCamera(true)}
                                className="w-full py-8 border-2 border-dashed border-white/10 rounded-3xl text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center gap-3 group"
                            >
                                <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-primary/10 transition-colors">
                                    <Camera size={32} />
                                </div>
                                <span className="font-bold">Capture Photo</span>
                            </button>
                        )}

                        {showCamera && (
                            <div className="relative rounded-3xl overflow-hidden bg-black aspect-video ring-2 ring-primary/20">
                                <Webcam
                                    audio={false}
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    className="w-full h-full object-cover"
                                    videoConstraints={{ facingMode: "user" }}
                                />
                                <div className="absolute inset-x-0 bottom-6 flex justify-center">
                                    <button
                                        type="button"
                                        onClick={capture}
                                        className="px-8 py-3 bg-white text-black rounded-full font-black shadow-2xl hover:scale-105 active:scale-95 transition-all"
                                    >
                                        CAPUTURE NOW
                                    </button>
                                </div>
                            </div>
                        )}

                        {formData.photo && (
                            <div className="relative rounded-3xl overflow-hidden border border-white/10 ring-2 ring-primary/10 group aspect-video">
                                <img src={formData.photo} alt="Visitor" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, photo: '' }))}
                                    className="absolute top-4 right-4 p-3 bg-black/60 text-white rounded-2xl hover:bg-destructive transition-all backdrop-blur-md border border-white/20"
                                >
                                    <RefreshCw size={20} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="col-span-2 pt-6">
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                        >
                            {loading ? (
                                <RefreshCw className="animate-spin" size={20} />
                            ) : (
                                <>
                                    Complete Check-In
                                    <CheckCircle2 size={20} />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Returning Mode Modal */}
            {returningMode && (
                <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="glass-card p-10 max-w-md w-full relative">
                        <button
                            onClick={() => setReturningMode(false)}
                            className="absolute top-6 right-6 p-2 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-xl transition-all"
                        >
                            <X size={24} />
                        </button>
                        <h2 className="text-3xl font-black text-foreground mb-4">Welcome Back</h2>
                        <p className="text-muted-foreground mb-8 font-medium">Search for your previous record to save time.</p>

                        <form onSubmit={handleSearch} className="space-y-6">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Email or Phone Number"
                                    className="premium-input pl-12"
                                    autoFocus
                                />
                            </div>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={searching}
                            >
                                {searching ? <RefreshCw className="animate-spin" size={20} /> : 'Search My Info'}
                            </button>
                        </form>
                        {searchError && (
                            <p className="text-destructive font-bold text-sm mt-6 text-center animate-shake">{searchError}</p>
                        )}
                    </div>
                </div>
            )}

            {/* QR Scanner Modal */}
            {scanning && (
                <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in">
                    <div className="bg-white p-6 rounded-[2rem] w-full max-w-md shadow-2xl ring-8 ring-primary/10">
                        <div id="reader" className="w-full overflow-hidden rounded-2xl"></div>
                    </div>
                    <p className="mt-8 text-foreground font-black tracking-widest uppercase text-xs">Align QR Code within the frame</p>
                    <button
                        onClick={() => setScanning(false)}
                        className="mt-8 px-10 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-all text-muted-foreground hover:text-foreground"
                    >
                        Cancel Scanning
                    </button>
                </div>
            )}

            {/* NDA Modal */}
            {showNda && (
                <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 animate-in slide-in-from-bottom duration-500">
                    <div className="bg-card p-10 max-w-2xl w-full rounded-[2.5rem] relative overflow-hidden shadow-2xl border border-white/5">
                        <button
                            onClick={() => setShowNda(false)}
                            className="absolute top-8 right-8 p-2 text-muted-foreground hover:text-foreground transition-all"
                        >
                            <X size={28} />
                        </button>

                        <div className="mb-8">
                            <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-500/20 mb-4 inline-block">Security Required</span>
                            <h2 className="text-4xl font-black text-foreground">Health & Safety NDA</h2>
                        </div>

                        <div className="h-80 overflow-y-auto mb-8 p-8 bg-white/[0.02] rounded-3xl border border-white/5 text-muted-foreground leading-relaxed custom-scrollbar">
                            <div className="prose prose-invert max-w-none">
                                {hosts.find(h => h.id === formData.host)
                                    ? locations.find(l => l.id === hosts.find(h => h.id === formData.host)?.location)?.nda_content || "By signing this, you agree to our standard non-disclosure agreement and health-safety protocols."
                                    : "Standard Visitor NDA..."}
                            </div>
                        </div>

                        <p className="mb-4 font-bold text-sm text-foreground/80 px-2 uppercase tracking-widest">Digital Signature</p>
                        <div className="rounded-3xl mb-8 bg-white p-4 ring-4 ring-primary/5">
                            <SignatureCanvas
                                penColor="black"
                                canvasProps={{ className: 'sigCanvas w-full h-48 cursor-crosshair' }}
                                ref={sigPad}
                            />
                        </div>

                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => sigPad.current?.clear()}
                                className="px-8 py-4 border border-white/10 rounded-2xl font-bold text-muted-foreground hover:bg-white/5 transition-all uppercase tracking-widest text-xs"
                            >
                                Clear
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (sigPad.current?.isEmpty()) {
                                        alert("Please provide a signature.");
                                        return;
                                    }
                                    const sig = sigPad.current?.getTrimmedCanvas().toDataURL('image/png');
                                    setFormData(prev => ({
                                        ...prev,
                                        nda_accepted: true,
                                        signature: sig
                                    }));
                                    setShowNda(false);
                                }}
                                className="flex-1 btn-primary"
                            >
                                Accept & Sign
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
