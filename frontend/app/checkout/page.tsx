'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  Avatar,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Logout as LogoutIcon,
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { getVisitors, checkoutVisitor } from '@/lib/api';

export default function CheckOutPage() {
  const router = useRouter();
  const [visitors, setVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOutId, setCheckingOutId] = useState<number | null>(null);
  const [success, setSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadVisitors();
  }, []);

  const loadVisitors = async () => {
    try {
      const response = await getVisitors();
      const data = Array.isArray(response.data) ? response.data : response.data?.results || [];
      const activeVisitors = data.filter((v: any) => v.status === 'CHECKED_IN');
      setVisitors(activeVisitors);
    } catch (err) {
      console.error('Failed to load visitors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (id: number) => {
    setCheckingOutId(id);
    try {
      await checkoutVisitor(id);
      setSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (err) {
      console.error('Failed to checkout:', err);
      setCheckingOutId(null);
    }
  };

  const filteredVisitors = visitors.filter(
    (v) =>
      (v.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.badge_number || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (success) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: 3,
        }}
      >
        <Card sx={{ maxWidth: 480, width: '100%', p: 4, textAlign: 'center', borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
          <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom sx={{fontWeight: 800}}>
            Checked Out!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Thank you for visiting. Your badge has been deactivated.
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Redirecting to home screen...
          </Typography>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', py: 6, bgcolor: 'background.default' }}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Link href="/" passHref style={{ textDecoration: 'none' }}>
              <Button variant="outlined" startIcon={<ArrowBackIcon />}>
                Back
              </Button>
            </Link>
            <Box>
              <Typography variant="h4" color="text.primary" sx={{fontWeight: 800}}>
                Visitor Check-Out
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Locate your name or badge number to quickly check out of the building
              </Typography>
            </Box>
          </Box>
        </Box>

        <Card sx={{ borderRadius: 3, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <CardContent>
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                placeholder="Search active visitors by name, email, or badge number..."
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
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : filteredVisitors.length === 0 ? (
              <Paper sx={{ p: 6, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="h6" color="text.secondary">
                  {visitors.length === 0
                    ? 'No visitors currently checked in.'
                    : 'No visitors found matching your search.'}
                </Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Table>
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Visitor</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Host</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Badge #</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Checked In At</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredVisitors.map((visitor) => (
                      <TableRow key={visitor.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ bgcolor: 'primary.light', width: 36, height: 36 }}>
                              {visitor.name ? visitor.name.charAt(0).toUpperCase() : 'V'}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" sx={{fontWeight: 700}}>
                                {visitor.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {visitor.company || visitor.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{visitor.host_name || 'Designated Host'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{fontWeight: 600, fontFamily: 'monospace'}}>
                            {visitor.badge_number || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {visitor.check_in_time
                              ? new Date(visitor.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : 'Earlier today'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            variant="contained"
                            color="error"
                            size="small"
                            startIcon={<LogoutIcon />}
                            disabled={checkingOutId === visitor.id}
                            onClick={() => handleCheckout(visitor.id)}
                          >
                            {checkingOutId === visitor.id ? 'Checking out...' : 'Check Out'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
