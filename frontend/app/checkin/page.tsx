'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Webcam from 'react-webcam';
import SignatureCanvas from 'react-signature-canvas';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Paper,
  Chip,
  Avatar,
  IconButton,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  QrCode as QrCodeIcon,
  Search as SearchIcon,
  CameraAlt as CameraIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  AssignmentTurnedIn as SignIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  createVisitor,
  getHosts,
  getLocations,
  scanPreRegistration,
  searchVisitor,
  Host,
  Location,
} from '@/lib/api';

export default function CheckInPage() {
  const router = useRouter();
  const [hosts, setHosts] = useState<Host[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    host: 0,
    location: 0,
    purpose: '',
    photo: '',
    nda_accepted: false,
    signature: '',
  });

  // Returning Visitor Lookup Modal
  const [returningModalOpen, setReturningModalOpen] = useState(false);
  const [returningQuery, setReturningQuery] = useState('');
  const [searchingReturning, setSearchingReturning] = useState(false);
  const [returningError, setReturningError] = useState('');

  // QR / Access Code Lookup Modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [scanningInvite, setScanningInvite] = useState(false);

  // Camera Capture Modal
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const webcamRef = useRef<Webcam>(null);

  // NDA Modal
  const [ndaModalOpen, setNdaModalOpen] = useState(false);
  const sigPad = useRef<SignatureCanvas>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [hostsRes, locsRes] = await Promise.all([getHosts(), getLocations()]);
      const hostList = Array.isArray(hostsRes.data) ? hostsRes.data : hostsRes.data.results || [];
      const locList = Array.isArray(locsRes.data) ? locsRes.data : locsRes.data.results || [];
      setHosts(hostList);
      setLocations(locList);
      if (locList.length > 0) {
        setFormData((prev) => ({ ...prev, location: locList[0].id }));
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const handleCapturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setFormData((prev) => ({ ...prev, photo: imageSrc }));
      setCameraModalOpen(false);
    }
  }, [webcamRef]);

  const handleReturningSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchingReturning(true);
    setReturningError('');
    try {
      const res = await searchVisitor(returningQuery);
      const visitor = res.data;
      setFormData((prev) => ({
        ...prev,
        name: visitor.name || '',
        email: visitor.email || '',
        phone: visitor.phone || '',
        company: visitor.company || '',
      }));
      setReturningModalOpen(false);
    } catch {
      setReturningError('No previous record found with that email or phone.');
    } finally {
      setSearchingReturning(false);
    }
  };

  const handleInviteLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;
    setScanningInvite(true);
    try {
      const res = await scanPreRegistration(inviteCodeInput.trim());
      const invite = res.data;
      setFormData((prev) => ({
        ...prev,
        name: invite.visitor_name,
        email: invite.visitor_email,
        phone: invite.visitor_phone || '',
        company: invite.visitor_company || '',
        host: invite.host?.id || invite.host || prev.host,
        location: invite.location?.id || invite.location || prev.location,
        purpose: invite.purpose || 'Pre-registered Visit',
      }));
      setInviteModalOpen(false);
    } catch {
      alert('Invalid or expired invitation code.');
    } finally {
      setScanningInvite(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.host) {
      setError('Please fill in visitor name, email, and designated host.');
      return;
    }

    // Check if location requires NDA and visitor hasn't signed
    const selectedLoc = locations.find((l) => l.id === formData.location);
    if (selectedLoc?.require_nda && !formData.nda_accepted) {
      setNdaModalOpen(true);
      return;
    }

    setLoading(true);
    try {
      const res = await createVisitor({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        host: formData.host,
        location: formData.location || undefined,
        purpose: formData.purpose,
        photo: formData.photo || undefined,
      });

      if (res.data.status === 'PENDING') {
        router.push(`/checkin/waiting?id=${res.data.id}`);
      } else {
        router.push('/checkin/success');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to complete check-in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', py: 6, bgcolor: 'background.default' }}>
      <Container maxWidth="md">
        {/* Top Header & Actions */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Link href="/" passHref style={{ textDecoration: 'none' }}>
              <Button variant="outlined" startIcon={<ArrowBackIcon />}>
                Exit Kiosk
              </Button>
            </Link>
            <Box>
              <Typography variant="h4" color="text.primary" sx={{fontWeight: 800}}>
                Visitor Check-In Kiosk
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Self-service reception check-in and digital badge issuance
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Quick Start Buttons */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{xs: 12, sm: 6}}>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<QrCodeIcon />}
              onClick={() => setInviteModalOpen(true)}
              sx={{ py: 1.8, borderRadius: 3, fontWeight: 700 }}
            >
              Have a QR Pass / Invite Code?
            </Button>
          </Grid>
          <Grid size={{xs: 12, sm: 6}}>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<SearchIcon />}
              onClick={() => setReturningModalOpen(true)}
              sx={{ py: 1.8, borderRadius: 3, fontWeight: 700 }}
            >
              Returning Visitor Lookup
            </Button>
          </Grid>
        </Grid>

        {/* Main Check-In Card */}
        <Card sx={{ borderRadius: 4, p: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
          <CardContent>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Grid container spacing={2.5}>
                <Grid size={{xs: 12, sm: 6}}>
                  <TextField
                    required
                    fullWidth
                    label="Visitor Full Name"
                    placeholder="Jane Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    slotProps={{ input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon color="action" />
                        </InputAdornment>
                      ),
                    } }}
                  />
                </Grid>

                <Grid size={{xs: 12, sm: 6}}>
                  <TextField
                    required
                    fullWidth
                    type="email"
                    label="Email Address"
                    placeholder="jane@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    slotProps={{ input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon color="action" />
                        </InputAdornment>
                      ),
                    } }}
                  />
                </Grid>

                <Grid size={{xs: 12, sm: 6}}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    placeholder="+1 (555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    slotProps={{ input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon color="action" />
                        </InputAdornment>
                      ),
                    } }}
                  />
                </Grid>

                <Grid size={{xs: 12, sm: 6}}>
                  <TextField
                    fullWidth
                    label="Company / Organization"
                    placeholder="Acme Global"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    slotProps={{ input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <BusinessIcon color="action" />
                        </InputAdornment>
                      ),
                    } }}
                  />
                </Grid>

                <Grid size={{xs: 12, sm: 6}}>
                  <FormControl fullWidth required>
                    <InputLabel>Visiting Whom (Host)</InputLabel>
                    <Select
                      value={formData.host || ''}
                      label="Visiting Whom (Host)"
                      onChange={(e) => setFormData({ ...formData, host: Number(e.target.value) })}
                    >
                      {hosts.map((h) => (
                        <MenuItem key={h.id} value={h.id}>
                          {h.name} {h.department ? `(${h.department})` : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{xs: 12, sm: 6}}>
                  <FormControl fullWidth>
                    <InputLabel>Facility Location</InputLabel>
                    <Select
                      value={formData.location || ''}
                      label="Facility Location"
                      onChange={(e) => setFormData({ ...formData, location: Number(e.target.value) })}
                    >
                      {locations.map((l) => (
                        <MenuItem key={l.id} value={l.id}>
                          {l.name} - {l.floor || 'Floor 1'}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="Purpose of Visit"
                    placeholder="e.g. Sales presentation, client meeting, vendor delivery..."
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  />
                </Grid>

                {/* Photo Capture Section */}
                <Grid size={12}>
                  <Paper sx={{ p: 2.5, bgcolor: 'action.hover', borderRadius: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {formData.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={formData.photo}
                            alt="Visitor Badge Photo"
                            style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover' }}
                          />
                        ) : (
                          <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.light' }}>
                            <CameraIcon sx={{ fontSize: 32 }} />
                          </Avatar>
                        )}
                        <Box>
                          <Typography variant="subtitle1" sx={{fontWeight: 700}}>
                            Badge Photo
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formData.photo ? 'Photo captured for visitor pass' : 'Optional webcam snapshot for security badge'}
                          </Typography>
                        </Box>
                      </Box>
                      <Button
                        variant="outlined"
                        startIcon={<CameraIcon />}
                        onClick={() => setCameraModalOpen(true)}
                      >
                        {formData.photo ? 'Retake Photo' : 'Capture Photo'}
                      </Button>
                    </Box>
                  </Paper>
                </Grid>

                {/* NDA Signed Status */}
                {formData.nda_accepted && (
                  <Grid size={12}>
                    <Chip
                      icon={<CheckCircleIcon />}
                      label="Health & Safety NDA Digitally Signed"
                      color="success"
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                  </Grid>
                )}

                <Grid size={12}>
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading}
                    sx={{ py: 1.8, fontSize: 18, fontWeight: 800, borderRadius: 3 }}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Complete Check-In'}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </CardContent>
        </Card>

        {/* Returning Visitor Modal */}
        <Dialog open={returningModalOpen} onClose={() => setReturningModalOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Returning Visitor Fast Lookup</DialogTitle>
          <form onSubmit={handleReturningSearch}>
            <DialogContent dividers>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Enter your email address or phone number to automatically autofill your details.
              </Typography>
              {returningError && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {returningError}
                </Alert>
              )}
              <TextField
                autoFocus
                required
                fullWidth
                label="Email or Phone Number"
                value={returningQuery}
                onChange={(e) => setReturningQuery(e.target.value)}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setReturningModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={searchingReturning}>
                {searchingReturning ? 'Searching...' : 'Find My Info'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* QR / Invite Code Modal */}
        <Dialog open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Lookup Invitation Pass</DialogTitle>
          <form onSubmit={handleInviteLookup}>
            <DialogContent dividers>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Enter the access code from your invite email or pass (e.g. INV-9021).
              </Typography>
              <TextField
                autoFocus
                required
                fullWidth
                label="Invitation Access Code"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setInviteModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={scanningInvite}>
                {scanningInvite ? 'Verifying...' : 'Load Invitation'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Camera Capture Modal */}
        <Dialog open={cameraModalOpen} onClose={() => setCameraModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Capture Badge Photo</DialogTitle>
          <DialogContent dividers sx={{ p: 0, bgcolor: '#000', display: 'flex', justifyContent: 'center' }}>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              style={{ width: '100%', maxHeight: 400, objectFit: 'cover' }}
              videoConstraints={{ facingMode: 'user' }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
            <Button onClick={() => setCameraModalOpen(false)}>Cancel</Button>
            <Button variant="contained" startIcon={<CameraIcon />} onClick={handleCapturePhoto}>
              Capture Snapshot
            </Button>
          </DialogActions>
        </Dialog>

        {/* Digital NDA Signature Modal */}
        <Dialog open={ndaModalOpen} onClose={() => setNdaModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Visitor Agreement & Safety NDA</DialogTitle>
          <DialogContent dividers>
            <Paper sx={{ p: 2, maxHeight: 180, overflowY: 'auto', bgcolor: 'action.hover', mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                By signing below, you agree to comply with all facility security rules, safety protocols, and maintain strict confidentiality regarding confidential discussions or intellectual property viewed during your visit.
              </Typography>
            </Paper>

            <Typography variant="subtitle2" sx={{mb: 1, fontWeight: 700}}>
              Draw Digital Signature:
            </Typography>
            <Box sx={{ border: '2px solid #ccc', borderRadius: 2, bgcolor: '#ffffff' }}>
              <SignatureCanvas
                penColor="black"
                canvasProps={{ className: 'sigCanvas', style: { width: '100%', height: 160 } }}
                ref={sigPad}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
            <Button onClick={() => sigPad.current?.clear()} color="inherit">
              Clear Signature
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                if (sigPad.current?.isEmpty()) {
                  alert('Please provide a signature to accept the agreement.');
                  return;
                }
                const sig = sigPad.current?.getTrimmedCanvas().toDataURL('image/png');
                setFormData((prev) => ({
                  ...prev,
                  nda_accepted: true,
                  signature: sig || '',
                }));
                setNdaModalOpen(false);
              }}
            >
              Sign & Proceed
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
