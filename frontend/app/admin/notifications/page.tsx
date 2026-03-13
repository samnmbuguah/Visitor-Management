'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getNotificationTemplates,
    getNotificationLogs,
    createNotificationTemplate,
    updateNotificationTemplate,
    deleteNotificationTemplate,
    getLocations,
    NotificationTemplate,
    NotificationLog,
    Location
} from '@/lib/api';

const TEMPLATE_TYPES = [
    { value: 'VISITOR_ARRIVAL', label: 'Visitor Arrival' },
    { value: 'VISITOR_CHECKOUT', label: 'Visitor Checkout' },
    { value: 'PRE_REGISTRATION', label: 'Pre-Registration Invite' },
    { value: 'OVERSTAY_ALERT', label: 'Overstay Alert' },
    { value: 'VISITOR_CONFIRMATION', label: 'Visitor Confirmation' },
];

const TEMPLATE_VARIABLES = [
    '{{visitor_name}}',
    '{{visitor_email}}',
    '{{visitor_phone}}',
    '{{visitor_company}}',
    '{{purpose}}',
    '{{host_name}}',
    '{{host_email}}',
    '{{host_department}}',
    '{{checkin_time}}',
    '{{checkout_time}}',
    '{{location_name}}',
];

export default function NotificationsPage() {
    const pathname = usePathname();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'templates' | 'logs'>('templates');
    const [showAddTemplate, setShowAddTemplate] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
    const [newTemplate, setNewTemplate] = useState({
        name: '',
        type: 'VISITOR_ARRIVAL',
        subject: '',
        body: '',
        is_active: true,
        location: undefined as number | undefined,
    });

    const navItems = [
        { href: '/admin', label: 'Dashboard', icon: '📊' },
        { href: '/admin/analytics', label: 'Analytics', icon: '📈' },
        { href: '/admin/locations', label: 'Locations', icon: '🏢' },
        { href: '/admin/users', label: 'Users', icon: '👥' },
        { href: '/admin/notifications', label: 'Notifications', icon: '🔔' },
    ];

    const { data: templates = [], isLoading: templatesLoading } = useQuery({
        queryKey: ['notificationTemplates'],
        queryFn: () => getNotificationTemplates().then(res => res.data),
    });

    const { data: logs = [], isLoading: logsLoading } = useQuery({
        queryKey: ['notificationLogs'],
        queryFn: () => getNotificationLogs().then(res => res.data),
    });

    const { data: locations = [] } = useQuery({
        queryKey: ['locations'],
        queryFn: () => getLocations().then(res => res.data),
    });

    const createTemplateMutation = useMutation({
        mutationFn: (data: typeof newTemplate) => createNotificationTemplate(data as any),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notificationTemplates'] });
            setShowAddTemplate(false);
            setNewTemplate({ name: '', type: 'VISITOR_ARRIVAL', subject: '', body: '', is_active: true, location: undefined });
        },
    });

    const updateTemplateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<NotificationTemplate> }) =>
            updateNotificationTemplate(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notificationTemplates'] });
            setEditingTemplate(null);
        },
    });

    const deleteTemplateMutation = useMutation({
        mutationFn: (id: number) => deleteNotificationTemplate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notificationTemplates'] });
        },
    });

    const handleCreateTemplate = (e: React.FormEvent) => {
        e.preventDefault();
        createTemplateMutation.mutate(newTemplate);
    };

    const handleUpdateTemplate = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingTemplate) {
            updateTemplateMutation.mutate({
                id: editingTemplate.id,
                data: {
                    name: editingTemplate.name,
                    type: editingTemplate.type,
                    subject: editingTemplate.subject,
                    body: editingTemplate.body,
                    is_active: editingTemplate.is_active,
                    location: editingTemplate.location,
                }
            });
        }
    };

    const toggleTemplateActive = (template: NotificationTemplate) => {
        updateTemplateMutation.mutate({
            id: template.id,
            data: { is_active: !template.is_active }
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'SENT': return 'text-green-400 bg-green-500/10';
            case 'FAILED': return 'text-red-400 bg-red-500/10';
            case 'PENDING': return 'text-yellow-400 bg-yellow-500/10';
            default: return 'text-gray-400 bg-gray-500/10';
        }
    };

    return (
        <main className="min-h-screen p-8">
            <div className="animated-bg" />

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                            Notifications
                        </h1>
                        <p className="text-gray-400 mt-1">Configure email templates and view logs</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {activeTab === 'templates' && (
                            <button
                                onClick={() => setShowAddTemplate(true)}
                                className="px-4 py-2 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors"
                            >
                                + Add Template
                            </button>
                        )}
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

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'templates'
                                ? 'bg-indigo-500 text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        Templates
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'logs'
                                ? 'bg-indigo-500 text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        Logs
                    </button>
                </div>

                {/* Add/Edit Template Form */}
                {(showAddTemplate || editingTemplate) && (
                    <div className="glass-card p-6 mb-6">
                        <h2 className="text-lg font-semibold text-white mb-4">
                            {editingTemplate ? 'Edit Template' : 'Add New Template'}
                        </h2>
                        <form onSubmit={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <input
                                    type="text"
                                    placeholder="Template Name"
                                    value={editingTemplate?.name ?? newTemplate.name}
                                    onChange={(e) => editingTemplate
                                        ? setEditingTemplate({ ...editingTemplate, name: e.target.value })
                                        : setNewTemplate({ ...newTemplate, name: e.target.value })
                                    }
                                    className="premium-input"
                                    required
                                />
                                <select
                                    value={editingTemplate?.type ?? newTemplate.type}
                                    onChange={(e) => editingTemplate
                                        ? setEditingTemplate({ ...editingTemplate, type: e.target.value as any })
                                        : setNewTemplate({ ...newTemplate, type: e.target.value })
                                    }
                                    className="premium-select"
                                    required
                                >
                                    {TEMPLATE_TYPES.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    placeholder="Email Subject"
                                    value={editingTemplate?.subject ?? newTemplate.subject}
                                    onChange={(e) => editingTemplate
                                        ? setEditingTemplate({ ...editingTemplate, subject: e.target.value })
                                        : setNewTemplate({ ...newTemplate, subject: e.target.value })
                                    }
                                    className="premium-input"
                                    required
                                />
                                <select
                                    value={editingTemplate?.location ?? newTemplate.location ?? ''}
                                    onChange={(e) => {
                                        const value = e.target.value ? Number(e.target.value) : undefined;
                                        editingTemplate
                                            ? setEditingTemplate({ ...editingTemplate, location: value })
                                            : setNewTemplate({ ...newTemplate, location: value });
                                    }}
                                    className="premium-select"
                                >
                                    <option value="">All Locations (Global)</option>
                                    {locations.map((loc: Location) => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="form-label">Email Body</label>
                                <textarea
                                    placeholder="Email body..."
                                    value={editingTemplate?.body ?? newTemplate.body}
                                    onChange={(e) => editingTemplate
                                        ? setEditingTemplate({ ...editingTemplate, body: e.target.value })
                                        : setNewTemplate({ ...newTemplate, body: e.target.value })
                                    }
                                    className="premium-input min-h-[200px]"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Available variables: {TEMPLATE_VARIABLES.join(', ')}
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                                >
                                    {createTemplateMutation.isPending || updateTemplateMutation.isPending
                                        ? 'Saving...'
                                        : editingTemplate ? 'Update Template' : 'Create Template'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddTemplate(false);
                                        setEditingTemplate(null);
                                    }}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Content */}
                <div className="glass-card p-6">
                    {activeTab === 'templates' ? (
                        templatesLoading ? (
                            <div className="text-center py-12 text-gray-400">Loading templates...</div>
                        ) : templates.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-400 mb-4">No notification templates yet.</p>
                                <button
                                    onClick={() => setShowAddTemplate(true)}
                                    className="px-6 py-3 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors"
                                >
                                    + Create First Template
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {templates.map((template: NotificationTemplate) => (
                                    <div key={template.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="font-semibold text-white">{template.name}</h3>
                                                    <span className="px-2 py-0.5 rounded text-xs bg-indigo-500/20 text-indigo-400">
                                                        {TEMPLATE_TYPES.find(t => t.value === template.type)?.label}
                                                    </span>
                                                    {template.location_name && (
                                                        <span className="px-2 py-0.5 rounded text-xs bg-white/10 text-gray-400">
                                                            {template.location_name}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-gray-400 text-sm mb-1">Subject: {template.subject}</p>
                                                <p className="text-gray-500 text-xs line-clamp-2">{template.body}</p>
                                            </div>
                                            <div className="flex items-center gap-2 ml-4">
                                                <button
                                                    onClick={() => toggleTemplateActive(template)}
                                                    className={`px-3 py-1 rounded-lg text-sm ${template.is_active
                                                            ? 'bg-green-500/10 text-green-400'
                                                            : 'bg-gray-500/10 text-gray-400'
                                                        }`}
                                                >
                                                    {template.is_active ? 'Active' : 'Inactive'}
                                                </button>
                                                <button
                                                    onClick={() => setEditingTemplate(template)}
                                                    className="px-3 py-1 rounded-lg bg-white/5 text-gray-300 text-sm hover:bg-white/10"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Delete this template?')) {
                                                            deleteTemplateMutation.mutate(template.id);
                                                        }
                                                    }}
                                                    className="px-3 py-1 rounded-lg bg-red-500/10 text-red-400 text-sm hover:bg-red-500/20"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        logsLoading ? (
                            <div className="text-center py-12 text-gray-400">Loading logs...</div>
                        ) : logs.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">No notification logs yet.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-sm text-gray-400 border-b border-white/10">
                                            <th className="pb-3 font-medium">Sent At</th>
                                            <th className="pb-3 font-medium">Recipient</th>
                                            <th className="pb-3 font-medium">Subject</th>
                                            <th className="pb-3 font-medium">Visitor</th>
                                            <th className="pb-3 font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map((log: NotificationLog) => (
                                            <tr key={log.id} className="border-b border-white/5">
                                                <td className="py-3 text-gray-400 text-sm">
                                                    {new Date(log.sent_at).toLocaleString()}
                                                </td>
                                                <td className="py-3 text-gray-300">{log.recipient_email}</td>
                                                <td className="py-3 text-white">{log.subject}</td>
                                                <td className="py-3 text-gray-300">{log.visitor_name || '-'}</td>
                                                <td className="py-3">
                                                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(log.status)}`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}
                </div>
            </div>
        </main>
    );
}
