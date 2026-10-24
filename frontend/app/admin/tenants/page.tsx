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
  CircularProgress,
  Avatar,
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Business as BusinessIcon,
  Palette as PaletteIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  CheckCircle as ActiveIcon,
  Language as LanguageIcon,
} from '@mui/icons-material';
import {
  useTenants,
  useCreateTenant,
  useUpdateTenant,
} from '@/hooks/useData';

function TenantsPageContent() {
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [newTenantForm, setNewTenantForm] = useState({
    name: '',
    slug: '',
    billing_email: '',
    tier: 'ENTERPRISE',
    primary_color: '#4f46e5',
  });

  const [openBrandingModal, setOpenBrandingModal] = useState(false);
  const [brandingTenant, setBrandingTenant] = useState<any | null>(null);
  const [brandingForm, setBrandingForm] = useState({
    name: '',
    logo_url: '',
    primary_color: '#4f46e5',
  });

  // Queries & Mutations
  const { data: tenantsData = [], isLoading, refetch } = useTenants();
  const createMutation = useCreateTenant();
  const updateMutation = useUpdateTenant();

  const tenantsList = Array.isArray(tenantsData) ? tenantsData : (tenantsData as any)?.results || [];

  const filteredTenants = tenantsList.filter((t: any) =>
    (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.slug || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantForm.name || !newTenantForm.slug) {
      alert('Tenant name and slug are required.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        ...newTenantForm,
        is_active: true,
      });
      setOpenCreateModal(false);
      setNewTenantForm({
        name: '',
        slug: '',
        billing_email: '',
        tier: 'ENTERPRISE',
        primary_color: '#4f46e5',
      });
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create organization tenant.');
    }
  };

  const handleOpenBranding = (tenant: any) => {
    setBrandingTenant(tenant);
    setBrandingForm({
      name: tenant.name || '',
      logo_url: tenant.logo_url || '',
      primary_color: tenant.primary_color || '#4f46e5',
    });
    setOpenBrandingModal(true);
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandingTenant) return;

    try {
      await updateMutation.mutateAsync({
        id: brandingTenant.id,
        data: brandingForm,
      });
      setOpenBrandingModal(false);
      refetch();
    } catch (err: any) {
      alert('Failed to update branding settings.');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', py: 4, bgcolor: 'background.default' }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
          <Box>
            <Typography variant="h4" color="text.primary" sx={{fontWeight: 800}}>
              Tenants & White-Labeling
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Multi-tenant organization management, custom branding, domain portals, and logos
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()}>
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenCreateModal(true)}
            >
              Add Organization
            </Button>
          </Box>
        </Box>

        {/* Content Card */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <CardContent sx={{ p: 3 }}>
            {/* Search */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <TextField
                size="small"
                sx={{ width: { xs: '100%', md: 400 } }}
                placeholder="Search organizations..."
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
                Total Organizations: <strong>{filteredTenants.length}</strong>
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
                      <TableCell sx={{ fontWeight: 700 }}>Organization</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Portal Subdomain</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Branding Theme</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Subscription Tier</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTenants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                          No organizations found. Click &quot;Add Organization&quot; to set up your first tenant.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTenants.map((t: any) => (
                        <TableRow key={t.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar
                                sx={{
                                  bgcolor: t.primary_color || 'primary.main',
                                  width: 36,
                                  height: 36,
                                  fontWeight: 700,
                                }}
                              >
                                {t.name ? t.name.charAt(0).toUpperCase() : 'O'}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2" sx={{fontWeight: 700}}>
                                  {t.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {t.billing_email || `ID: ${t.slug}`}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{fontFamily: 'monospace'}}>
                              {t.slug}.visitormanagement.app
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box
                                sx={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: '50%',
                                  bgcolor: t.primary_color || '#4f46e5',
                                  border: '1px solid #ccc',
                                }}
                              />
                              <Typography variant="body2" sx={{fontFamily: 'monospace'}}>
                                {t.primary_color || '#4f46e5'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip label={t.tier || 'ENTERPRISE'} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={t.is_active ? 'Active' : 'Suspended'}
                              color={t.is_active ? 'success' : 'default'}
                              size="small"
                              sx={{ fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<PaletteIcon />}
                              onClick={() => handleOpenBranding(t)}
                            >
                              White-Labeling
                            </Button>
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

        {/* Create Tenant Dialog */}
        <Dialog open={openCreateModal} onClose={() => setOpenCreateModal(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Create New Organization</DialogTitle>
          <form onSubmit={handleCreateSubmit}>
            <DialogContent dividers>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  required
                  fullWidth
                  label="Organization Name"
                  placeholder="e.g. Acme Corporation"
                  value={newTenantForm.name}
                  onChange={(e) => setNewTenantForm({ ...newTenantForm, name: e.target.value })}
                />
                <TextField
                  required
                  fullWidth
                  label="URL Identifier (Slug)"
                  placeholder="acme"
                  value={newTenantForm.slug}
                  onChange={(e) => setNewTenantForm({ ...newTenantForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                />
                <TextField
                  fullWidth
                  type="email"
                  label="Billing / Admin Email"
                  placeholder="admin@acme.com"
                  value={newTenantForm.billing_email}
                  onChange={(e) => setNewTenantForm({ ...newTenantForm, billing_email: e.target.value })}
                />
                <FormControl fullWidth>
                  <InputLabel>Subscription Tier</InputLabel>
                  <Select
                    value={newTenantForm.tier}
                    label="Subscription Tier"
                    onChange={(e) => setNewTenantForm({ ...newTenantForm, tier: e.target.value })}
                  >
                    <MenuItem value="STARTER">Starter</MenuItem>
                    <MenuItem value="PROFESSIONAL">Professional</MenuItem>
                    <MenuItem value="ENTERPRISE">Enterprise</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
              <Button onClick={() => setOpenCreateModal(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={createMutation.isPending}>
                Create Organization
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* White-Labeling & Branding Dialog */}
        <Dialog open={openBrandingModal} onClose={() => setOpenBrandingModal(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>White-Labeling & Custom Branding</DialogTitle>
          <form onSubmit={handleSaveBranding}>
            <DialogContent dividers>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Customize the appearance of guest kiosks, pre-registration emails, and visitor badges for this organization.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Brand Name"
                  value={brandingForm.name}
                  onChange={(e) => setBrandingForm({ ...brandingForm, name: e.target.value })}
                />
                <TextField
                  fullWidth
                  label="Brand Logo URL"
                  placeholder="https://acme.com/logo.png"
                  value={brandingForm.logo_url}
                  onChange={(e) => setBrandingForm({ ...brandingForm, logo_url: e.target.value })}
                />
                <TextField
                  fullWidth
                  label="Primary Accent Color (Hex)"
                  placeholder="#4f46e5"
                  value={brandingForm.primary_color}
                  onChange={(e) => setBrandingForm({ ...brandingForm, primary_color: e.target.value })}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <Box
                            sx={{
                              width: 24,
                              height: 24,
                              borderRadius: '4px',
                              bgcolor: brandingForm.primary_color || '#4f46e5',
                              border: '1px solid #ccc',
                            }}
                          />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
              <Button onClick={() => setOpenBrandingModal(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={updateMutation.isPending}>
                Save Branding
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Container>
    </Box>
  );
}

export default function TenantsPage() {
  return (
    <AdminPage>
      <TenantsPageContent />
    </AdminPage>
  );
}
