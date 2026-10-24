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
  SmartToy as AiIcon,
  DocumentScanner as ScanCardIcon,
  Send as SendIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  Face as FaceIcon,
} from '@mui/icons-material';
import {
  createVisitor,
  getHosts,
  getLocations,
  scanPreRegistration,
  searchVisitor,
  aiChatKiosk,
  aiScanCard,
  aiFaceVerify,
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

  // AI Concierge State (LangGraph Agent)
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiSessionId] = useState(() => 'kiosk_' + Math.random().toString(36).substring(2, 9));
  const [aiMessages, setAiMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string }>>([
    {
      sender: 'ai',
      text: 'Hello! I am your AI Kiosk Concierge powered by LangGraph. You can speak or type to check in, look up an invite, or ask about guest Wi-Fi and amenities. How may I assist you today?',
    },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const recognitionRef = useRef<any>(null);

  // AI Facial Verification State
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [faceLoading, setFaceLoading] = useState(false);
  const [faceMatchMsg, setFaceMatchMsg] = useState('');
  const faceCamRef = useRef<Webcam>(null);

  // AI ID/Business Card Scanner State (Multimodal Vision)
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanSuccessMsg, setScanSuccessMsg] = useState('');
  const cardCamRef = useRef<Webcam>(null);

  const speakText = (text: string) => {
    if (!speechEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Audio not permitted without user interaction
    }
  };

  const toggleSpeechRecognition = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setAiInput(transcript);
          handleSendAiMessage(transcript);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition error:', err);
      setIsListening(false);
    }
  };

  const handleSendAiMessage = async (textToSend?: string) => {
    const msg = textToSend || aiInput;
    if (!msg.trim() || aiLoading) return;

    const userText = msg.trim();
    setAiInput('');
    setAiMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setAiLoading(true);

    try {
      const res = await aiChatKiosk(userText, aiSessionId);
      if (res.data?.reply) {
        setAiMessages((prev) => [...prev, { sender: 'ai', text: res.data.reply }]);
        speakText(res.data.reply);
      }
    } catch {
      setAiMessages((prev) => [
        ...prev,
        { sender: 'ai', text: 'I encountered an error connecting to the concierge agent. Please speak with reception.' },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCaptureFaceVerification = async () => {
    const imageSrc = faceCamRef.current?.getScreenshot();
    if (!imageSrc) return;

    setFaceLoading(true);
    setFaceMatchMsg('');
    try {
      const res = await aiFaceVerify(imageSrc);
      if (res.data?.matched && res.data?.visitor) {
        const v = res.data.visitor;
        setFormData((prev) => ({
          ...prev,
          name: v.name || prev.name,
          email: v.email || prev.email,
          phone: v.phone || prev.phone,
          company: v.company || prev.company,
          host: v.host_id || prev.host,
          location: v.location_id || prev.location,
        }));
        setFaceMatchMsg(`Verified: Welcome back, ${v.name}! Match confidence: ${(res.data.confidence * 100).toFixed(0)}%.`);
        setTimeout(() => {
          setFaceModalOpen(false);
          setFaceMatchMsg('');
        }, 1500);
      } else {
        alert(res.data?.message || 'No facial match found. Please proceed with standard check-in.');
      }
    } catch {
      alert('Facial verification service temporarily unavailable.');
    } finally {
      setFaceLoading(false);
    }
  };

  const handleCaptureCardScan = async () => {
    const imageSrc = cardCamRef.current?.getScreenshot();
    if (!imageSrc) return;

    setScanLoading(true);
    setScanSuccessMsg('');
    try {
      const res = await aiScanCard(imageSrc);
      const data = res.data?.data;
      if (data) {
        setFormData((prev) => ({
          ...prev,
          name: data.name || prev.name,
          email: data.email || prev.email,
          phone: data.phone || prev.phone,
          company: data.company || prev.company,
        }));
        setScanSuccessMsg(`Extracted details for ${data.name || 'visitor'}! Form has been auto-filled.`);
        setTimeout(() => {
          setScanModalOpen(false);
          setScanSuccessMsg('');
        }, 1800);
      }
    } catch {
      alert('Could not extract details from this image. Please try again or type manually.');
    } finally {
      setScanLoading(false);
    }
  };

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
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<QrCodeIcon />}
              onClick={() => setInviteModalOpen(true)}
              sx={{ py: 1.6, borderRadius: 3, fontWeight: 700 }}
            >
              QR Pass / Invite
            </Button>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<SearchIcon />}
              onClick={() => setReturningModalOpen(true)}
              sx={{ py: 1.6, borderRadius: 3, fontWeight: 700 }}
            >
              Returning Lookup
            </Button>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<FaceIcon />}
              onClick={() => setFaceModalOpen(true)}
              sx={{
                py: 1.6,
                borderRadius: 3,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
              }}
            >
              Face Check-In
            </Button>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<AiIcon />}
              onClick={() => setAiModalOpen(true)}
              sx={{
                py: 1.6,
                borderRadius: 3,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
              }}
            >
              AI Concierge (Voice)
            </Button>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              color="secondary"
              startIcon={<ScanCardIcon />}
              onClick={() => setScanModalOpen(true)}
              sx={{ py: 1.6, borderRadius: 3, fontWeight: 700 }}
            >
              Scan ID / Card
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

        {/* AI Kiosk Concierge Dialog (LangGraph Agent) */}
        <Dialog
          open={aiModalOpen}
          onClose={() => setAiModalOpen(false)}
          maxWidth="sm"
          fullWidth
          slotProps={{ paper: { sx: { borderRadius: 4, height: 600, display: 'flex', flexDirection: 'column' } } }}
        >
          <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 38, height: 38 }}>
                <AiIcon />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                  AI Voice & Chat Concierge
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  LangGraph Agent with Voice Recognition
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <IconButton
                onClick={() => setSpeechEnabled(!speechEnabled)}
                size="small"
                title={speechEnabled ? "Mute Voice Responses" : "Enable Voice Responses"}
              >
                {speechEnabled ? <VolumeUpIcon fontSize="small" color="primary" /> : <VolumeOffIcon fontSize="small" color="action" />}
              </IconButton>
              <IconButton onClick={() => setAiModalOpen(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers sx={{ flex: 1, p: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {aiMessages.map((msg, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <Paper
                  sx={{
                    p: 1.8,
                    borderRadius: 3,
                    maxWidth: '82%',
                    bgcolor: msg.sender === 'user' ? 'primary.main' : 'action.hover',
                    color: msg.sender === 'user' ? 'primary.contrastText' : 'text.primary',
                    borderBottomRightRadius: msg.sender === 'user' ? 2 : 12,
                    borderBottomLeftRadius: msg.sender === 'ai' ? 2 : 12,
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {msg.text}
                  </Typography>
                </Paper>
              </Box>
            ))}
            {aiLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', p: 1 }}>
                <CircularProgress size={18} />
                <Typography variant="caption">AI Concierge is thinking and checking tools...</Typography>
              </Box>
            )}
          </DialogContent>

          {/* Quick Prompts */}
          <Box sx={{ px: 2, pt: 1, display: 'flex', gap: 0.8, overflowX: 'auto', flexShrink: 0 }}>
            {[
              "What's the guest Wi-Fi password?",
              "Where are the restrooms?",
              "I have a meeting with an employee",
            ].map((promptText, i) => (
              <Chip
                key={i}
                label={promptText}
                size="small"
                onClick={() => handleSendAiMessage(promptText)}
                sx={{ cursor: 'pointer', fontSize: '0.75rem' }}
              />
            ))}
          </Box>

          <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Box
              component="form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendAiMessage();
              }}
              sx={{ width: '100%', display: 'flex', gap: 1 }}
            >
              <TextField
                fullWidth
                size="small"
                placeholder={isListening ? "Listening... Speak now..." : "Ask Wi-Fi, directions, or state who you are visiting..."}
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                disabled={aiLoading}
              />
              <IconButton
                onClick={toggleSpeechRecognition}
                color={isListening ? "error" : "primary"}
                sx={{
                  bgcolor: isListening ? 'error.light' : 'action.hover',
                  animation: isListening ? 'pulse 1.5s infinite' : 'none',
                }}
                title={isListening ? "Stop Listening" : "Speak to Concierge"}
              >
                {isListening ? <MicOffIcon /> : <MicIcon />}
              </IconButton>
              <Button
                variant="contained"
                type="submit"
                disabled={!aiInput.trim() || aiLoading}
                startIcon={<SendIcon />}
                sx={{ px: 2.5 }}
              >
                Send
              </Button>
            </Box>
          </DialogActions>
        </Dialog>

        {/* AI ID / Business Card Scanner Modal (Multimodal Vision) */}
        <Dialog open={scanModalOpen} onClose={() => setScanModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Scan ID or Business Card (AI Vision)</DialogTitle>
          <DialogContent dividers sx={{ textAlign: 'center' }}>
            {scanSuccessMsg ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                {scanSuccessMsg}
              </Alert>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Hold your driver's license, government ID, or business card up to the camera. Our vision AI will extract your details and autofill the form.
              </Typography>
            )}

            <Box sx={{ borderRadius: 2, overflow: 'hidden', bgcolor: '#000', mb: 2 }}>
              <Webcam
                audio={false}
                ref={cardCamRef}
                screenshotFormat="image/jpeg"
                style={{ width: '100%', maxHeight: 300, objectFit: 'cover' }}
                videoConstraints={{ facingMode: 'user' }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
            <Button onClick={() => setScanModalOpen(false)} disabled={scanLoading}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={scanLoading ? <CircularProgress size={18} color="inherit" /> : <ScanCardIcon />}
              onClick={handleCaptureCardScan}
              disabled={scanLoading}
            >
              {scanLoading ? 'Parsing with AI Vision...' : 'Extract & Auto-Fill'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Biometric Face Verification Check-In Modal */}
        <Dialog open={faceModalOpen} onClose={() => setFaceModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>1-Second Biometric Face Check-In</DialogTitle>
          <DialogContent dividers sx={{ textAlign: 'center' }}>
            {faceMatchMsg ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                {faceMatchMsg}
              </Alert>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Look directly into the camera. Our biometric engine will recognize your face and instantly load your visitor profile.
              </Typography>
            )}

            <Box sx={{ borderRadius: 2, overflow: 'hidden', bgcolor: '#000', mb: 2 }}>
              <Webcam
                audio={false}
                ref={faceCamRef}
                screenshotFormat="image/jpeg"
                style={{ width: '100%', maxHeight: 300, objectFit: 'cover' }}
                videoConstraints={{ facingMode: 'user' }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
            <Button onClick={() => setFaceModalOpen(false)} disabled={faceLoading}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={faceLoading ? <CircularProgress size={18} color="inherit" /> : <FaceIcon />}
              onClick={handleCaptureFaceVerification}
              disabled={faceLoading}
            >
              {faceLoading ? 'Verifying Biometrics...' : 'Verify & Fast Check-In'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
