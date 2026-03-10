'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Modal, ModalContent } from '@/components/ui/modal';
import { AdminPage } from '@/components/ProtectedPage';
import { FileText, Calendar, DollarSign, Users, Plus, Search, Filter, Edit, Eye, Download } from 'lucide-react';

import { useLeases, useTenants, useCreateLease, useDeleteLease } from '@/hooks/useData';
import { toast } from 'react-hot-toast';

interface Lease {
  id: number;
  unit_number: string;
  tenant_name: string;
  monthly_rent: number;
  start_date: string;
  end_date: string;
  status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'TERMINATED';
  status_display: string;
  created_at: string;
}

function LeasesPageContent() {
  const { data: leases = [], isLoading: loading } = useLeases();
  const { data: tenants = [] } = useTenants();
  const createLeaseMutation = useCreateLease();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [formData, setFormData] = useState({
    unit_number: '',
    tenant: '',
    monthly_rent: '',
    start_date: '',
    end_date: '',
    status: 'ACTIVE',
  });

  const filteredLeases = leases.filter((lease: Lease) => {
    const matchesSearch = lease.unit_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lease.tenant_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lease.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'EXPIRING': return 'bg-yellow-100 text-yellow-800';
      case 'EXPIRED': return 'bg-red-100 text-red-800';
      case 'TERMINATED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalMonthlyRevenue = leases
    .filter(l => l.status === 'ACTIVE')
    .reduce((sum, lease) => sum + lease.monthly_rent, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-foreground">Lease Management</h1>
            <p className="text-muted-foreground">Manage property leases and rentals</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus size={16} className="mr-2" />
            New Lease
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Leases</p>
                <p className="text-2xl font-bold">{leases.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="text-blue-600" size={24} />
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Leases</p>
                <p className="text-2xl font-bold text-green-600">
                  {leases.filter(l => l.status === 'ACTIVE').length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Calendar className="text-green-600" size={24} />
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {leases.filter(l => l.status === 'EXPIRING').length}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Calendar className="text-yellow-600" size={24} />
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold">
                  ${totalMonthlyRevenue.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="text-green-600" size={24} />
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
                  placeholder="Search leases..."
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
                <SelectItem value="EXPIRING">Expiring Soon</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="TERMINATED">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Leases Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Monthly Rent</TableHead>
                <TableHead>Lease Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeases.map((lease: any) => (
                <TableRow key={lease.id}>
                  <TableCell>
                    <p className="font-medium">{lease.unit_number}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{lease.tenant_name}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-bold">${Number(lease.monthly_rent).toLocaleString()}</p>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{lease.start_date}</p>
                      <p className="text-sm text-muted-foreground">to {lease.end_date}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(lease.status)}>
                      {lease.status_display || lease.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye size={14} />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create Lease Modal */}
      <Modal open={showCreateModal} onOpenChange={setShowCreateModal}>
        <ModalContent>
          <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Create New Lease</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Unit Number</label>
                <Input 
                  placeholder="A-101" 
                  value={formData.unit_number}
                  onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tenant</label>
                <Select 
                  value={formData.tenant} 
                  onValueChange={(value) => setFormData({ ...formData, tenant: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((tenant: any) => (
                      <SelectItem key={tenant.id} value={tenant.id.toString()}>
                        {tenant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Start Date</label>
                <Input 
                  type="date" 
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">End Date</label>
                <Input 
                  type="date" 
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Monthly Rent ($)</label>
              <Input 
                type="number" 
                placeholder="2500" 
                value={formData.monthly_rent}
                onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button 
                onClick={async () => {
                  try {
                    await createLeaseMutation.mutateAsync(formData);
                    toast.success('Lease created successfully');
                    setShowCreateModal(false);
                    setFormData({
                      unit_number: '',
                      tenant: '',
                      monthly_rent: '',
                      start_date: '',
                      end_date: '',
                      status: 'ACTIVE',
                    });
                  } catch (error) {
                    toast.error('Failed to create lease');
                  }
                }}
                disabled={createLeaseMutation.isLoading}
              >
                {createLeaseMutation.isLoading ? 'Creating...' : 'Create Lease'}
              </Button>
            </div>
          </div>
        </div>
        </ModalContent>
      </Modal>
    </div>
  );
}

export default function LeasesPage() {
  return (
    <AdminPage>
      <LeasesPageContent />
    </AdminPage>
  );
}
