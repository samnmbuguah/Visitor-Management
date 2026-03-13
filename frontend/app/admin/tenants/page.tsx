'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Modal, ModalContent, ModalTitle } from '@/components/ui/modal';
import { AdminPage } from '@/components/ProtectedPage';
import { Users, Building, Plus, Search, Filter, Edit, Trash2, Eye } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { useTenants, useCreateTenant } from '@/hooks/useData';

interface Tenant {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  status: string;
  locations_count: number;
  users_count: number;
  billing_email?: string;
  tier?: string;
  created_at: string;
}

function TenantsPageContent() {
  const queryClient = useQueryClient();
  const { data: tenants = [], isLoading: loading } = useTenants();
  const createMutation = useCreateTenant();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const [newTenant, setNewTenant] = useState({
    name: '',
    slug: '',
    subdomain: '',
    billing_email: '',
    status: 'ACTIVE',
    tier: 'STARTER'
  });

  const handleCreateTenant = () => {
    if (!newTenant.name || !newTenant.slug) return;
    
    createMutation.mutate(newTenant, {
      onSuccess: () => {
        setShowCreateModal(false);
        setNewTenant({
          name: '',
          slug: '',
          subdomain: '',
          billing_email: '',
          status: 'ACTIVE',
          tier: 'STARTER'
        });
        queryClient.invalidateQueries({ queryKey: ['tenants'] });
      },
      onError: (err) => console.error("Error creating tenant:", err)
    });
  };

  const filteredTenants = tenants.filter((tenant: Tenant) => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'ACTIVE' ? tenant.is_active : !tenant.is_active);
    return matchesSearch && matchesStatus;
  });

  const getOneStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'TRIAL': return 'bg-blue-100 text-blue-800';
      case 'SUSPENDED': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-foreground">Tenant Management</h1>
            <p className="text-muted-foreground">Manage properties and organizations</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus size={16} className="mr-2" />
            Add Tenant
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tenants</p>
                <p className="text-2xl font-bold">{tenants.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="text-blue-600" size={24} />
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {tenants.filter((t: any) => t.status === 'ACTIVE').length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Building className="text-green-600" size={24} />
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Locations</p>
                <p className="text-2xl font-bold">
                  {tenants.reduce((sum: number, t: any) => sum + t.locations_count, 0)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Building className="text-purple-600" size={24} />
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">
                  {tenants.reduce((sum: number, t: any) => sum + t.users_count, 0)}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Users className="text-orange-600" size={24} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <Input
                  placeholder="Search tenants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Tenants Table */}
      <Card>
        <div className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Locations</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTenants.map((tenant: any) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-sm text-muted-foreground">{tenant.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{tenant.billing_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{tenant.locations_count}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{tenant.users_count}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getOneStatusColor(tenant.status)}>
                      {tenant.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        setSelectedTenant(tenant);
                        setShowViewModal(true);
                      }}>
                        <Eye size={14} />
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive" onClick={() => {
                        setSelectedTenant(tenant);
                        setShowDeleteModal(true);
                      }}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create Tenant Modal */}
      <Modal open={showCreateModal} onOpenChange={setShowCreateModal}>
        <ModalContent>
          <div className="space-y-6">
            <ModalTitle className="text-2xl font-bold">Create New Tenant</ModalTitle>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tenant Name *</label>
                <Input 
                  placeholder="Acme Corp" 
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({...newTenant, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Slug *</label>
                  <Input 
                    placeholder="acme-corp" 
                    value={newTenant.slug}
                    onChange={(e) => setNewTenant({...newTenant, slug: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Subdomain</label>
                  <Input 
                    placeholder="acme" 
                    value={newTenant.subdomain}
                    onChange={(e) => setNewTenant({...newTenant, subdomain: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Billing Email</label>
                <Input 
                  type="email" 
                  placeholder="billing@acmecorp.com" 
                  value={newTenant.billing_email}
                  onChange={(e) => setNewTenant({...newTenant, billing_email: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <Select value={newTenant.status} onValueChange={(val) => setNewTenant({...newTenant, status: val})}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="TRIAL">Trial</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tier</label>
                  <Select value={newTenant.tier} onValueChange={(val) => setNewTenant({...newTenant, tier: val})}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STARTER">Starter</SelectItem>
                      <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                      <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button onClick={handleCreateTenant} disabled={createMutation.isPending || !newTenant.name || !newTenant.slug}>
                  {createMutation.isPending ? 'Creating...' : 'Create Tenant'}
                </Button>
              </div>
            </div>
          </div>
        </ModalContent>
      </Modal>

      {/* View Tenant Modal */}
      <Modal open={showViewModal} onOpenChange={setShowViewModal}>
        <ModalContent>
          <div className="space-y-6">
            <ModalTitle className="text-2xl font-bold">Tenant Details</ModalTitle>
            {selectedTenant && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase font-bold">Name</label>
                    <p className="font-medium text-lg">{selectedTenant.name}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase font-bold">Status</label>
                    <div><Badge className={getOneStatusColor(selectedTenant.status)}>{selectedTenant.status}</Badge></div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase font-bold">Slug</label>
                    <p>{selectedTenant.slug}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase font-bold">Billing Email</label>
                    <p>{selectedTenant.billing_email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase font-bold">Tier</label>
                    <p>{selectedTenant.tier || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase font-bold">Created</label>
                    <p>{new Date(selectedTenant.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={() => setShowViewModal(false)}>Close</Button>
                </div>
              </div>
            )}
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}

export default function TenantsPage() {
  return (
    <AdminPage>
      <TenantsPageContent />
    </AdminPage>
  );
}
