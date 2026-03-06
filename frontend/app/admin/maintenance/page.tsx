'use client';

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useEnhancedMaintenanceRequests, useEnhancedMaintenanceCategories, useEnhancedLocations, useEnhancedCreateMaintenanceRequest, useEnhancedUpdateMaintenanceRequestStatus } from '@/hooks/useEnhancedData';
import { useAdminPage } from '@/hooks/useAuthQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { Wrench, AlertTriangle, Clock, CheckCircle, Camera, Plus, Filter } from 'lucide-react';
import { AdminPage } from '@/components/ProtectedPage';
import { 
  useMaintenanceRequests, 
  useMaintenanceCategories, 
  useLocations,
  useCreateMaintenanceRequest,
  useUpdateMaintenanceRequestStatus
} from '@/hooks/useData';

interface MaintenanceRequest {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  location: { name: string };
  category: { name: string };
  host: { name: string };
  requested_at: string;
  assigned_to?: { name: string };
  photos: Array<{ id: number; photo: string; caption: string }>;
}

function MaintenancePageContent() {
  const queryClient = useQueryClient();
  
  // Use enhanced hooks with better caching
  const { data: requests = [], isLoading: requestsLoading } = useEnhancedMaintenanceRequests();
  const { data: categories = [], isLoading: categoriesLoading } = useEnhancedMaintenanceCategories();
  const { data: locations = [], isLoading: locationsLoading } = useEnhancedLocations();
  
  const createMutation = useEnhancedCreateMaintenanceRequest();
  const updateStatusMutation = useEnhancedUpdateMaintenanceRequestStatus();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    category: '',
    location: '',
  });

  const loading = requestsLoading || categoriesLoading || locationsLoading;

  const createRequest = async () => {
    if (!newRequest.title || !newRequest.description) {
      return;
    }

    createMutation.mutate(newRequest, {
      onSuccess: () => {
        setShowCreateModal(false);
        setNewRequest({
          title: '',
          description: '',
          priority: 'MEDIUM',
          category: '',
          location: '',
        });
        queryClient.invalidateQueries({ queryKey: ['maintenanceRequests'] });
      },
      onError: (error) => {
        console.error('Error creating request:', error);
      }
    });
  };

  const updateRequestStatus = async (requestId: number, newStatus: string) => {
    updateStatusMutation.mutate({ id: requestId, status: newStatus }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['maintenanceRequests'] });
      },
      onError: (error) => {
        console.error('Error updating status:', error);
      }
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'EMERGENCY': return 'destructive';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'secondary';
      case 'LOW': return 'success';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REQUESTED': return 'warning';
      case 'ASSIGNED': return 'info';
      case 'IN_PROGRESS': return 'success';
      case 'COMPLETED': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'REQUESTED': return <Clock className="h-4 w-4" />;
      case 'ASSIGNED': return <AlertTriangle className="h-4 w-4" />;
      case 'IN_PROGRESS': return <Wrench className="h-4 w-4" />;
      case 'COMPLETED': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const filteredRequests = requests.filter(request => {
    if (filterStatus !== 'all' && request.status !== filterStatus) return false;
    if (filterPriority !== 'all' && request.priority !== filterPriority) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Maintenance Management</h1>
          <p className="text-muted-foreground">Track and manage maintenance requests</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="REQUESTED">Requested</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="EMERGENCY">Emergency</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredRequests.map((request) => (
          <Card key={request.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{request.title}</CardTitle>
                <Badge variant={getPriorityColor(request.priority)}>
                  {request.priority}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(request.status)}
                <Badge variant={getStatusColor(request.status)}>
                  {request.status.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {request.description}
              </p>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Location:</span> {request.location?.name}
                </div>
                <div>
                  <span className="font-medium">Category:</span> {request.category?.name}
                </div>
                <div>
                  <span className="font-medium">Requested by:</span> {request.host?.name}
                </div>
                {request.assigned_to && (
                  <div>
                    <span className="font-medium">Assigned to:</span> {request.assigned_to.name}
                  </div>
                )}
                <div>
                  <span className="font-medium">Date:</span>{' '}
                  {new Date(request.requested_at).toLocaleDateString()}
                </div>
              </div>

              {request.photos && request.photos.length > 0 && (
                <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                  <Camera className="h-4 w-4" />
                  {request.photos.length} photo(s)
                </div>
              )}

              <div className="flex gap-2 mt-4">
                {request.status === 'REQUESTED' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateRequestStatus(request.id, 'ASSIGNED')}
                    >
                      Assign
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => updateRequestStatus(request.id, 'IN_PROGRESS')}
                    >
                      Start Work
                    </Button>
                  </>
                )}
                
                {request.status === 'IN_PROGRESS' && (
                  <Button
                    size="sm"
                    onClick={() => updateRequestStatus(request.id, 'COMPLETED')}
                  >
                    Complete
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedRequest(request);
                    setShowPhotoModal(true);
                  }}
                >
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Request Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">New Maintenance Request</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <Input
                value={newRequest.title}
                onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                placeholder="Brief description of the issue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description *</label>
              <Textarea
                value={newRequest.description}
                onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                placeholder="Detailed description of the issue"
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Priority</label>
              <Select value={newRequest.priority} onValueChange={(value) => setNewRequest({ ...newRequest, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMERGENCY">Emergency</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <Select value={newRequest.category} onValueChange={(value) => setNewRequest({ ...newRequest, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category: any) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <Select value={newRequest.location} onValueChange={(value) => setNewRequest({ ...newRequest, location: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location: any) => (
                    <SelectItem key={location.id} value={location.id.toString()}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={createRequest}>
              Create Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* Photo Modal */}
      <Modal isOpen={showPhotoModal} onClose={() => setShowPhotoModal(false)}>
        {selectedRequest && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">{selectedRequest.title}</h2>
            
            <div className="space-y-4">
              <p>{selectedRequest.description}</p>
              
              <div className="flex items-center gap-4">
                <Badge variant={getPriorityColor(selectedRequest.priority)}>
                  {selectedRequest.priority}
                </Badge>
                <Badge variant={getStatusColor(selectedRequest.status)}>
                  {selectedRequest.status.replace('_', ' ')}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Location:</span> {selectedRequest.location?.name}
                </div>
                <div>
                  <span className="font-medium">Category:</span> {selectedRequest.category?.name}
                </div>
                <div>
                  <span className="font-medium">Requested by:</span> {selectedRequest.host?.name}
                </div>
                <div>
                  <span className="font-medium">Date:</span>{' '}
                  {new Date(selectedRequest.requested_at).toLocaleDateString()}
                </div>
              </div>

              {selectedRequest.photos && selectedRequest.photos.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Photos</h3>
                  <div className="grid gap-4">
                    {selectedRequest.photos.map((photo) => (
                      <div key={photo.id} className="space-y-2">
                        <img
                          src={`data:image/jpeg;base64,${photo.photo}`}
                          alt={photo.caption}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        {photo.caption && (
                          <p className="text-sm text-muted-foreground">{photo.caption}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setShowPhotoModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// Wrap the component with AdminPage for authentication
export default function MaintenancePage() {
  return (
    <AdminPage>
      <MaintenancePageContent />
    </AdminPage>
  );
}
