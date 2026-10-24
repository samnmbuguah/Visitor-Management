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
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Search as SearchIcon,
  Security as SecurityIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Block as BlockIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  useWatchlist,
  useCreateWatchlistEntry,
  useDeleteWatchlistEntry,
} from '@/hooks/useData';

function WatchlistPageContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openAddModal, setOpenAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    reason: '',
    match_type: 'CONTAINS',
  });

  const { data: watchlistData = [], isLoading, refetch } = useWatchlist();
  const createMutation = useCreateWatchlistEntry();
  const deleteMutation = useDeleteWatchlistEntry();

  const entriesList = Array.isArray(watchlistData) ? watchlistData : (watchlistData as any)?.results || [];

  const filteredEntries = entriesList.filter((entry: any) => {
    const q = searchQuery.toLowerCase();
    return (
      (entry.name || '').toLowerCase().includes(q) ||
      (entry.email || '').toLowerCase().includes(q) ||
      (entry.phone || '').toLowerCase().includes(q) ||
      (entry.company || '').toLowerCase().includes(q) ||
      (entry.reason || '').toLowerCase().includes(q)
    );
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name && !formData.email && !formData.phone) {
      alert('Please provide at least a name, email, or phone number to match against.');
      return;
    }
    if (!formData.reason) {
      alert('Please provide a reason for adding this entity to the watchlist.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        reason: formData.reason,
        match_type: formData.match_type,
        is_active: true,
      });
      setOpenAddModal(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        reason: '',
        match_type: 'CONTAINS',
      });
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add entry to watchlist.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this record from the security watchlist?')) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(id);
      refetch();
    } catch (err: any) {
      alert('Failed to remove record.');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', py: 4, bgcolor: 'background.default' }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <SecurityIcon sx={{ fontSize: 36, color: 'error.main' }} />
              <Typography variant="h4" color="text.primary" sx={{fontWeight: 800}}>
                Security Watchlist & Blocklist
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
              Automatically flag, deny, or alert security teams when restricted individuals attempt entry
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()}>
              Refresh
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<AddIcon />}
              onClick={() => setOpenAddModal(true)}
            >
              Add Restriction
            </Button>
          </Box>
        </Box>

        {/* Content Card */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <CardContent sx={{ p: 3 }}>
            {/* Search Bar */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <TextField
                size="small"
                sx={{ width: { xs: '100%', md: 450 } }}
                placeholder="Search watchlist by name, email, phone, or reason..."
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
              <Typography variant="body2" color="text.secondary">
                Restricted Entries: <strong>{filteredEntries.length}</strong>
              </Typography>
            </Box>

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
                      <TableCell sx={{ fontWeight: 700 }}>Restricted Identifier</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Contact Info</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Match Rule</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Reason / Security Notes</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                          <SecurityIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                          No restricted entries found on the watchlist.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEntries.map((entry: any) => (
                        <TableRow key={entry.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <BlockIcon color="error" fontSize="small" />
                              <Typography variant="subtitle2" sx={{fontWeight: 700}}>
                                {entry.name || 'Universal Identifier'}
                              </Typography>
                            </Box>
                            {entry.company && (
                              <Typography variant="caption" color="text.secondary" component="div">
                                Org: {entry.company}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{entry.email || '—'}</Typography>
                            {entry.phone && (
                              <Typography variant="caption" color="text.secondary" component="div">
                                Tel: {entry.phone}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={entry.match_type || 'CONTAINS'}
                              size="small"
                              variant="outlined"
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ maxWidth: 300, color: 'error.dark', fontWeight: 500 }}>
                              {entry.reason}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={entry.is_active ? 'Active Enforced' : 'Inactive'}
                              color={entry.is_active ? 'error' : 'default'}
                              size="small"
                              sx={{ fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Remove restriction">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDelete(entry.id)}
                              >
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

        {/* Add Restriction Dialog */}
        <Dialog open={openAddModal} onClose={() => setOpenAddModal(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800, color: 'error.main' }}>
            Add Entry to Security Watchlist
          </DialogTitle>
          <form onSubmit={handleAddSubmit}>
            <DialogContent dividers>
              <Alert severity="warning" sx={{ mb: 3 }}>
                Any visitor matching these details will be immediately flagged and blocked from unescorted check-in.
              </Alert>

              <Grid container spacing={2}>
                <Grid size={{xs: 12, sm: 6}}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    placeholder="e.g. John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </Grid>
                <Grid size={{xs: 12, sm: 6}}>
                  <TextField
                    fullWidth
                    type="email"
                    label="Email Address"
                    placeholder="flagged@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </Grid>
                <Grid size={{xs: 12, sm: 6}}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </Grid>
                <Grid size={{xs: 12, sm: 6}}>
                  <TextField
                    fullWidth
                    label="Company / Affiliation"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </Grid>
                <Grid size={12}>
                  <FormControl fullWidth>
                    <InputLabel>Matching Algorithm</InputLabel>
                    <Select
                      value={formData.match_type}
                      label="Matching Algorithm"
                      onChange={(e) => setFormData({ ...formData, match_type: e.target.value })}
                    >
                      <MenuItem value="CONTAINS">CONTAINS (Partial substring match)</MenuItem>
                      <MenuItem value="EXACT">EXACT (Exact full match)</MenuItem>
                      <MenuItem value="FUZZY">FUZZY (Levenshtein similarity)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={12}>
                  <TextField
                    required
                    fullWidth
                    multiline
                    rows={3}
                    label="Reason / Security Notice"
                    placeholder="Explain why this individual is restricted (e.g. revoked facility access, legal restraining order, terminated contractor)..."
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
              <Button onClick={() => setOpenAddModal(false)}>Cancel</Button>
              <Button type="submit" variant="contained" color="error" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Enforcing...' : 'Enforce Restriction'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Container>
    </Box>
  );
}

export default function WatchlistPage() {
  return (
    <AdminPage>
      <WatchlistPageContent />
    </AdminPage>
  );
}
