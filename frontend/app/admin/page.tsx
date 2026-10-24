'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getVisitors,
  getDashboardStats,
  getLocations,
  Visitor,
  Location,
  approveVisitor,
  rejectVisitor,
} from '@/lib/api';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Stack,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  LocationOn as LocationIcon,
  Search as SearchIcon,
  Warning as WarningIcon,
  QrCode as QrCodeIcon,
  Security as SecurityIcon,
  BarChart as BarChartIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { AdminPage } from '@/components/ProtectedPage';

export default function AdminPortal() {
  return (
    <AdminPage>
      <AdminContent />
    </AdminPage>
  );
}

function AdminContent() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedLocation, setSelectedLocation] = useState<number | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Fetch Dashboard Stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboardStats', selectedLocation],
    queryFn: () => getDashboardStats(selectedLocation).then((res) => res.data),
    enabled: !!user,
  });

  // Fetch Visitors
  const { data: visitors = [], isLoading: visitorsLoading, refetch } = useQuery({
    queryKey: ['visitors', selectedLocation],
    queryFn: () =>
      getVisitors({ location: selectedLocation }).then((res) =>
        Array.isArray(res.data) ? res.data : res.data.results || []
      ),
    enabled: !!user,
  });

  // Fetch Locations
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () =>
      getLocations().then((res) =>
        Array.isArray(res.data) ? res.data : res.data.results || []
      ),
    enabled: !!user,
  });

  // Approve visitor mutation
  const approveMutation = useMutation({
    mutationFn: (id: number) => approveVisitor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });

  // Reject visitor mutation
  const rejectMutation = useMutation({
    mutationFn: (id: number) => rejectVisitor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });

  if (loading || !user) {
    return (
      <Box sx={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  // Filter visitors
  const filteredVisitors = visitors.filter((v: Visitor) => {
    const matchesSearch =
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.company && v.company.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'CHECKED_IN':
        return <Chip label="Checked In" size="small" color="success" />;
      case 'CHECKED_OUT':
        return <Chip label="Checked Out" size="small" variant="outlined" />;
      case 'PENDING':
        return <Chip label="Pending Approval" size="small" color="warning" />;
      case 'REJECTED':
        return <Chip label="Rejected" size="small" color="error" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header Bar */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{fontWeight: 900, letterSpacing: "-0.02em"}}>
            Visitor Management Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
            <Typography variant="body2" color="text.secondary" sx={{fontWeight: 500}}>
              Real-Time Security & Access Monitoring Active
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="location-select-label">Location Branch</InputLabel>
            <Select
              labelId="location-select-label"
              value={selectedLocation !== undefined ? String(selectedLocation) : ''}
              label="Location Branch"
              onChange={(e) => setSelectedLocation(e.target.value ? Number(e.target.value) : undefined)}
              startAdornment={<LocationIcon color="primary" sx={{ mr: 1, fontSize: 20 }} />}
            >
              <MenuItem value="">
                <em>All Locations (Global)</em>
              </MenuItem>
              {locations.map((loc: Location) => (
                <MenuItem key={loc.id} value={String(loc.id)}>
                  {loc.name} {loc.floor ? `(${loc.floor})` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Tooltip title="Refresh Data">
            <IconButton onClick={() => refetch()} color="primary" sx={{ bgcolor: 'action.hover' }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Metrics Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{fontWeight: 700, textTransform: 'uppercase'}}>
                  Active Visitors
                </Typography>
                <Typography variant="h3" color="success.main" sx={{my: 0.5, fontWeight: 800}}>
                  {statsLoading ? <CircularProgress size={28} /> : stats?.active_visitors ?? 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Currently on premises
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'success.light', color: 'success.dark' }}>
                <PeopleIcon sx={{ fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{fontWeight: 700, textTransform: 'uppercase'}}>
                  Pending Approvals
                </Typography>
                <Typography variant="h3" color="warning.main" sx={{my: 0.5, fontWeight: 800}}>
                  {statsLoading ? <CircularProgress size={28} /> : stats?.pending_approvals ?? 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Awaiting host decision
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'warning.light', color: 'warning.dark' }}>
                <ScheduleIcon sx={{ fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{fontWeight: 700, textTransform: 'uppercase'}}>
                  Overstay Alerts
                </Typography>
                <Typography variant="h3" color="error.main" sx={{my: 0.5, fontWeight: 800}}>
                  {statsLoading ? <CircularProgress size={28} /> : stats?.overstay_visitors ?? 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Exceeded expected duration
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'error.light', color: 'error.dark' }}>
                <WarningIcon sx={{ fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{fontWeight: 700, textTransform: 'uppercase'}}>
                  Total Visits Today
                </Typography>
                <Typography variant="h3" color="primary.main" sx={{my: 0.5, fontWeight: 800}}>
                  {statsLoading ? <CircularProgress size={28} /> : stats?.total_today ?? 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Checked in today
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'primary.light', color: 'primary.dark' }}>
                <CheckCircleIcon sx={{ fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Navigation Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Button
            component={Link}
            href="/admin/invites"
            variant="outlined"
            fullWidth
            startIcon={<QrCodeIcon />}
            sx={{ py: 1.5, borderRadius: 2 }}
          >
            Digital Invites
          </Button>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Button
            component={Link}
            href="/admin/watchlist"
            variant="outlined"
            color="error"
            fullWidth
            startIcon={<SecurityIcon />}
            sx={{ py: 1.5, borderRadius: 2 }}
          >
            Watchlist
          </Button>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Button
            component={Link}
            href="/admin/locations"
            variant="outlined"
            fullWidth
            startIcon={<LocationIcon />}
            sx={{ py: 1.5, borderRadius: 2 }}
          >
            Locations
          </Button>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Button
            component={Link}
            href="/admin/analytics"
            variant="outlined"
            fullWidth
            startIcon={<BarChartIcon />}
            sx={{ py: 1.5, borderRadius: 2 }}
          >
            Analytics
          </Button>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Button
            component={Link}
            href="/receptionist"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ py: 1.5, borderRadius: 2 }}
          >
            Front Desk Log
          </Button>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Button
            component={Link}
            href="/host"
            variant="contained"
            color="secondary"
            fullWidth
            sx={{ py: 1.5, borderRadius: 2 }}
          >
            Host Portal
          </Button>
        </Grid>
      </Grid>

      {/* Real-time Visitor Log Section */}
      <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box>
            <Typography variant="h6" sx={{fontWeight: 700}}>
              Live Visitor Movement Log
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Search and manage real-time entries, checkouts, and approval requests
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <TextField
              size="small"
              placeholder="Search visitor by name, email, company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1, fontSize: 20 }} />,
                },
              }}
              sx={{ minWidth: 280 }}
            />

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="status-filter-label">Filter Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={statusFilter}
                label="Filter Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="CHECKED_IN">Checked In</MenuItem>
                <MenuItem value="PENDING">Pending Approval</MenuItem>
                <MenuItem value="CHECKED_OUT">Checked Out</MenuItem>
                <MenuItem value="REJECTED">Rejected</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Box>

        {visitorsLoading ? (
          <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : filteredVisitors.length === 0 ? (
          <Alert severity="info" sx={{ my: 2 }}>
            No visitors found matching current search or filters.
          </Alert>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 700 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Visitor</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Host</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Check-In Time</TableCell>
                  <TableCell>NDA</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredVisitors.map((visitor: Visitor) => (
                  <TableRow key={visitor.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{fontWeight: 700}}>
                        {visitor.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {visitor.email} • {visitor.phone}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{visitor.company || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{fontWeight: 500}}>
                        {visitor.host_name || (typeof visitor.host === 'object' ? (visitor.host as any)?.name : `Host #${visitor.host}`)}
                      </Typography>
                    </TableCell>
                    <TableCell>{getStatusChip(visitor.status)}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {visitor.checkin_time ? new Date(visitor.checkin_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {visitor.checkin_time ? new Date(visitor.checkin_time).toLocaleDateString() : ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {visitor.nda_accepted ? (
                        <Chip label="Signed" size="small" color="success" variant="outlined" />
                      ) : (
                        <Chip label="Not Signed" size="small" color="default" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {visitor.status === 'PENDING' ? (
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => approveMutation.mutate(visitor.id)}
                            disabled={approveMutation.isPending}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => rejectMutation.mutate(visitor.id)}
                            disabled={rejectMutation.isPending}
                          >
                            Reject
                          </Button>
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          {visitor.badge_number ? `Badge: ${visitor.badge_number}` : 'Logged'}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
}
