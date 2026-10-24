'use client';

import React, { useState, useRef } from 'react';
import { AdminPage } from '@/components/ProtectedPage';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  InputAdornment,
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
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Search as SearchIcon,
  Add as AddIcon,
  UploadFile as UploadFileIcon,
  QrCode as QrCodeIcon,
  Cancel as CancelIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  ContentCopy as ContentCopyIcon,
  Share as ShareIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  useInvites,
  useHosts,
  useLocations,
  useCreateInvite,
  useBulkUploadInvites,
  useCancelInvite,
} from '@/hooks/useData';

function InvitesPageContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Single Invite Dialog
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    visitor_name: '',
    visitor_email: '',
    visitor_phone: '',
    visitor_company: '',
    host_id: '',
    location_id: '',
    expected_arrival: '',
    purpose: '',
  });

  // Bulk CSV Upload Dialog
  const [openBulkModal, setOpenBulkModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [bulkHostId, setBulkHostId] = useState('');
  const [bulkLocationId, setBulkLocationId] = useState('');
  const [bulkResult, setBulkResult] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Invite Detail / QR Modal
  const [selectedInvite, setSelectedInvite] = useState<any | null>(null);

  // Queries
  const { data: invitesData = [], isLoading, refetch } = useInvites();
  const { data: hostsData = [] } = useHosts();
  const { data: locationsData = [] } = useLocations();

  // Mutations
  const createInviteMutation = useCreateInvite();
  const bulkUploadMutation = useBulkUploadInvites();
  const cancelInviteMutation = useCancelInvite();

  const invitesList = Array.isArray(invitesData) ? invitesData : (invitesData as any)?.results || [];
  const hostsList = Array.isArray(hostsData) ? hostsData : (hostsData as any)?.results || [];
  const locationsList = Array.isArray(locationsData) ? locationsData : (locationsData as any)?.results || [];

  const filteredInvites = invitesList.filter((inv: any) => {
    const matchesSearch =
      (inv.visitor_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.visitor_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.access_code || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.visitor_name || !inviteForm.visitor_email || !inviteForm.host_id || !inviteForm.location_id) {
      alert('Please fill in required fields.');
      return;
    }

    try {
      await createInviteMutation.mutateAsync({
        visitor_name: inviteForm.visitor_name,
        visitor_email: inviteForm.visitor_email,
        visitor_phone: inviteForm.visitor_phone,
        visitor_company: inviteForm.visitor_company,
        host: parseInt(inviteForm.host_id),
        location: parseInt(inviteForm.location_id),
        expected_arrival: inviteForm.expected_arrival || new Date().toISOString(),
        purpose: inviteForm.purpose,
      });
      setOpenCreateModal(false);
      setInviteForm({
        visitor_name: '',
        visitor_email: '',
        visitor_phone: '',
        visitor_company: '',
        host_id: '',
        location_id: '',
        expected_arrival: '',
        purpose: '',
      });
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create invitation.');
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) {
      alert('Please select a CSV file.');
      return;
    }

    const formData = new FormData();
    formData.append('file', csvFile);
    if (bulkHostId) formData.append('host', bulkHostId);
    if (bulkLocationId) formData.append('location', bulkLocationId);

    try {
      const res = await bulkUploadMutation.mutateAsync(formData);
      setBulkResult(res);
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to process bulk upload.');
    }
  };

  const handleCancelInvite = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this invitation? The QR code will be invalidated.')) {
      return;
    }
    try {
      await cancelInviteMutation.mutateAsync(id);
      refetch();
    } catch (err: any) {
      alert('Failed to cancel invite.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Access code copied to clipboard!');
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <Chip label="Scheduled" color="info" size="small" sx={{ fontWeight: 700 }} />;
      case 'CHECKED_IN':
        return <Chip label="Checked In" color="success" size="small" sx={{ fontWeight: 700 }} />;
      case 'CANCELLED':
        return <Chip label="Cancelled" color="error" size="small" sx={{ fontWeight: 700 }} />;
      case 'EXPIRED':
        return <Chip label="Expired" color="default" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', py: 4, bgcolor: 'background.default' }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
          <Box>
            <Typography variant="h4" color="text.primary" sx={{fontWeight: 800}}>
              Pre-Registrations & Invitations
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Invite guests with digital QR passes and manage bulk event imports
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={() => {
                setBulkResult(null);
                setOpenBulkModal(true);
              }}
            >
              Bulk Import (CSV)
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenCreateModal(true)}
            >
              New Invite
            </Button>
          </Box>
        </Box>

        {/* Content Card */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <CardContent sx={{ p: 3 }}>
            {/* Search and Filters */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{xs: 12, md: 6}}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search by visitor name, email, or access code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  slotProps={{ input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                  } }}
                />
              </Grid>
              <Grid size={{xs: 12, md: 3}}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="ALL">All Statuses</MenuItem>
                    <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                    <MenuItem value="CHECKED_IN">Checked In</MenuItem>
                    <MenuItem value="CANCELLED">Cancelled</MenuItem>
                    <MenuItem value="EXPIRED">Expired</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{xs: 12, md: 3}} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <Typography variant="body2" color="text.secondary">
                  Total Invites: <strong>{filteredInvites.length}</strong>
                </Typography>
              </Grid>
            </Grid>

            {/* Table */}
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Table>
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Guest Information</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Host</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Access Code / Pass</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Expected Arrival</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredInvites.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                          No invitations found. Click &quot;New Invite&quot; to send a digital QR invitation pass.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInvites.map((invite: any) => (
                        <TableRow key={invite.id} hover>
                          <TableCell>
                            <Typography variant="subtitle2" sx={{fontWeight: 700}}>
                              {invite.visitor_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" component="div">
                              {invite.visitor_email} {invite.visitor_company ? `• ${invite.visitor_company}` : ''}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{invite.host_name || 'Designated Host'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{invite.location_name || 'Main Facility'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={invite.access_code || 'QR CODE'}
                                size="small"
                                variant="outlined"
                                sx={{ fontFamily: 'monospace', fontWeight: 700 }}
                              />
                              {invite.access_code && (
                                <Tooltip title="Copy Access Code">
                                  <IconButton size="small" onClick={() => copyToClipboard(invite.access_code)}>
                                    <ContentCopyIcon fontSize="inherit" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {invite.expected_arrival
                                ? new Date(invite.expected_arrival).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                                : 'Flexible'}
                            </Typography>
                          </TableCell>
                          <TableCell>{getStatusChip(invite.status)}</TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<QrCodeIcon />}
                                onClick={() => setSelectedInvite(invite)}
                              >
                                View QR
                              </Button>
                              {invite.status === 'SCHEDULED' && (
                                <Button
                                  size="small"
                                  color="error"
                                  variant="text"
                                  onClick={() => handleCancelInvite(invite.id)}
                                >
                                  Cancel
                                </Button>
                              )}
                            </Box>
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

        {/* Create Single Invite Dialog */}
        <Dialog open={openCreateModal} onClose={() => setOpenCreateModal(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Create Visitor Invitation</DialogTitle>
          <form onSubmit={handleCreateSubmit}>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid size={{xs: 12, sm: 6}}>
                  <TextField
                    required
                    fullWidth
                    label="Visitor Name"
                    value={inviteForm.visitor_name}
                    onChange={(e) => setInviteForm({ ...inviteForm, visitor_name: e.target.value })}
                  />
                </Grid>
                <Grid size={{xs: 12, sm: 6}}>
                  <TextField
                    required
                    fullWidth
                    type="email"
                    label="Visitor Email"
                    value={inviteForm.visitor_email}
                    onChange={(e) => setInviteForm({ ...inviteForm, visitor_email: e.target.value })}
                  />
                </Grid>
                <Grid size={{xs: 12, sm: 6}}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    value={inviteForm.visitor_phone}
                    onChange={(e) => setInviteForm({ ...inviteForm, visitor_phone: e.target.value })}
                  />
                </Grid>
                <Grid size={{xs: 12, sm: 6}}>
                  <TextField
                    fullWidth
                    label="Company / Affiliation"
                    value={inviteForm.visitor_company}
                    onChange={(e) => setInviteForm({ ...inviteForm, visitor_company: e.target.value })}
                  />
                </Grid>
                <Grid size={{xs: 12, sm: 6}}>
                  <FormControl fullWidth required>
                    <InputLabel>Host</InputLabel>
                    <Select
                      value={inviteForm.host_id}
                      label="Host"
                      onChange={(e) => setInviteForm({ ...inviteForm, host_id: e.target.value })}
                    >
                      {hostsList.map((h: any) => (
                        <MenuItem key={h.id} value={h.id}>
                          {h.name || h.user?.first_name || h.email} ({h.email})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{xs: 12, sm: 6}}>
                  <FormControl fullWidth required>
                    <InputLabel>Location</InputLabel>
                    <Select
                      value={inviteForm.location_id}
                      label="Location"
                      onChange={(e) => setInviteForm({ ...inviteForm, location_id: e.target.value })}
                    >
                      {locationsList.map((l: any) => (
                        <MenuItem key={l.id} value={l.id}>
                          {l.name} - {l.floor || 'Floor 1'}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{xs: 12, sm: 6}}>
                  <TextField
                    fullWidth
                    type="datetime-local"
                    label="Expected Arrival"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={inviteForm.expected_arrival}
                    onChange={(e) => setInviteForm({ ...inviteForm, expected_arrival: e.target.value })}
                  />
                </Grid>
                <Grid size={{xs: 12, sm: 6}}>
                  <TextField
                    fullWidth
                    label="Purpose of Visit"
                    placeholder="e.g. Executive Quarterly Review"
                    value={inviteForm.purpose}
                    onChange={(e) => setInviteForm({ ...inviteForm, purpose: e.target.value })}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
              <Button onClick={() => setOpenCreateModal(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={createInviteMutation.isPending}>
                {createInviteMutation.isPending ? 'Sending...' : 'Send Invitation & Pass'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Bulk CSV Upload Dialog */}
        <Dialog open={openBulkModal} onClose={() => setOpenBulkModal(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Bulk Import Visitor Invites (CSV)</DialogTitle>
          <form onSubmit={handleBulkUpload}>
            <DialogContent dividers>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Upload a CSV file containing multiple guests for meetings, events, or group visits.
                CSV columns: <code>visitor_name, visitor_email, visitor_phone, visitor_company, purpose</code>
              </Typography>

              <Box sx={{ mb: 3 }}>
                <input
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setCsvFile(e.target.files[0]);
                    }
                  }}
                />
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{ py: 3, borderStyle: 'dashed' }}
                  startIcon={<UploadFileIcon />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {csvFile ? csvFile.name : 'Select CSV File From Computer'}
                </Button>
              </Box>

              <Grid container spacing={2}>
                <Grid size={{xs: 12, sm: 6}}>
                  <FormControl fullWidth>
                    <InputLabel>Default Host</InputLabel>
                    <Select
                      value={bulkHostId}
                      label="Default Host"
                      onChange={(e) => setBulkHostId(e.target.value)}
                    >
                      {hostsList.map((h: any) => (
                        <MenuItem key={h.id} value={h.id}>
                          {h.name || h.email}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{xs: 12, sm: 6}}>
                  <FormControl fullWidth>
                    <InputLabel>Default Location</InputLabel>
                    <Select
                      value={bulkLocationId}
                      label="Default Location"
                      onChange={(e) => setBulkLocationId(e.target.value)}
                    >
                      {locationsList.map((l: any) => (
                        <MenuItem key={l.id} value={l.id}>
                          {l.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {bulkResult && (
                <Alert severity="success" sx={{ mt: 3 }}>
                  Successfully created {bulkResult.created_count || bulkResult.count || 'all'} invitations! Digital passes have been queued.
                </Alert>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
              <Button onClick={() => setOpenBulkModal(false)}>Close</Button>
              <Button type="submit" variant="contained" disabled={!csvFile || bulkUploadMutation.isPending}>
                {bulkUploadMutation.isPending ? 'Processing...' : 'Upload & Send Invites'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* View Digital QR Invite Pass Modal */}
        <Dialog open={!!selectedInvite} onClose={() => setSelectedInvite(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ textAlign: 'center', fontWeight: 800 }}>Digital Invitation Pass</DialogTitle>
          <DialogContent>
            {selectedInvite && (
              <Box
                sx={{
                  border: '2px dashed #4f46e5',
                  borderRadius: 3,
                  p: 3,
                  textAlign: 'center',
                  bgcolor: '#ffffff',
                  color: '#000000',
                }}
              >
                <Typography variant="overline" color="primary.main" sx={{fontWeight: 800, letterSpacing: 1.5}}>
                  VIP VISITOR PASS
                </Typography>
                <Typography variant="h5" sx={{mt: 1, fontWeight: 800}}>
                  {selectedInvite.visitor_name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {selectedInvite.visitor_email}
                </Typography>

                <Box sx={{ my: 2 }}>
                  <QrCodeIcon sx={{ fontSize: 96, color: '#4f46e5' }} />
                  <Typography variant="h6" sx={{mt: 1, fontWeight: 800, fontFamily: 'monospace'}}>
                    {selectedInvite.access_code || 'INV-READY'}
                  </Typography>
                </Box>

                <Paper sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, textAlign: 'left', mb: 2 }}>
                  <Typography variant="caption" component="div">
                    <strong>Host:</strong> {selectedInvite.host_name || 'Designated Host'}
                  </Typography>
                  <Typography variant="caption" component="div">
                    <strong>Location:</strong> {selectedInvite.location_name || 'Main Office'}
                  </Typography>
                  <Typography variant="caption" component="div">
                    <strong>Scheduled:</strong> {new Date(selectedInvite.expected_arrival || Date.now()).toLocaleString()}
                  </Typography>
                  <Typography variant="caption" component="div">
                    <strong>Purpose:</strong> {selectedInvite.purpose || 'Business Visit'}
                  </Typography>
                </Paper>

                <Typography variant="caption" color="text.secondary">
                  Scan this pass at any self-service kiosk or present at front desk.
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
            <Button variant="outlined" onClick={() => setSelectedInvite(null)}>
              Close
            </Button>
            <Button
              variant="contained"
              startIcon={<ContentCopyIcon />}
              onClick={() => {
                if (selectedInvite) {
                  copyToClipboard(selectedInvite.access_code || 'INV-CODE');
                }
              }}
            >
              Copy Code
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}

export default function InvitesPage() {
  return (
    <AdminPage>
      <InvitesPageContent />
    </AdminPage>
  );
}
