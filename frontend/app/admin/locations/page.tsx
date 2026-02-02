'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getLocations,
    getKiosks,
    createLocation,
    updateLocation,
    deleteLocation,
    createKiosk,
    deleteKiosk,
    Location,
    Kiosk
} from '@/lib/api';

export default function LocationsPage() {
    const pathname = usePathname();
    const queryClient = useQueryClient();
    const [showAddLocation, setShowAddLocation] = useState(false);
    const [showAddKiosk, setShowAddKiosk] = useState<number | null>(null);
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [newLocation, setNewLocation] = useState({ name: '', address: '', floor: '', timezone: 'UTC' });
    const [newKiosk, setNewKiosk] = useState({ name: '', location: 0 });

    const navItems = [
        { href: '/admin', label: 'Dashboard', icon: '📊' },
        { href: '/admin/analytics', label: 'Analytics', icon: '📈' },
        { href: '/admin/locations', label: 'Locations', icon: '🏢' },
        { href: '/admin/users', label: 'Users', icon: '👥' },
        { href: '/admin/notifications', label: 'Notifications', icon: '🔔' },
    ];

    const { data: locations = [], isLoading: locationsLoading } = useQuery({
        queryKey: ['locations'],
        queryFn: () => getLocations().then(res => res.data),
    });

    const { data: kiosks = [] } = useQuery({
        queryKey: ['kiosks'],
        queryFn: () => getKiosks().then(res => res.data),
    });

    const createLocationMutation = useMutation({
        mutationFn: (data: typeof newLocation) => createLocation({ ...data, is_active: true }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locations'] });
            setShowAddLocation(false);
            setNewLocation({ name: '', address: '', floor: '', timezone: 'UTC' });
        },
    });

    const updateLocationMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<Location> }) => updateLocation(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locations'] });
            setEditingLocation(null);
        },
    });

    const deleteLocationMutation = useMutation({
        mutationFn: (id: number) => deleteLocation(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locations'] });
        },
    });

    const createKioskMutation = useMutation({
        mutationFn: (data: { name: string; location: number }) => createKiosk({ ...data, is_active: true }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kiosks'] });
            setShowAddKiosk(null);
            setNewKiosk({ name: '', location: 0 });
        },
    });

    const deleteKioskMutation = useMutation({
        mutationFn: (id: number) => deleteKiosk(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kiosks'] });
        },
    });

    const handleCreateLocation = (e: React.FormEvent) => {
        e.preventDefault();
        createLocationMutation.mutate(newLocation);
    };

    const handleUpdateLocation = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingLocation) {
            updateLocationMutation.mutate({
                id: editingLocation.id,
                data: {
                    name: editingLocation.name,
                    address: editingLocation.address,
                    floor: editingLocation.floor,
                    timezone: editingLocation.timezone,
                }
            });
        }
    };

    const handleCreateKiosk = (e: React.FormEvent, locationId: number) => {
        e.preventDefault();
        createKioskMutation.mutate({ name: newKiosk.name, location: locationId });
    };

    const getKiosksForLocation = (locationId: number) => {
        return kiosks.filter(k => k.location === locationId);
    };

    return (
        <main className="min-h-screen p-8">
            <div className="animated-bg" />

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                            Locations
                        </h1>
                        <p className="text-gray-400 mt-1">Manage office locations and kiosks</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowAddLocation(true)}
                            className="px-4 py-2 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors"
                        >
                            + Add Location
                        </button>
                        <Link href="/">
                            <button className="px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/5 transition-colors">
                                ← Back to Kiosk
                            </button>
                        </Link>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {navItems.map(item => (
                        <Link key={item.href} href={item.href}>
                            <button
                                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${pathname === item.href
                                        ? 'bg-indigo-500 text-white'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                <span>{item.icon}</span>
                                {item.label}
                            </button>
                        </Link>
                    ))}
                </div>

                {/* Add Location Modal */}
                {showAddLocation && (
                    <div className="glass-card p-6 mb-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Add New Location</h2>
                        <form onSubmit={handleCreateLocation}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    placeholder="Location Name"
                                    value={newLocation.name}
                                    onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                                    className="premium-input"
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="Floor (optional)"
                                    value={newLocation.floor}
                                    onChange={(e) => setNewLocation({ ...newLocation, floor: e.target.value })}
                                    className="premium-input"
                                />
                                <input
                                    type="text"
                                    placeholder="Address"
                                    value={newLocation.address}
                                    onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                                    className="premium-input md:col-span-2"
                                />
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button type="submit" className="btn-primary" disabled={createLocationMutation.isPending}>
                                    {createLocationMutation.isPending ? 'Saving...' : 'Save Location'}
                                </button>
                                <button type="button" onClick={() => setShowAddLocation(false)} className="btn-secondary">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Edit Location Modal */}
                {editingLocation && (
                    <div className="glass-card p-6 mb-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Edit Location</h2>
                        <form onSubmit={handleUpdateLocation}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    placeholder="Location Name"
                                    value={editingLocation.name}
                                    onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })}
                                    className="premium-input"
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="Floor (optional)"
                                    value={editingLocation.floor || ''}
                                    onChange={(e) => setEditingLocation({ ...editingLocation, floor: e.target.value })}
                                    className="premium-input"
                                />
                                <input
                                    type="text"
                                    placeholder="Address"
                                    value={editingLocation.address}
                                    onChange={(e) => setEditingLocation({ ...editingLocation, address: e.target.value })}
                                    className="premium-input md:col-span-2"
                                />
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button type="submit" className="btn-primary" disabled={updateLocationMutation.isPending}>
                                    {updateLocationMutation.isPending ? 'Saving...' : 'Update Location'}
                                </button>
                                <button type="button" onClick={() => setEditingLocation(null)} className="btn-secondary">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Locations List */}
                {locationsLoading ? (
                    <div className="glass-card p-12 text-center text-gray-400">Loading locations...</div>
                ) : locations.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <p className="text-gray-400 mb-4">No locations yet. Create your first location to get started.</p>
                        <button
                            onClick={() => setShowAddLocation(true)}
                            className="px-6 py-3 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors"
                        >
                            + Add First Location
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {locations.map(location => {
                            const locationKiosks = getKiosksForLocation(location.id);
                            return (
                                <div key={location.id} className="glass-card p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h3 className="text-xl font-semibold text-white">
                                                {location.name}
                                                {location.floor && <span className="text-gray-400 text-sm ml-2">Floor: {location.floor}</span>}
                                            </h3>
                                            <p className="text-gray-400 text-sm mt-1">{location.address || 'No address'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setEditingLocation(location)}
                                                className="px-3 py-1 rounded-lg bg-white/5 text-gray-300 text-sm hover:bg-white/10 transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm('Are you sure you want to delete this location?')) {
                                                        deleteLocationMutation.mutate(location.id);
                                                    }
                                                }}
                                                className="px-3 py-1 rounded-lg bg-red-500/10 text-red-400 text-sm hover:bg-red-500/20 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div className="bg-white/5 rounded-lg p-3">
                                            <p className="text-xs text-gray-400">Active Visitors</p>
                                            <p className="text-lg font-semibold text-green-400">{location.active_visitor_count}</p>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-3">
                                            <p className="text-xs text-gray-400">Hosts</p>
                                            <p className="text-lg font-semibold text-indigo-400">{location.host_count}</p>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-3">
                                            <p className="text-xs text-gray-400">Kiosks</p>
                                            <p className="text-lg font-semibold text-purple-400">{location.kiosk_count}</p>
                                        </div>
                                    </div>

                                    {/* Kiosks */}
                                    <div className="border-t border-white/10 pt-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-medium text-gray-300">Kiosks</h4>
                                            <button
                                                onClick={() => setShowAddKiosk(location.id)}
                                                className="text-xs text-indigo-400 hover:text-indigo-300"
                                            >
                                                + Add Kiosk
                                            </button>
                                        </div>

                                        {showAddKiosk === location.id && (
                                            <form onSubmit={(e) => handleCreateKiosk(e, location.id)} className="mb-3 flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Kiosk name (e.g., Lobby Kiosk 1)"
                                                    value={newKiosk.name}
                                                    onChange={(e) => setNewKiosk({ ...newKiosk, name: e.target.value })}
                                                    className="premium-input flex-1 py-2 text-sm"
                                                    required
                                                />
                                                <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm">
                                                    Add
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAddKiosk(null)}
                                                    className="px-4 py-2 rounded-lg bg-white/5 text-gray-300 text-sm"
                                                >
                                                    Cancel
                                                </button>
                                            </form>
                                        )}

                                        {locationKiosks.length === 0 ? (
                                            <p className="text-gray-500 text-sm">No kiosks configured</p>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {locationKiosks.map(kiosk => (
                                                    <div
                                                        key={kiosk.id}
                                                        className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 text-sm"
                                                    >
                                                        <span className={`w-2 h-2 rounded-full ${kiosk.is_active ? 'bg-green-400' : 'bg-gray-400'}`} />
                                                        <span className="text-gray-300">{kiosk.name}</span>
                                                        <button
                                                            onClick={() => deleteKioskMutation.mutate(kiosk.id)}
                                                            className="text-gray-500 hover:text-red-400 ml-1"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
