'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createVisitor, getHosts, Host, VisitorCreate, scanPreRegistration, checkinPreRegistration, searchVisitor } from '@/lib/api';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, Camera, RefreshCw } from 'lucide-react';
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
            // Optional success toast
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
            // First verify the token
            const res = await scanPreRegistration(decodedText);
            const invite = res.data;

            // Auto-fill form
            setFormData({
                name: invite.visitor_name,
                email: invite.visitor_email,
                phone: invite.visitor_phone || '',
                host: invite.host,
                purpose: 'Pre-registered Visit',
                company: invite.visitor_company
            });

            // Optional: You could auto-submit here:
            // await checkinPreRegistration(invite.id);
            // But we'll let the user review and submit for now to allow photo capture later.

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
            setHosts(response.data);
        } catch (err) {
            console.error('Failed to load hosts:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // NDA Check
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
                router.push('/checkin/success');
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
                    <p className="text-gray-400">Please fill in your details or scan your invite</p>

                    <button
                        onClick={() => setScanning(true)}
                        className="mt-4 px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-2 w-full border border-blue-500/50"
                    >
                        <QrCode size={20} />
                        Scan Invite QR Code
                    </button>

                    <button
                        onClick={() => setReturningMode(true)}
                        className="mt-4 px-4 py-2 bg-emerald-500/20 text-emerald-300 rounded-lg hover:bg-emerald-500/30 transition-colors flex items-center justify-center gap-2 w-full border border-emerald-500/50 text-sm"
                    >
                        I've been here before
                    </button>
                </div>

                {returningMode && (
                    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
                        <div className="glass-card p-8 max-w-md w-full relative">
                            <button
                                onClick={() => setReturningMode(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-white"
                            >
                                X
                            </button>
                            <h2 className="text-xl font-bold text-white mb-4">Returning Visitor</h2>
                            <p className="text-gray-400 mb-4 text-sm">Enter your email or phone to retrieve your details.</p>

                            <form onSubmit={handleSearch} className="space-y-4">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Email or Phone"
                                    className="premium-input"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    className="btn-primary w-full"
                                    disabled={searching}
                                >
                                    {searching ? 'Searching...' : 'Find My Details'}
                                </button>
                            </form>
                            {searchError && (
                                <p className="text-red-400 text-sm mt-3 text-center">{searchError}</p>
                            )}
                        </div>
                    </div>
                )}

                {scanning && (
                    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
                        <div className="bg-white p-4 rounded-xl w-full max-w-sm">
                            <div id="reader" className="w-full"></div>
                        </div>
                        <button
                            onClick={() => setScanning(false)}
                            className="mt-8 px-8 py-3 bg-white/10 rounded-full font-medium hover:bg-white/20 transition-colors"
                        >
                            Cancel Scan
                        </button>
                    </div>
                )}

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

                    <div className="form-group">
                        <label className="form-label block mb-2">Photo</label>
                        {!formData.photo && !showCamera && (
                            <button
                                type="button"
                                onClick={() => setShowCamera(true)}
                                className="w-full py-4 border-2 border-dashed border-white/20 rounded-xl text-gray-400 hover:text-white hover:border-blue-500/50 hover:bg-white/5 transition-all flex flex-col items-center gap-2"
                            >
                                <Camera size={24} />
                                <span>Take a Photo</span>
                            </button>
                        )}

                        {showCamera && (
                            <div className="relative rounded-xl overflow-hidden bg-black">
                                <Webcam
                                    audio={false}
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    className="w-full"
                                    videoConstraints={{ facingMode: "user" }}
                                />
                                <button
                                    type="button"
                                    onClick={capture}
                                    className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-white text-black rounded-full font-bold hover:scale-105 transition-transform"
                                >
                                    Capture
                                </button>
                            </div>
                        )}

                        {formData.photo && (
                            <div className="relative rounded-xl overflow-hidden border border-white/20">
                                <img src={formData.photo} alt="Visitor" className="w-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, photo: '' }))}
                                    className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-md"
                                >
                                    <RefreshCw size={16} />
                                </button>
                            </div>
                        )}
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

                {showNda && (
                    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
                        <div className="bg-white p-8 max-w-2xl w-full rounded-2xl relative text-black">
                            <button
                                onClick={() => setShowNda(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-black font-bold text-xl"
                            >
                                X
                            </button>
                            <h2 className="text-2xl font-bold mb-4 border-b pb-2">Non-Disclosure Agreement</h2>

                            <div className="h-64 overflow-y-auto mb-6 p-4 bg-gray-50 rounded-lg border text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {hosts.find(h => h.id === formData.host)
                                    ? locations.find(l => l.id === hosts.find(h => h.id === formData.host)?.location)?.nda_content || "By signing this, you agree to our NDA."
                                    : "Standard Non-Disclosure Agreement..."}
                            </div>

                            <p className="mb-2 font-semibold">Please sign below:</p>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg mb-4 bg-gray-50">
                                <SignatureCanvas
                                    penColor="black"
                                    canvasProps={{ className: 'sigCanvas w-full h-40' }}
                                    ref={sigPad}
                                />
                            </div>

                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => sigPad.current?.clear()}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
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
                                    className="flex-1 btn-primary bg-black text-white hover:bg-gray-800 border-none"
                                >
                                    Accept & Sign
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
