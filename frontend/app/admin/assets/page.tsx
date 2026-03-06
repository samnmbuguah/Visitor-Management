'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { Building, QrCode, CheckCircle, AlertTriangle, Wrench, Plus, Filter, Search } from 'lucide-react';
import axios from 'axios';

interface Asset {
  id: number;
  name: string;
  description: string;
  asset_type: { name: string };
  location: { name: string };
  status: string;
  serial_number: string;
  qr_code: string;
  last_maintenance_date: string;
  next_maintenance_date: string;
  manufacturer: string;
  model: string;
  purchase_date: string;
  warranty_expiry: string;
}

const API_BASE = '/api/property-management';

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  
  const [newAsset, setNewAsset] = useState({
    name: '',
    description: '',
    asset_type: '',
    location: '',
    serial_number: '',
    manufacturer: '',
    model: '',
    purchase_date: '',
    warranty_expiry: '',
    expected_lifespan_years: '',
    location_detail: '',
  });
  
  const [assetTypes, setAssetTypes] = useState([]);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    fetchAssets();
    fetchAssetTypes();
    fetchLocations();
  }, []);

  const fetchAssets = async () => {
    try {
      const response = await axios.get(`${API_BASE}/assets/`);
      setAssets(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssetTypes = async () => {
    try {
      const response = await axios.get(`${API_BASE}/asset-types/`);
      setAssetTypes(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching asset types:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await axios.get('/api/visitors/locations/');
      setLocations(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const createAsset = async () => {
    if (!newAsset.name || !newAsset.asset_type || !newAsset.location) {
      return;
    }

    try {
      await axios.post(`${API_BASE}/assets/`, newAsset);
      setShowCreateModal(false);
      setNewAsset({
        name: '',
        description: '',
        asset_type: '',
        location: '',
        serial_number: '',
        manufacturer: '',
        model: '',
        purchase_date: '',
        warranty_expiry: '',
        expected_lifespan_years: '',
        location_detail: '',
      });
      fetchAssets();
    } catch (error) {
      console.error('Error creating asset:', error);
    }
  };

  const generateQRCode = async (assetId: number) => {
    try {
      const response = await axios.get(`${API_BASE}/assets/${assetId}/qr_code/`);
      setQrCodeData(response.data.qr_code);
      setShowQRModal(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const checkoutAsset = async (assetId: number) => {
    const expectedReturn = prompt('Enter expected return date (YYYY-MM-DD):', 
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    
    if (!expectedReturn) return;
    
    try {
      await axios.post(`${API_BASE}/assets/${assetId}/checkout/`, {
        expected_return_at: expectedReturn,
        notes: 'Checked out via web app',
        condition: 'Good condition',
      });
      fetchAssets();
    } catch (error) {
      console.error('Error checking out asset:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPERATIONAL': return 'success';
      case 'UNDER_MAINTENANCE': return 'warning';
      case 'OUT_OF_SERVICE': return 'destructive';
      case 'RETIRED': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPERATIONAL': return <CheckCircle className="h-4 w-4" />;
      case 'UNDER_MAINTENANCE': return <Wrench className="h-4 w-4" />;
      case 'OUT_OF_SERVICE': return <AlertTriangle className="h-4 w-4" />;
      case 'RETIRED': return <AlertTriangle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getMaintenanceStatus = (asset: Asset) => {
    if (!asset.next_maintenance_date) return null;
    
    const nextMaintenance = new Date(asset.next_maintenance_date);
    const today = new Date();
    const daysUntil = Math.ceil((nextMaintenance.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) return { status: 'Overdue', color: 'destructive' };
    if (daysUntil <= 7) return { status: 'Due Soon', color: 'warning' };
    if (daysUntil <= 30) return { status: 'Scheduled', color: 'info' };
    return null;
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.serial_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || asset.status === filterStatus;
    const matchesType = filterType === 'all' || asset.asset_type?.name === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
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
          <h1 className="text-3xl font-bold">Asset Management</h1>
          <p className="text-muted-foreground">Track and manage property assets</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Asset
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="OPERATIONAL">Operational</SelectItem>
                <SelectItem value="UNDER_MAINTENANCE">Under Maintenance</SelectItem>
                <SelectItem value="OUT_OF_SERVICE">Out of Service</SelectItem>
                <SelectItem value="RETIRED">Retired</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {assetTypes.map((type: any) => (
                  <SelectItem key={type.id} value={type.name}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assets Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredAssets.map((asset) => {
          const maintenanceStatus = getMaintenanceStatus(asset);
          
          return (
            <Card key={asset.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{asset.name}</CardTitle>
                  <Badge variant={getStatusColor(asset.status)}>
                    {getStatusIcon(asset.status)}
                    <span className="ml-1">{asset.status.replace('_', ' ')}</span>
                  </Badge>
                </div>
                
                {maintenanceStatus && (
                  <Badge variant={maintenanceStatus.color} className="w-fit">
                    {maintenanceStatus.status}
                  </Badge>
                )}
              </CardHeader>
              
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {asset.description}
                </p>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Type:</span> {asset.asset_type?.name}
                  </div>
                  <div>
                    <span className="font-medium">Location:</span> {asset.location?.name}
                  </div>
                  {asset.serial_number && (
                    <div>
                      <span className="font-medium">Serial:</span> {asset.serial_number}
                    </div>
                  )}
                  {asset.manufacturer && (
                    <div>
                      <span className="font-medium">Manufacturer:</span> {asset.manufacturer}
                    </div>
                  )}
                  {asset.last_maintenance_date && (
                    <div>
                      <span className="font-medium">Last Maintenance:</span>{' '}
                      {new Date(asset.last_maintenance_date).toLocaleDateString()}
                    </div>
                  )}
                  {asset.next_maintenance_date && (
                    <div>
                      <span className="font-medium">Next Maintenance:</span>{' '}
                      {new Date(asset.next_maintenance_date).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateQRCode(asset.id)}
                  >
                    <QrCode className="h-4 w-4 mr-1" />
                    QR
                  </Button>
                  
                  {asset.status === 'OPERATIONAL' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => checkoutAsset(asset.id)}
                    >
                      Check Out
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedAsset(asset);
                      setShowDetailModal(true);
                    }}
                  >
                    Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create Asset Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">New Asset</h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">Name *</label>
              <Input
                value={newAsset.name}
                onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                placeholder="Asset name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Asset Type *</label>
              <Select value={newAsset.asset_type} onValueChange={(value) => setNewAsset({ ...newAsset, asset_type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {assetTypes.map((type: any) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Location *</label>
              <Select value={newAsset.location} onValueChange={(value) => setNewAsset({ ...newAsset, location: value })}>
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

            <div>
              <label className="block text-sm font-medium mb-2">Serial Number</label>
              <Input
                value={newAsset.serial_number}
                onChange={(e) => setNewAsset({ ...newAsset, serial_number: e.target.value })}
                placeholder="Serial number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Manufacturer</label>
              <Input
                value={newAsset.manufacturer}
                onChange={(e) => setNewAsset({ ...newAsset, manufacturer: e.target.value })}
                placeholder="Manufacturer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Model</label>
              <Input
                value={newAsset.model}
                onChange={(e) => setNewAsset({ ...newAsset, model: e.target.value })}
                placeholder="Model"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Purchase Date</label>
              <Input
                type="date"
                value={newAsset.purchase_date}
                onChange={(e) => setNewAsset({ ...newAsset, purchase_date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Warranty Expiry</label>
              <Input
                type="date"
                value={newAsset.warranty_expiry}
                onChange={(e) => setNewAsset({ ...newAsset, warranty_expiry: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={newAsset.description}
                onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
                placeholder="Asset description"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Expected Lifespan (years)</label>
              <Input
                type="number"
                value={newAsset.expected_lifespan_years}
                onChange={(e) => setNewAsset({ ...newAsset, expected_lifespan_years: e.target.value })}
                placeholder="Expected lifespan in years"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Location Detail</label>
              <Input
                value={newAsset.location_detail}
                onChange={(e) => setNewAsset({ ...newAsset, location_detail: e.target.value })}
                placeholder="Specific location within building"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={createAsset}>
              Create Asset
            </Button>
          </div>
        </div>
      </Modal>

      {/* Asset Detail Modal */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)}>
        {selectedAsset && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">{selectedAsset.name}</h2>
              <Button
                variant="outline"
                onClick={() => generateQRCode(selectedAsset.id)}
              >
                <QrCode className="h-4 w-4 mr-2" />
                Generate QR Code
              </Button>
            </div>
            
            <div className="space-y-4">
              <p>{selectedAsset.description}</p>
              
              <div className="flex items-center gap-4">
                <Badge variant={getStatusColor(selectedAsset.status)}>
                  {getStatusIcon(selectedAsset.status)}
                  <span className="ml-1">{selectedAsset.status.replace('_', ' ')}</span>
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Type:</span> {selectedAsset.asset_type?.name}
                </div>
                <div>
                  <span className="font-medium">Location:</span> {selectedAsset.location?.name}
                </div>
                {selectedAsset.serial_number && (
                  <div>
                    <span className="font-medium">Serial Number:</span> {selectedAsset.serial_number}
                  </div>
                )}
                {selectedAsset.manufacturer && (
                  <div>
                    <span className="font-medium">Manufacturer:</span> {selectedAsset.manufacturer}
                  </div>
                )}
                {selectedAsset.model && (
                  <div>
                    <span className="font-medium">Model:</span> {selectedAsset.model}
                  </div>
                )}
                {selectedAsset.purchase_date && (
                  <div>
                    <span className="font-medium">Purchase Date:</span>{' '}
                    {new Date(selectedAsset.purchase_date).toLocaleDateString()}
                  </div>
                )}
                {selectedAsset.warranty_expiry && (
                  <div>
                    <span className="font-medium">Warranty Expiry:</span>{' '}
                    {new Date(selectedAsset.warranty_expiry).toLocaleDateString()}
                  </div>
                )}
                {selectedAsset.last_maintenance_date && (
                  <div>
                    <span className="font-medium">Last Maintenance:</span>{' '}
                    {new Date(selectedAsset.last_maintenance_date).toLocaleDateString()}
                  </div>
                )}
                {selectedAsset.next_maintenance_date && (
                  <div>
                    <span className="font-medium">Next Maintenance:</span>{' '}
                    {new Date(selectedAsset.next_maintenance_date).toLocaleDateString()}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                {selectedAsset.status === 'OPERATIONAL' && (
                  <Button onClick={() => checkoutAsset(selectedAsset.id)}>
                    Check Out Asset
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => generateQRCode(selectedAsset.id)}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Generate QR Code
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* QR Code Modal */}
      <Modal isOpen={showQRModal} onClose={() => setShowQRModal(false)}>
        <div className="space-y-6 text-center">
          <h2 className="text-2xl font-bold">QR Code</h2>
          
          {qrCodeData ? (
            <div className="space-y-4">
              <img
                src={`data:image/png;base64,${qrCodeData}`}
                alt="QR Code"
                className="w-64 h-64 mx-auto"
              />
              {selectedAsset && (
                <p className="text-lg font-medium">{selectedAsset.name}</p>
              )}
            </div>
          ) : (
            <div className="py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Generating QR Code...</p>
            </div>
          )}
          
          <div className="flex justify-center">
            <Button onClick={() => setShowQRModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
