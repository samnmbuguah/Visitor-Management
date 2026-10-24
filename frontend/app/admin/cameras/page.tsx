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
  CircularProgress,
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Videocam as VideocamIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCameras, createCamera, deleteCamera, getLocations } from '@/lib/api';

function CameraManagementContent() {
  const queryClient = useQueryClient();
  const [openAddModal, setOpenAddModal] = useState(false);
  const [cameraForm, setCameraForm] = useState({
    name: '',
    stream_url: '',
    location_id: '',
    ip_address: '',
  });

  const { data: cameras = [], isLoading: camerasLoading } = useQuery({
    queryKey: ['cameras'],
    queryFn: () => getCameras().then((res) => res.data.results || res.data || []),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => getLocations().then((res) => res.data.results || res.data || []),
  });

  const createMutation = useMutation({
    mutationFn: createCamera,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
      setOpenAddModal(false);
      setCameraForm({ name: '', stream_url: '', location_id: '', ip_address: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCamera,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cameras'] }),
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cameraForm.name) {
      alert('Camera name is required.');
      return;
    }
    createMutation.mutate({
      name: cameraForm.name,
      stream_url: cameraForm.stream_url,
      ip_address: cameraForm.ip_address,
      location: cameraForm.location_id ? parseInt(cameraForm.location_id) : undefined,
      status: 'ONLINE',
    });
  };

  const handleDelete = (id: string | number) => {
    if (confirm('Are you sure you want to remove this camera stream?')) {
      deleteMutation.mutate(String(id));
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', py: 4, bgcolor: 'background.default' }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
          <Box>
            <Typography variant="h4" color="text.primary" sx={{fontWeight: 800}}>
              Surveillance Camera Setup
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Connect IP cameras, RTSP streams, and turnstile monitoring for entrance security
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => queryClient.invalidateQueries({ queryKey: ['cameras'] })}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenAddModal(true)}
            >
              Add Camera
            </Button>
          </Box>
        </Box>

        {/* Content Card */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <CardContent sx={{ p: 3 }}>
            {camerasLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Table>
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Camera Stream Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Assigned Facility</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>IP / RTSP Endpoint</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cameras.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                          No surveillance cameras added yet. Click &quot;Add Camera&quot; to configure your security feeds.
                        </TableCell>
                      </TableRow>
                    ) : (
                      cameras.map((cam: any) => (
                        <TableRow key={cam.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <VideocamIcon color="primary" />
                              <Typography variant="subtitle2" sx={{fontWeight: 700}}>
                                {cam.name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{cam.location_name || 'Main Reception'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary" sx={{fontFamily: 'monospace'}}>
                              {cam.stream_url || cam.ip_address || 'rtsp://192.168.1.100/live'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={cam.status || 'ONLINE'}
                              color={cam.status === 'OFFLINE' ? 'default' : 'success'}
                              size="small"
                              sx={{ fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Delete camera">
                              <IconButton size="small" color="error" onClick={() => handleDelete(cam.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
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

        {/* Add Camera Dialog */}
        <Dialog open={openAddModal} onClose={() => setOpenAddModal(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Connect Security Camera</DialogTitle>
          <form onSubmit={handleAddSubmit}>
            <DialogContent dividers>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  required
                  fullWidth
                  label="Camera Display Name"
                  placeholder="e.g. Turnstile East 01"
                  value={cameraForm.name}
                  onChange={(e) => setCameraForm({ ...cameraForm, name: e.target.value })}
                />
                <TextField
                  fullWidth
                  label="Stream URL / RTSP / Webhook"
                  placeholder="rtsp://admin:pass@192.168.1.50:554/h264"
                  value={cameraForm.stream_url}
                  onChange={(e) => setCameraForm({ ...cameraForm, stream_url: e.target.value })}
                />
                <TextField
                  fullWidth
                  label="IP Address"
                  placeholder="192.168.1.50"
                  value={cameraForm.ip_address}
                  onChange={(e) => setCameraForm({ ...cameraForm, ip_address: e.target.value })}
                />
                <FormControl fullWidth>
                  <InputLabel>Assigned Location</InputLabel>
                  <Select
                    value={cameraForm.location_id}
                    label="Assigned Location"
                    onChange={(e) => setCameraForm({ ...cameraForm, location_id: e.target.value })}
                  >
                    {locations.map((l: any) => (
                      <MenuItem key={l.id} value={l.id.toString()}>
                        {l.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
              <Button onClick={() => setOpenAddModal(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={createMutation.isPending}>
                Save Camera
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Container>
    </Box>
  );
}

export default function CameraManagementPage() {
  return (
    <AdminPage>
      <CameraManagementContent />
    </AdminPage>
  );
}
