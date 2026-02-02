"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWatchlist, addToWatchlist, removeFromWatchlist, WatchlistEntry } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { ShieldAlert, Trash2, Plus, Search } from 'lucide-react';

export default function WatchlistPage() {
    const queryClient = useQueryClient();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const { data: entries, isLoading } = useQuery({
        queryKey: ['watchlist'],
        queryFn: () => getWatchlist().then(res => res.data),
    });

    const addMutation = useMutation({
        mutationFn: addToWatchlist,
        onSuccess: () => {
            setIsAddModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['watchlist'] });
        },
    });

    const removeMutation = useMutation({
        mutationFn: removeFromWatchlist,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['watchlist'] });
        },
    });

    const handleRemove = (id: number) => {
        if (confirm('Are you sure you want to remove this entry?')) {
            removeMutation.mutate(id);
        }
    };

    const filteredEntries = entries?.filter(entry =>
        (entry.name && entry.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (entry.email && entry.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (entry.reason && entry.reason.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-orange-600">
                    Security Watchlist
                </h1>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 px-4 py-2 rounded-lg transition-all shadow-lg shadow-red-500/20"
                >
                    <Plus size={18} />
                    Add Entry
                </button>
            </div>

            <div className="flex gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-3 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search watchlist..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-red-500/50 outline-none backdrop-blur-md"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-10 text-gray-400">Loading watchlist...</div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredEntries?.map((entry) => (
                        <Card key={entry.id} className="p-4 flex items-center justify-between bg-white/5 border-red-500/20 hover:border-red-500/40 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-500/10 rounded-full text-red-400">
                                    <ShieldAlert size={24} />
                                </div>
                                <div>
                                    <div className="font-bold text-lg flex items-center gap-2">
                                        {entry.name || entry.email}
                                        <span className="text-xs px-2 py-0.5 bg-white/10 rounded-full text-gray-400 font-normal">
                                            {entry.match_type}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        {entry.email && <span>{entry.email} • </span>}
                                        {entry.phone && <span>{entry.phone} • </span>}
                                        <span className="text-red-300">{entry.reason}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleRemove(entry.id)}
                                className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                            >
                                <Trash2 size={20} />
                            </button>
                        </Card>
                    ))}
                    {filteredEntries?.length === 0 && (
                        <div className="text-center py-10 text-gray-500">
                            No active watchlist entries.
                        </div>
                    )}
                </div>
            )}

            {isAddModalOpen && (
                <AddWatchlistModal
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={() => setIsAddModalOpen(false)}
                    onSubmit={(data) => addMutation.mutate(data)}
                    isLoading={addMutation.isPending}
                />
            )}
        </div>
    );
}

function AddWatchlistModal({ onClose, onSuccess, onSubmit, isLoading }: { onClose: () => void, onSuccess: () => void, onSubmit: (data: any) => void, isLoading: boolean }) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        reason: '',
        match_type: 'EXACT',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
        // Note: mutation onSuccess handles close
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                <h2 className="text-xl font-bold mb-4">Add to Watchlist</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm text-gray-400">Full Name</label>
                            <input
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-red-500/50"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm text-gray-400">Email Address</label>
                            <input
                                type="email"
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-red-500/50"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm text-gray-400">Phone Number</label>
                            <input
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-red-500/50"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm text-gray-400">Match Type</label>
                            <select
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-red-500/50"
                                value={formData.match_type}
                                onChange={e => setFormData({ ...formData, match_type: e.target.value })}
                            >
                                <option value="EXACT">Exact Match</option>
                                <option value="CONTAINS">Contains (Fuzzy)</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm text-gray-400">Reason for Block *</label>
                        <textarea
                            required
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-red-500/50 min-h-[80px]"
                            value={formData.reason}
                            onChange={e => setFormData({ ...formData, reason: e.target.value })}
                            placeholder="e.g. Former employee, Security risk..."
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
                            disabled={isLoading}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
                        >
                            {isLoading ? 'Saving...' : 'Add to Watchlist'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
