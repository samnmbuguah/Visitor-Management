"use client";

import { useState } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { UserPlus, Calendar, Mail, MapPin, XCircle, Search, QrCode, Upload } from 'lucide-react';
import { AdminPage } from '@/components/ProtectedPage';
import { PreRegistration, Host, Location, getHosts, getLocations, createInvite, bulkUploadPreRegistrations } from '@/lib/api';
import { 
  useInvites, 
  useHosts, 
  useLocations,
  useCreateInvite,
  useCancelPreRegistration
} from '@/hooks/useData';

function InvitesPageContent() {
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Use centralized hooks
    const { data: invites = [], isLoading } = useInvites();
    const { data: hosts = [], isLoading: hostsLoading } = useHosts();
    const { data: locations = [], isLoading: locationsLoading } = useLocations();
    
    const createMutation = useCreateInvite();
    const cancelMutation = useCancelPreRegistration();

    const handleCancel = (id: number) => {
        if (confirm('Are you sure you want to cancel this invite?')) {
            cancelMutation.mutate(id, {
                onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: ['invites'] });
                }
            });
        }
    };

    const filteredInvites = invites?.filter((invite: PreRegistration) =>
        invite.visitor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invite.visitor_email?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                    Visitor Invites
                </h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsBulkModalOpen(true)}
                        className="flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-2 rounded-lg transition-all"
                    >
                        <Upload size={18} />
                        Import CSV
                    </button>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-4 py-2 rounded-lg transition-all shadow-lg shadow-blue-500/20"
                    >
                        <UserPlus size={18} />
                        Create Invite
                    </button>
                </div>
            </div>

            <div className="flex gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-3 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search invites..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none backdrop-blur-md"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-10 text-gray-400">Loading invites...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredInvites?.map((invite: PreRegistration) => (
                        <Card key={invite.id} className="p-4 space-y-3 bg-white/5 border-white/10 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-2 opacity-50 text-[10px] uppercase font-bold tracking-wider">
                                {invite.status}
                            </div>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg">{invite.visitor_name}</h3>
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <Mail size={14} />
                                        {invite.visitor_email}
                                    </div>
                                </div>
                                {invite.status === 'PENDING' && (
                                    <button
                                        onClick={() => handleCancel(invite.id)}
                                        className="text-red-400 hover:text-red-300 p-1 rounded-full hover:bg-red-500/10 transition-colors"
                                        title="Cancel Invite"
                                    >
                                        <XCircle size={20} />
                                    </button>
                                )}
                            </div>

                            <div className="space-y-2 pt-2 border-t border-white/5">
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar size={14} className="text-blue-400" />
                                    <span>{invite.expected_arrival ? format(new Date(invite.expected_arrival), 'PPP p') : 'Not specified'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <MapPin size={14} className="text-purple-400" />
                                    <span>{invite.location_name}</span>
                                </div>
                            </div>

                            {/* Simple QR Code Display on hover or click could be added later */}
                        </Card>
                    ))}
                    {filteredInvites?.length === 0 && (
                        <div className="col-span-full text-center py-10 text-gray-500">
                            No invites found. Create one to get started.
                        </div>
                    )}
                </div>
            )}

            {isCreateModalOpen && (
                <CreateInviteModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                        queryClient.invalidateQueries({ queryKey: ['invites'] });
                    }}
                />
            )}

            {isBulkModalOpen && (
                <BulkImportModal
                    onClose={() => setIsBulkModalOpen(false)}
                    onSuccess={() => {
                        setIsBulkModalOpen(false);
                        queryClient.invalidateQueries({ queryKey: ['invites'] });
                    }}
                />
            )}
        </div>
    );
}

function CreateInviteModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
    const queryClient = useQueryClient();
    const { data: hosts } = useQuery({ queryKey: ['hosts'], queryFn: () => getHosts().then(res => res.data) });
    const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: () => getLocations().then(res => res.data) });

    const createMutation = useMutation({
        mutationFn: createInvite,
        onSuccess: () => {
            onSuccess();
        },
    });

        host: '',
        location: '',
        expected_arrival: '',
        expected_duration: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate({
            ...formData,
            host: Number(formData.host),
            location: Number(formData.location),
            expected_arrival: new Date(formData.expected_arrival).toISOString(), // Ensure ISO format
            expected_duration: formData.expected_duration ? Number(formData.expected_duration) : null,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                <h2 className="text-xl font-bold mb-4">Create New Invite</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm text-gray-400">Visitor Name</label>
                            <input
                                required
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-500/50"
                                value={formData.visitor_name}
                                onChange={e => setFormData({ ...formData, visitor_name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm text-gray-400">Visitor Email</label>
                            <input
                                required
                                type="email"
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-500/50"
                                value={formData.visitor_email}
                                onChange={e => setFormData({ ...formData, visitor_email: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm text-gray-400">Phone (Optional)</label>
                            <input
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-500/50"
                                value={formData.visitor_phone}
                                onChange={e => setFormData({ ...formData, visitor_phone: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm text-gray-400">Company (Optional)</label>
                            <input
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-500/50"
                                value={formData.visitor_company}
                                onChange={e => setFormData({ ...formData, visitor_company: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm text-gray-400">Host</label>
                            <select
                                required
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-500/50"
                                value={formData.host}
                                onChange={e => setFormData({ ...formData, host: e.target.value })}
                            >
                                <option value="">Select Host</option>
                                {hosts?.map((h: Host) => <option key={h.id} value={h.id}>{h.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm text-gray-400">Location</label>
                            <select
                                required
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-500/50"
                                value={formData.location}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                            >
                                <option value="">Select Location</option>
                                {locations?.map((l: Location) => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm text-gray-400">Expected Arrival</label>
                        <input
                            required
                            type="datetime-local"
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-500/50"
                            value={formData.expected_arrival}
                            onChange={e => setFormData({ ...formData, expected_arrival: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm text-gray-400">Expected Duration (Minutes)</label>
                        <input
                            type="number"
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-500/50"
                            value={formData.expected_duration}
                            onChange={e => setFormData({ ...formData, expected_duration: e.target.value })}
                            placeholder="e.g. 60"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                        >
                            {createMutation.isPending ? 'Sending...' : 'Send Invite'}
                        </button>
                    </div>
                    {createMutation.isError && (
                        <p className="text-red-400 text-sm mt-2">Error creating invite. Please check fields.</p>
                    )}
                </form>
            </div>
        </div>
    );
}

function BulkImportModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<{ created: number, errors: any[] } | null>(null);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await bulkUploadPreRegistrations(formData);
            setResult(res.data);
            if (res.data.created > 0) {
                setTimeout(() => {
                    onSuccess();
                }, 2000);
            }
        } catch (err) {
            console.error(err);
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                <h2 className="text-xl font-bold mb-4">Bulk Import Invites</h2>

                {!result ? (
                    <form onSubmit={handleUpload} className="space-y-4">
                        <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:bg-white/5 transition-colors">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="hidden"
                                id="csv-upload"
                            />
                            <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                <Upload size={32} className="text-gray-400" />
                                <span className="text-sm text-gray-400">
                                    {file ? file.name : "Click to upload CSV"}
                                </span>
                            </label>
                        </div>

                        <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg text-xs text-blue-300">
                            <strong>CSV Format:</strong> name, email, expected_arrival (YYYY-MM-DD HH:MM), phone (opt), company (opt), host_email (opt)
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!file || uploading}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {uploading ? 'Uploading...' : 'Upload CSV'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-400 mb-1">{result.created}</div>
                            <div className="text-gray-400 text-sm">Invites Created</div>
                        </div>

                        {result.errors.length > 0 && (
                            <div className="mt-4 max-h-40 overflow-y-auto bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-300">
                                <strong className="block mb-2">Errors ({result.errors.length}):</strong>
                                {result.errors.map((err, i) => (
                                    <div key={i} className="mb-1">Row {err.row}: {err.error}</div>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={onSuccess}
                            className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors mt-4"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// Wrap the component with AdminPage for authentication
export default function InvitesPage() {
    return (
        <AdminPage>
            <InvitesPageContent />
        </AdminPage>
    );
}
