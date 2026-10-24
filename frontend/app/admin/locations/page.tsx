'use client';

import React, { useState } from 'react';
import { AdminPage } from '@/components/ProtectedPage';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  CircularProgress,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  LocationCity as BuildingIcon,
  Devices as KioskIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as ActiveIcon,
  Policy as PolicyIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  useLocations,
  useKiosks,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
  useCreateKiosk,
} from '@/hooks/useData';

function LocationsPageContent() {
  const [activeTab, setActiveTab] = useState(0);

  // Modals
  const [openLocationModal, setOpenLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any | null>(null);
  const [locationForm, setLocationForm] = useState({
    name: '',
    address: '',
    floor: '',
    timezone: 'UTC',
    require_nda: true,
    require_photo: true,
  });

  const [openKioskModal, setOpenKioskModal] = useState(false);
  const [kioskForm, setKioskForm] = useState({
    name: '',
    device_id: '',
    location_id: '',
  });

  // Queries
  const { data: locationsData = [], isLoading: locationsLoading, refetch: refetchLocations } = useLocations();
  const { data: kiosksData = [], isLoading: kiosksLoading, refetch: refetchKiosks } = useKiosks();

  // Mutations
  const createLocationMutation = useCreateLocation();
  const updateLocationMutation = useUpdateLocation();
  const deleteLocationMutation = useDeleteLocation();
  const createKioskMutation = useCreateKiosk();

  const locationsList = Array.isArray(locationsData) ? locationsData : (locationsData as any)?.results || [];
  const kiosksList = Array.isArray(kiosksData) ? kiosksData : (kiosksData as any)?.results || [];

  const handleOpenAddLocation = () => {
    setEditingLocation(null);
    setLocationForm({
      name: '',
      address: '',
      floor: '',
      timezone: 'UTC',
      require_nda: true,
      require_photo: true,
    });
    setOpenLocationModal(true);
  };

  const handleOpenEditLocation = (loc: any) => {
    setEditingLocation(loc);
    setLocationForm({
      name: loc.name || '',
      address: loc.address || '',
      floor: loc.floor || '',
      timezone: loc.timezone || 'UTC',
      require_nda: loc.require_nda !== false,
      require_photo: loc.require_photo !== false,
    });
    setOpenLocationModal(true);
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationForm.name) {
      alert('Location name is required.');
      return;
    }

    try {
      if (editingLocation) {
        await updateLocationMutation.mutateAsync({
          id: editingLocation.id,
          data: locationForm,
        });
      } else {
        await createLocationMutation.mutateAsync({
          ...locationForm,
          is_active: true,
        });
      }
      setOpenLocationModal(false);
      refetchLocations();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save location.');
    }
  };

  const handleDeleteLocation = async (id: number) => {
    if (!confirm('Are you sure you want to delete this facility location?')) return;
    try {
      await deleteLocationMutation.mutateAsync(id);
      refetchLocations();
    } catch (err: any) {
      alert('Failed to delete location.');
    }
  };

  const handleKioskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kioskForm.name || !kioskForm.location_id) {
      alert('Kiosk name and location are required.');
      return;
    }

    try {
      await createKioskMutation.mutateAsync({
        name: kioskForm.name,
        device_id: kioskForm.device_id || `KIOSK-${Date.now().toString().slice(-4)}`,
        location: parseInt(kioskForm.location_id),
        is_active: true,
      });
      setOpenKioskModal(false);
      setKioskForm({ name: '', device_id: '', location_id: '' });
      refetchKiosks();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to register kiosk.');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', py: 4, bgcolor: 'background.default' }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
          <Box>
            <Typography variant="h4" color="text.primary" sx={{fontWeight: 800}}>
              Locations & Kiosks
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Configure multi-building facilities, security policies, and self-service iPad/tablet kiosks
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => {
                refetchLocations();
                refetchKiosks();
              }}
            >
              Refresh
            </Button>
            {activeTab === 0 ? (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenAddLocation}
              >
                Add Location
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenKioskModal(true)}
              >
                Add Kiosk
              </Button>
            )}
          </Box>
        </Box>

        {/* Tabs */}
        <Paper sx={{ mb: 3, borderRadius: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            indicatorColor="primary"
            textColor="primary"
            sx={{ px: 2 }}
          >
            <Tab label="Buildings & Locations" icon={<BuildingIcon />} iconPosition="start" />
            <Tab label="Self-Service Tablet Kiosks" icon={<KioskIcon />} iconPosition="start" />
          </Tabs>
        </Paper>

        {/* Tab 0: Locations */}
        {activeTab === 0 && (
          <Grid container spacing={3}>
            {locationsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : locationsList.length === 0 ? (
              <Grid size={12}>
                <Card sx={{ p: 6, textAlign: 'center' }}>
                  <BuildingIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No locations configured yet. Add your first facility to begin checking in visitors.
                  </Typography>
                </Card>
              </Grid>
            ) : (
              locationsList.map((loc: any) => (
                <Grid size={{xs: 12, md: 6, lg: 4}} key={loc.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3 }}>
                    <CardContent sx={{ flex: 1, p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <BuildingIcon color="primary" sx={{ fontSize: 28 }} />
                          <Typography variant="h6" sx={{fontWeight: 800}}>
                            {loc.name}
                          </Typography>
                        </Box>
                        <Chip
                          label={loc.is_active ? 'Active' : 'Inactive'}
                          color={loc.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {loc.address || 'Standard Corporate Facility'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 2 }}>
                        Floor: {loc.floor || 'Level 1'} • Timezone: {loc.timezone || 'UTC'}
                      </Typography>

                      <Paper sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, mb: 2 }}>
                        <Typography variant="caption" component="div" color="text.secondary" sx={{mb: 0.5, fontWeight: 700}}>
                          VISITOR SECURITY REQUIREMENTS:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip
                            label={loc.require_nda !== false ? 'NDA Signature' : 'No NDA'}
                            size="small"
                            variant="outlined"
                            color={loc.require_nda !== false ? 'primary' : 'default'}
                          />
                          <Chip
                            label={loc.require_photo !== false ? 'Photo Capture' : 'No Photo'}
                            size="small"
                            variant="outlined"
                            color={loc.require_photo !== false ? 'secondary' : 'default'}
                          />
                        </Box>
                      </Paper>

                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 1 }}>
                        <IconButton size="small" onClick={() => handleOpenEditLocation(loc)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteLocation(loc.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        )}

        {/* Tab 1: Kiosks */}
        {activeTab === 1 && (
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ p: 3 }}>
              {kiosksLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <Table>
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Kiosk Device</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Device ID</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Assigned Facility</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Device Status</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Last Heartbeat</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {kiosksList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                            No self-service kiosks registered. Click &quot;Add Kiosk&quot; to connect a reception tablet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        kiosksList.map((kiosk: any) => (
                          <TableRow key={kiosk.id} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <KioskIcon color="action" />
                                <Typography variant="subtitle2" sx={{fontWeight: 700}}>
                                  {kiosk.name}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={kiosk.device_id || `KIOSK-${kiosk.id}`}
                                size="small"
                                variant="outlined"
                                sx={{ fontFamily: 'monospace' }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {kiosk.location_name || (typeof kiosk.location === 'object' ? kiosk.location?.name : `Location #${kiosk.location}`)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={kiosk.is_active ? 'Online' : 'Offline'}
                                color={kiosk.is_active ? 'success' : 'default'}
                                size="small"
                                sx={{ fontWeight: 700 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {kiosk.last_ping ? new Date(kiosk.last_ping).toLocaleTimeString() : 'Just now'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Location Form Dialog */}
        <Dialog open={openLocationModal} onClose={() => setOpenLocationModal(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>
            {editingLocation ? 'Edit Facility Location' : 'Add New Location'}
          </DialogTitle>
          <form onSubmit={handleLocationSubmit}>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid size={12}>
                  <TextField
                    required
                    fullWidth
                    label="Facility / Building Name"
                    placeholder="e.g. Headquarters - Tower A"
                    value={locationForm.name}
                    onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="Full Physical Address"
                    placeholder="123 Innovation Blvd, Suite 400"
                    value={locationForm.address}
                    onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                  />
                </Grid>
                <Grid size={{xs: 12, sm: 6}}>
                  <TextField
                    fullWidth
                    label="Floor / Suite"
                    placeholder="4th Floor"
                    value={locationForm.floor}
                    onChange={(e) => setLocationForm({ ...locationForm, floor: e.target.value })}
                  />
                </Grid>
                <Grid size={{xs: 12, sm: 6}}>
                  <FormControl fullWidth>
                    <InputLabel>Timezone</InputLabel>
                    <Select
                      value={locationForm.timezone}
                      label="Timezone"
                      onChange={(e) => setLocationForm({ ...locationForm, timezone: e.target.value })}
                    >
                      <MenuItem value="UTC">UTC</MenuItem>
                      <MenuItem value="America/New_York">America/New_York (EST)</MenuItem>
                      <MenuItem value="America/Chicago">America/Chicago (CST)</MenuItem>
                      <MenuItem value="America/Denver">America/Denver (MST)</MenuItem>
                      <MenuItem value="America/Los_Angeles">America/Los_Angeles (PST)</MenuItem>
                      <MenuItem value="Europe/London">Europe/London (GMT/BST)</MenuItem>
                      <MenuItem value="Europe/Paris">Europe/Paris (CET)</MenuItem>
                      <MenuItem value="Asia/Tokyo">Asia/Tokyo (JST)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={12}>
                  <Typography variant="subtitle2" sx={{mt: 1, mb: 1, fontWeight: 700}}>
                    Security Check-In Policies
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={locationForm.require_nda}
                        onChange={(e) => setLocationForm({ ...locationForm, require_nda: e.target.checked })}
                      />
                    }
                    label="Require Digital NDA Signature upon Check-In"
                  />
                  <br />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={locationForm.require_photo}
                        onChange={(e) => setLocationForm({ ...locationForm, require_photo: e.target.checked })}
                      />
                    }
                    label="Require Webcam Photo Capture for Visitor Badge"
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
              <Button onClick={() => setOpenLocationModal(false)}>Cancel</Button>
              <Button
                type="submit"
                variant="contained"
                disabled={createLocationMutation.isPending || updateLocationMutation.isPending}
              >
                Save Location
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Kiosk Form Dialog */}
        <Dialog open={openKioskModal} onClose={() => setOpenKioskModal(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Register Self-Service Kiosk</DialogTitle>
          <form onSubmit={handleKioskSubmit}>
            <DialogContent dividers>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  required
                  fullWidth
                  label="Kiosk Name"
                  placeholder="e.g. Lobby iPad #1"
                  value={kioskForm.name}
                  onChange={(e) => setKioskForm({ ...kioskForm, name: e.target.value })}
                />
                <TextField
                  fullWidth
                  label="Device Serial / Identifier (Optional)"
                  placeholder="e.g. IPAD-LOBBY-01"
                  value={kioskForm.device_id}
                  onChange={(e) => setKioskForm({ ...kioskForm, device_id: e.target.value })}
                />
                <FormControl fullWidth required>
                  <InputLabel>Assigned Location</InputLabel>
                  <Select
                    value={kioskForm.location_id}
                    label="Assigned Location"
                    onChange={(e) => setKioskForm({ ...kioskForm, location_id: e.target.value })}
                  >
                    {locationsList.map((l: any) => (
                      <MenuItem key={l.id} value={l.id}>
                        {l.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
              <Button onClick={() => setOpenKioskModal(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={createKioskMutation.isPending}>
                Register Kiosk
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Container>
    </Box>
  );
}

export default function LocationsPage() {
  return (
    <AdminPage>
      <LocationsPageContent />
    </AdminPage>
  );
}
