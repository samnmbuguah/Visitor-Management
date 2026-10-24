'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getVisitors,
  approveVisitor,
  rejectVisitor,
  getLocations,
  getVisitorTypes,
  createInvite,
  Visitor,
  Location,
  VisitorType,
} from '@/lib/api';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Stack,
  Alert,
  Tabs,
  Tab,
  IconButton,
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Send as SendIcon,
  QrCode as QrCodeIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { HostPage as HostPageWrapper } from '@/components/ProtectedPage';

export default function HostPortal() {
  return (
    <HostPageWrapper>
      <HostPageContent />
    </HostPageWrapper>
  );
}

function HostPageContent() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);
  const [openInviteModal, setOpenInviteModal] = useState(false);

  const [inviteForm, setInviteForm] = useState({
    visitor_name: '',
    visitor_email: '',
    visitor_phone: '',
    visitor_company: '',
    visitor_type: '',
    location: '',
    expected_arrival: '',
    expected_duration: '60',
    purpose: '',
  });

  // Fetch visitors
  const { data: visitors = [], isLoading } = useQuery({
    queryKey: ['hostVisitors'],
    queryFn: () =>
      getVisitors().then((res) =>
        Array.isArray(res.data) ? res.data : res.data.results || []
      ),
    enabled: !!user,
  });

  // Fetch locations
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () =>
      getLocations().then((res) =>
        Array.isArray(res.data) ? res.data : res.data.results || []
      ),
    enabled: !!user,
  });

  // Fetch visitor types
  const { data: visitorTypes = [] } = useQuery({
    queryKey: ['visitorTypes'],
    queryFn: () =>
      getVisitorTypes().then((res) =>
        Array.isArray(res.data) ? res.data : res.data.results || []
      ),
    enabled: !!user,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (id: number) => approveVisitor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostVisitors'] });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: (id: number) => rejectVisitor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostVisitors'] });
    },
  });

  // Create invite mutation
  const createInviteMutation = useMutation({
    mutationFn: (data: any) => createInvite(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostVisitors'] });
      setOpenInviteModal(false);
      setInviteForm({
        visitor_name: '',
        visitor_email: '',
        visitor_phone: '',
        visitor_company: '',
        visitor_type: '',
        location: '',
        expected_arrival: '',
        expected_duration: '60',
        purpose: '',
      });
    },
  });

  if (loading || !user) {
    return (
      <Box sx={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const pendingApprovals = visitors.filter((v: Visitor) => v.status === 'PENDING');
  const activeVisitors = visitors.filter((v: Visitor) => v.status === 'CHECKED_IN');
  const historyVisitors = visitors.filter((v: Visitor) => v.status === 'CHECKED_OUT' || v.status === 'REJECTED');

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.visitor_name || !inviteForm.visitor_email || !inviteForm.expected_arrival) {
      return;
    }
    createInviteMutation.mutate({
      ...inviteForm,
      location: inviteForm.location ? Number(inviteForm.location) : (locations[0]?.id || 1),
      visitor_type: inviteForm.visitor_type ? Number(inviteForm.visitor_type) : undefined,
      expected_duration: Number(inviteForm.expected_duration),
    });
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Top Header */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{fontWeight: 900, letterSpacing: "-0.02em"}}>
            Host Portal
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your scheduled guests, digital invitations, and real-time visitor approvals
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          startIcon={<PersonAddIcon />}
          onClick={() => setOpenInviteModal(true)}
          sx={{ borderRadius: 2.5, px: 3, py: 1 }}
        >
          Pre-Register Guest
        </Button>
      </Box>

      {/* Metrics Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{fontWeight: 700, textTransform: 'uppercase'}}>
                  Pending Approval
                </Typography>
                <Typography variant="h3" color="warning.main" sx={{my: 0.5, fontWeight: 800}}>
                  {pendingApprovals.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Awaiting your sign-off
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'warning.light', color: 'warning.dark' }}>
                <ScheduleIcon sx={{ fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{fontWeight: 700, textTransform: 'uppercase'}}>
                  Currently Visiting
                </Typography>
                <Typography variant="h3" color="success.main" sx={{my: 0.5, fontWeight: 800}}>
                  {activeVisitors.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Checked-in on premises
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'success.light', color: 'success.dark' }}>
                <CheckCircleIcon sx={{ fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{fontWeight: 700, textTransform: 'uppercase'}}>
                  Total Visits
                </Typography>
                <Typography variant="h3" color="primary.main" sx={{my: 0.5, fontWeight: 800}}>
                  {visitors.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  All recorded visits
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'primary.light', color: 'primary.dark' }}>
                <QrCodeIcon sx={{ fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pending Approvals Urgent Alert Section */}
      {pendingApprovals.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 4,
            border: 2,
            borderColor: 'warning.main',
            borderRadius: 3,
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <ScheduleIcon color="warning" />
            <Typography variant="h6" color="warning.dark" sx={{fontWeight: 800}}>
              Action Required: Pending Visitor Approvals ({pendingApprovals.length})
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            The following guests have arrived at reception or kiosk and require your authorization to enter:
          </Typography>

          <Grid container spacing={2}>
            {pendingApprovals.map((visitor: Visitor) => (
              <Grid size={{ xs: 12, md: 6 }} key={visitor.id}>
                <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{fontWeight: 700}}>
                        {visitor.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {visitor.company || 'Individual Guest'} • {visitor.phone}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Purpose: {visitor.purpose || 'General meeting'}
                      </Typography>
                    </Box>
                    <Chip label="Awaiting Approval" color="warning" size="small" />
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="success"
                      onClick={() => approveMutation.mutate(visitor.id)}
                      disabled={approveMutation.isPending}
                    >
                      Accept / Allow Entry
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="error"
                      onClick={() => rejectMutation.mutate(visitor.id)}
                      disabled={rejectMutation.isPending}
                    >
                      Reject
                    </Button>
                  </Stack>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Tabs for Visitors Log */}
      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 3, p: 3 }}>
        <Tabs value={tabValue} onChange={(_, val) => setTabValue(val)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`Active Guests (${activeVisitors.length})`} />
          <Tab label={`All Visits History (${historyVisitors.length})`} />
        </Tabs>

        {isLoading ? (
          <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (tabValue === 0 ? activeVisitors : historyVisitors).length === 0 ? (
          <Alert severity="info" sx={{ my: 2 }}>
            No visitors found in this section.
          </Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Visitor</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Arrival Time</TableCell>
                  <TableCell>NDA</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(tabValue === 0 ? activeVisitors : historyVisitors).map((v: Visitor) => (
                  <TableRow key={v.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{fontWeight: 700}}>
                        {v.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {v.email} • {v.phone}
                      </Typography>
                    </TableCell>
                    <TableCell>{v.company || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={v.status}
                        size="small"
                        color={v.status === 'CHECKED_IN' ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {v.checkin_time ? new Date(v.checkin_time).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell>
                      {v.nda_accepted ? (
                        <Chip label="Signed" size="small" color="success" variant="outlined" />
                      ) : (
                        <Chip label="None" size="small" variant="outlined" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Pre-Register Guest Modal (Vizmo Doc Feature) */}
      <Dialog
        open={openInviteModal}
        onClose={() => setOpenInviteModal(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <form onSubmit={handleSendInvite}>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6" sx={{fontWeight: 800}}>
                Send Digital Visitor Invite
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Generates a touchless QR code invite emailed directly to the visitor
              </Typography>
            </Box>
            <IconButton onClick={() => setOpenInviteModal(false)} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ py: 3 }}>
            <Stack spacing={2.5}>
              <TextField
                label="Visitor Full Name"
                fullWidth
                required
                value={inviteForm.visitor_name}
                onChange={(e) => setInviteForm({ ...inviteForm, visitor_name: e.target.value })}
              />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Email Address"
                    type="email"
                    fullWidth
                    required
                    value={inviteForm.visitor_email}
                    onChange={(e) => setInviteForm({ ...inviteForm, visitor_email: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Phone Number"
                    fullWidth
                    value={inviteForm.visitor_phone}
                    onChange={(e) => setInviteForm({ ...inviteForm, visitor_phone: e.target.value })}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Company / Organization"
                    fullWidth
                    value={inviteForm.visitor_company}
                    onChange={(e) => setInviteForm({ ...inviteForm, visitor_company: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="visitor-type-label">Visitor Category</InputLabel>
                    <Select
                      labelId="visitor-type-label"
                      value={inviteForm.visitor_type}
                      label="Visitor Category"
                      onChange={(e) => setInviteForm({ ...inviteForm, visitor_type: e.target.value })}
                    >
                      <MenuItem value="">General Visitor</MenuItem>
                      {visitorTypes.map((t: VisitorType) => (
                        <MenuItem key={t.id} value={String(t.id)}>
                          {t.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Expected Arrival Date & Time"
                    type="datetime-local"
                    fullWidth
                    required
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={inviteForm.expected_arrival}
                    onChange={(e) => setInviteForm({ ...inviteForm, expected_arrival: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Expected Duration (Minutes)"
                    type="number"
                    fullWidth
                    value={inviteForm.expected_duration}
                    onChange={(e) => setInviteForm({ ...inviteForm, expected_duration: e.target.value })}
                  />
                </Grid>
              </Grid>

              <TextField
                label="Purpose of Visit / Instructions"
                multiline
                rows={2}
                fullWidth
                value={inviteForm.purpose}
                onChange={(e) => setInviteForm({ ...inviteForm, purpose: e.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setOpenInviteModal(false)} color="inherit">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={<SendIcon />}
              disabled={createInviteMutation.isPending}
            >
              {createInviteMutation.isPending ? 'Sending...' : 'Send QR Invite'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
}
