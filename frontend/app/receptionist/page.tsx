'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ReceptionistPage as ReceptionistPageWrapper } from '@/components/ProtectedPage';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Button,
  IconButton,
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
  Avatar,
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
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Search as SearchIcon,
  PersonAdd as PersonAddIcon,
  Login as CheckInIcon,
  Logout as CheckOutIcon,
  Badge as BadgeIcon,
  QrCode as QrCodeIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Print as PrintIcon,
  Schedule as ScheduleIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import {
  useVisitors,
  useHosts,
  useLocations,
  useCreateVisitor,
  useCheckInVisitor,
  useCheckOutVisitor,
  useInvites,
} from '@/hooks/useData';

function ReceptionistPageContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Walk-in Registration Modal
  const [openWalkInModal, setOpenWalkInModal] = useState(false);
  const [walkInData, setWalkInData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    purpose: '',
    host_id: '',
    location_id: '',
    expected_duration: '60',
  });

  // Badge Print Preview Modal
  const [badgeVisitor, setBadgeVisitor] = useState<any | null>(null);

  // Invite Fast Lookup
  const [inviteCodeSearch, setInviteCodeSearch] = useState('');
  const [inviteLookupResult, setInviteLookupResult] = useState<any | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Queries
  const { data: visitorsData = [], isLoading: visitorsLoading, refetch: refetchVisitors } = useVisitors();
  const { data: hostsData = [] } = useHosts();
  const { data: locationsData = [] } = useLocations();
  const { data: invitesData = [] } = useInvites();

  // Mutations
  const createVisitorMutation = useCreateVisitor();
  const checkInMutation = useCheckInVisitor();
  const checkOutMutation = useCheckOutVisitor();

  const visitorsList = Array.isArray(visitorsData) ? visitorsData : (visitorsData as any)?.results || [];
  const hostsList = Array.isArray(hostsData) ? hostsData : (hostsData as any)?.results || [];
  const locationsList = Array.isArray(locationsData) ? locationsData : (locationsData as any)?.results || [];
  const invitesList = Array.isArray(invitesData) ? invitesData : (invitesData as any)?.results || [];

  // Filter visitors
  const filteredVisitors = visitorsList.filter((v: any) => {
    const matchesSearch =
      (v.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.badge_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.company || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInData.name || !walkInData.email || !walkInData.host_id || !walkInData.location_id) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      await createVisitorMutation.mutateAsync({
        name: walkInData.name,
        email: walkInData.email,
        phone: walkInData.phone,
        company: walkInData.company,
        purpose: walkInData.purpose,
        host: parseInt(walkInData.host_id),
        location: parseInt(walkInData.location_id),
        expected_duration: walkInData.expected_duration ? parseInt(walkInData.expected_duration) : 60,
        status: 'PENDING',
      });
      setOpenWalkInModal(false);
      setWalkInData({
        name: '',
        email: '',
        phone: '',
        company: '',
        purpose: '',
        host_id: '',
        location_id: '',
        expected_duration: '60',
      });
      refetchVisitors();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to register visitor.');
    }
  };

  const handleFastInviteSearch = () => {
    setInviteError(null);
    setInviteLookupResult(null);
    if (!inviteCodeSearch.trim()) return;

    const matched = invitesList.find(
      (inv: any) =>
        (inv.access_code && inv.access_code.toLowerCase() === inviteCodeSearch.trim().toLowerCase()) ||
        (inv.qr_code_token && inv.qr_code_token.toLowerCase() === inviteCodeSearch.trim().toLowerCase()) ||
        (inv.visitor_email && inv.visitor_email.toLowerCase() === inviteCodeSearch.trim().toLowerCase())
    );

    if (matched) {
      setInviteLookupResult(matched);
    } else {
      setInviteError('No active invitation found matching that code or email.');
    }
  };

  const handleCheckInFromInvite = async (invite: any) => {
    try {
      await createVisitorMutation.mutateAsync({
        name: invite.visitor_name,
        email: invite.visitor_email,
        phone: invite.visitor_phone || '',
        company: invite.visitor_company || '',
        host: typeof invite.host === 'object' ? invite.host?.id : invite.host,
        location: typeof invite.location === 'object' ? invite.location?.id : invite.location,
        purpose: invite.purpose || 'Invited Visit',
        status: 'CHECKED_IN',
      });
      setInviteLookupResult(null);
      setInviteCodeSearch('');
      setActiveTab(0);
      refetchVisitors();
    } catch (err: any) {
      alert('Failed to check in invited guest.');
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'CHECKED_IN':
        return <Chip label="Checked In" color="success" size="small" sx={{ fontWeight: 700 }} />;
      case 'CHECKED_OUT':
        return <Chip label="Checked Out" color="default" size="small" sx={{ fontWeight: 600 }} />;
      case 'PENDING':
        return <Chip label="Pending Host Approval" color="warning" size="small" sx={{ fontWeight: 700 }} />;
      case 'APPROVED':
        return <Chip label="Approved" color="info" size="small" sx={{ fontWeight: 700 }} />;
      case 'REJECTED':
        return <Chip label="Rejected" color="error" size="small" sx={{ fontWeight: 700 }} />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', py: 4, bgcolor: 'background.default' }}>
      <Container maxWidth="xl">
        {/* Header Section */}
        <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
          <Box>
            <Typography variant="h4" color="text.primary" sx={{fontWeight: 800}}>
              Front Desk Reception
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Real-time visitor processing, badges, check-ins, and departures
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => refetchVisitors()}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => setOpenWalkInModal(true)}
            >
              Walk-in Registration
            </Button>
          </Box>
        </Box>

        {/* Tab Navigation */}
        <Paper sx={{ mb: 3, borderRadius: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
            sx={{ px: 2 }}
          >
            <Tab label="Live Visitor Register" icon={<BadgeIcon />} iconPosition="start" />
            <Tab label="Invite & QR Code Fast Lookup" icon={<QrCodeIcon />} iconPosition="start" />
          </Tabs>
        </Paper>

        {/* Tab 0: Live Visitor Register */}
        {activeTab === 0 && (
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ p: 3 }}>
              {/* Filter and Search Bar */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{xs: 12, md: 6}}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search by visitor name, email, company, or badge..."
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
                    <InputLabel>Filter Status</InputLabel>
                    <Select
                      value={statusFilter}
                      label="Filter Status"
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <MenuItem value="ALL">All Statuses</MenuItem>
                      <MenuItem value="PENDING">Pending Host Approval</MenuItem>
                      <MenuItem value="APPROVED">Approved by Host</MenuItem>
                      <MenuItem value="CHECKED_IN">Checked In (On-Premise)</MenuItem>
                      <MenuItem value="CHECKED_OUT">Checked Out</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{xs: 12, md: 3}} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <Typography variant="body2" color="text.secondary">
                    Showing <strong>{filteredVisitors.length}</strong> visitors
                  </Typography>
                </Grid>
              </Grid>

              {/* Table */}
              {visitorsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <Table>
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Visitor</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Host & Location</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Badge #</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Check-In Time</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredVisitors.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                            <Typography variant="body1" color="text.secondary">
                              No visitors found matching your criteria.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredVisitors.map((visitor: any) => (
                          <TableRow key={visitor.id} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.contrastText', width: 36, height: 36, fontWeight: 700 }}>
                                  {visitor.name ? visitor.name.charAt(0).toUpperCase() : 'V'}
                                </Avatar>
                                <Box>
                                  <Typography variant="subtitle2" sx={{fontWeight: 700}}>
                                    {visitor.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {visitor.email} {visitor.company ? `• ${visitor.company}` : ''}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                Host: <strong>{visitor.host_name || (typeof visitor.host === 'object' ? visitor.host?.name : `Host #${visitor.host}`)}</strong>
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {visitor.location_name || (typeof visitor.location === 'object' ? visitor.location?.name : 'Main Office')}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{fontWeight: 600, fontFamily: 'monospace'}}>
                                {visitor.badge_number || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell>{getStatusChip(visitor.status)}</TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {visitor.check_in_time
                                  ? new Date(visitor.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                  : 'Not yet'}
                              </Typography>
                              {visitor.check_out_time && (
                                <Typography variant="caption" color="text.secondary" component="div">
                                  Out: {new Date(visitor.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                {visitor.status === 'PENDING' && (
                                  <Tooltip title="Host approval is pending">
                                    <Chip label="Awaiting Host" size="small" variant="outlined" color="warning" />
                                  </Tooltip>
                                )}
                                {(visitor.status === 'APPROVED' || visitor.status === 'PENDING') && (
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="success"
                                    startIcon={<CheckInIcon />}
                                    onClick={() => checkInMutation.mutate(visitor.id)}
                                  >
                                    Check In
                                  </Button>
                                )}
                                {visitor.status === 'CHECKED_IN' && (
                                  <>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="primary"
                                      startIcon={<PrintIcon />}
                                      onClick={() => setBadgeVisitor(visitor)}
                                    >
                                      Badge
                                    </Button>
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="error"
                                      startIcon={<CheckOutIcon />}
                                      onClick={() => checkOutMutation.mutate(visitor.id)}
                                    >
                                      Check Out
                                    </Button>
                                  </>
                                )}
                                {visitor.status === 'CHECKED_OUT' && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<PrintIcon />}
                                    onClick={() => setBadgeVisitor(visitor)}
                                  >
                                    Pass
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
        )}

        {/* Tab 1: Invite & QR Fast Lookup */}
        {activeTab === 1 && (
          <Grid container spacing={3}>
            <Grid size={{xs: 12, md: 6}}>
              <Card sx={{ borderRadius: 3, p: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{fontWeight: 700}}>
                    Fast Pre-Registration Check-In
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Enter an invitation access code, email, or scan the guest&apos;s digital invite QR code to immediately verify and issue badge access.
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                    <TextField
                      fullWidth
                      placeholder="Access Code (e.g. INV-9042) or Visitor Email"
                      value={inviteCodeSearch}
                      onChange={(e) => setInviteCodeSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleFastInviteSearch()}
                    />
                    <Button
                      variant="contained"
                      sx={{ px: 4 }}
                      onClick={handleFastInviteSearch}
                    >
                      Lookup
                    </Button>
                  </Box>

                  {inviteError && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                      {inviteError}
                    </Alert>
                  )}

                  {inviteLookupResult && (
                    <Paper sx={{ p: 3, border: '1px solid', borderColor: 'primary.light', bgcolor: 'primary.50', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="subtitle1" color="primary.main" sx={{fontWeight: 700}}>
                          Valid Invite Found
                        </Typography>
                        <Chip label={inviteLookupResult.status} color="success" size="small" />
                      </Box>
                      <Typography variant="h6" sx={{fontWeight: 800}}>
                        {inviteLookupResult.visitor_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {inviteLookupResult.visitor_email} • {inviteLookupResult.visitor_phone || 'No phone'}
                      </Typography>

                      <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="body2">
                          <strong>Host:</strong> {inviteLookupResult.host_name || 'Designated Host'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Location:</strong> {inviteLookupResult.location_name || 'Main Facility'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Scheduled Arrival:</strong> {new Date(inviteLookupResult.expected_arrival || Date.now()).toLocaleString()}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Purpose:</strong> {inviteLookupResult.purpose || 'Business Meeting'}
                        </Typography>
                      </Box>

                      <Button
                        variant="contained"
                        color="success"
                        size="large"
                        fullWidth
                        startIcon={<CheckInIcon />}
                        onClick={() => handleCheckInFromInvite(inviteLookupResult)}
                      >
                        Confirm & Check In Guest
                      </Button>
                    </Paper>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{xs: 12, md: 6}}>
              <Card sx={{ borderRadius: 3, p: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{fontWeight: 700}}>
                    Upcoming Pre-Registrations Today
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Invited guests scheduled to arrive today:
                  </Typography>

                  <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Guest</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Host</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {invitesList.filter((inv: any) => inv.status === 'SCHEDULED' || inv.status === 'PENDING').length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                              No pending pre-registered guests for today.
                            </TableCell>
                          </TableRow>
                        ) : (
                          invitesList
                            .filter((inv: any) => inv.status === 'SCHEDULED' || inv.status === 'PENDING')
                            .slice(0, 5)
                            .map((inv: any) => (
                              <TableRow key={inv.id}>
                                <TableCell>
                                  <Typography variant="body2" sx={{fontWeight: 600}}>
                                    {inv.visitor_name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {inv.visitor_email}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">{inv.host_name || 'Host'}</Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip label={inv.access_code || 'QR'} size="small" variant="outlined" />
                                </TableCell>
                                <TableCell align="right">
                                  <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() => handleCheckInFromInvite(inv)}
                                  >
                                    Check In
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Walk-in Registration Dialog */}
        <Dialog open={openWalkInModal} onClose={() => setOpenWalkInModal(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Walk-In Guest Registration</DialogTitle>
          <form onSubmit={handleWalkInSubmit}>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid size={{xs: 12, sm: 6}}>
                  <TextField
                    required
                    fullWidth
                    label="Visitor Full Name"
                    value={walkInData.name}
                    onChange={(e) => setWalkInData({ ...walkInData, name: e.target.value })}
                  />
                </Grid>
                <Grid size={{xs: 12, sm: 6}}>
                  <TextField
                    required
                    fullWidth
                    type="email"
                    label="Email Address"
                    value={walkInData.email}
                    onChange={(e) => setWalkInData({ ...walkInData, email: e.target.value })}
                  />
                </Grid>
                <Grid size={{xs: 12, sm: 6}}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    value={walkInData.phone}
                    onChange={(e) => setWalkInData({ ...walkInData, phone: e.target.value })}
                  />
                </Grid>
                <Grid size={{xs: 12, sm: 6}}>
                  <TextField
                    fullWidth
                    label="Company / Organization"
                    value={walkInData.company}
                    onChange={(e) => setWalkInData({ ...walkInData, company: e.target.value })}
                  />
                </Grid>
                <Grid size={{xs: 12, sm: 6}}>
                  <FormControl fullWidth required>
                    <InputLabel>Host</InputLabel>
                    <Select
                      value={walkInData.host_id}
                      label="Host"
                      onChange={(e) => setWalkInData({ ...walkInData, host_id: e.target.value })}
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
                      value={walkInData.location_id}
                      label="Location"
                      onChange={(e) => setWalkInData({ ...walkInData, location_id: e.target.value })}
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
                    type="number"
                    label="Expected Duration (min)"
                    value={walkInData.expected_duration}
                    onChange={(e) => setWalkInData({ ...walkInData, expected_duration: e.target.value })}
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Purpose of Visit"
                    placeholder="e.g. Sales presentation, client meeting, interview..."
                    value={walkInData.purpose}
                    onChange={(e) => setWalkInData({ ...walkInData, purpose: e.target.value })}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
              <Button onClick={() => setOpenWalkInModal(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={createVisitorMutation.isPending}>
                {createVisitorMutation.isPending ? 'Registering...' : 'Register Visitor'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Badge Preview Dialog */}
        <Dialog open={!!badgeVisitor} onClose={() => setBadgeVisitor(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ textAlign: 'center', fontWeight: 800 }}>Visitor Pass Badge</DialogTitle>
          <DialogContent>
            {badgeVisitor && (
              <Box
                sx={{
                  border: '2px solid #000',
                  borderRadius: 3,
                  p: 3,
                  textAlign: 'center',
                  bgcolor: '#ffffff',
                  color: '#000000',
                  boxShadow: 2,
                }}
              >
                <Typography variant="overline" color="primary.main" sx={{fontWeight: 800, letterSpacing: 2}}>
                  VISITOR PASS
                </Typography>
                <Avatar
                  sx={{
                    width: 72,
                    height: 72,
                    mx: 'auto',
                    my: 1.5,
                    bgcolor: 'primary.main',
                    fontSize: 32,
                    fontWeight: 800,
                  }}
                >
                  {badgeVisitor.name?.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="h5" sx={{fontWeight: 800}}>
                  {badgeVisitor.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {badgeVisitor.company || 'Visiting Guest'}
                </Typography>

                <Box sx={{ borderTop: '1px dashed #ccc', borderBottom: '1px dashed #ccc', py: 1.5, my: 1.5, textAlign: 'left' }}>
                  <Typography variant="caption" component="div">
                    <strong>Badge #:</strong> {badgeVisitor.badge_number || 'TEMP-PASS'}
                  </Typography>
                  <Typography variant="caption" component="div">
                    <strong>Host:</strong> {badgeVisitor.host_name || 'Designated Host'}
                  </Typography>
                  <Typography variant="caption" component="div">
                    <strong>Location:</strong> {badgeVisitor.location_name || 'HQ Building'}
                  </Typography>
                  <Typography variant="caption" component="div">
                    <strong>Issued:</strong> {new Date(badgeVisitor.check_in_time || Date.now()).toLocaleTimeString()}
                  </Typography>
                </Box>

                <Box sx={{ my: 2 }}>
                  <QrCodeIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
                  <Typography variant="caption" component="div" color="text.secondary">
                    Scan for security clearance
                  </Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
            <Button variant="outlined" onClick={() => setBadgeVisitor(null)}>
              Close
            </Button>
            <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()}>
              Print Badge
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}

export default function ReceptionistPage() {
  return (
    <ReceptionistPageWrapper>
      <ReceptionistPageContent />
    </ReceptionistPageWrapper>
  );
}
