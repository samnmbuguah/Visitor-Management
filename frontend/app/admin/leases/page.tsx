'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { AdminPage } from '@/components/ProtectedPage';
import { FileText, Calendar, DollarSign, Users, Plus, Search, Filter, Edit, Eye, Download } from 'lucide-react';

interface Lease {
  id: number;
  unit_number: string;
  tenant_name: string;
  property_name: string;
  monthly_rent: number;
  start_date: string;
  end_date: string;
  status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'TERMINATED';
  created_at: string;
}

function LeasesPageContent() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Mock data - replace with API call
  React.useEffect(() => {
    setTimeout(() => {
      setLeases([
        {
          id: 1,
          unit_number: 'A-101',
          tenant_name: 'Tech Corp Inc.',
          property_name: 'Business Plaza Tower',
          monthly_rent: 2500,
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          status: 'ACTIVE',
          created_at: '2024-01-15T10:30:00Z',
        },
        {
          id: 2,
          unit_number: 'B-205',
          tenant_name: 'Property Management LLC',
          property_name: 'Riverside Complex',
          monthly_rent: 1800,
          start_date: '2024-02-01',
          end_date: '2025-01-31',
          status: 'EXPIRING',
          created_at: '2024-02-20T14:15:00Z',
        },
        {
          id: 3,
          unit_number: 'C-302',
          tenant_name: 'Startup Ventures',
          property_name: 'Tech Hub',
          monthly_rent: 3200,
          start_date: '2023-06-01',
          end_date: '2024-05-31',
          status: 'EXPIRED',
          created_at: '2023-06-10T09:20:00Z',
        },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredLeases = leases.filter(lease => {
    const matchesSearch = lease.unit_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lease.tenant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lease.property_name.toLowerCase().includes(searchQuery.toLowerCase());
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
        <div className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Monthly Rent</TableHead>
                <TableHead>Lease Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeases.map((lease) => (
                <TableRow key={lease.id}>
                  <TableCell>
                    <p className="font-medium">{lease.unit_number}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{lease.tenant_name}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{lease.property_name}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-bold">${lease.monthly_rent.toLocaleString()}</p>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{lease.start_date}</p>
                      <p className="text-sm text-muted-foreground">to {lease.end_date}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(lease.status)}>
                      {lease.status}
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
                      <Button variant="outline" size="sm">
                        <Download size={14} />
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
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Create New Lease</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Unit Number</label>
                <Input placeholder="A-101" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tenant</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Tech Corp Inc.</SelectItem>
                    <SelectItem value="2">Property Management LLC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Start Date</label>
                <Input type="date" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">End Date</label>
                <Input type="date" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Monthly Rent ($)</label>
              <Input type="number" placeholder="2500" />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button>Create Lease</Button>
            </div>
          </div>
        </div>
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
