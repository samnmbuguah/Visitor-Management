'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Button,
  Chip,
  Stack,
  useTheme,
  Paper,
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  MeetingRoom as MeetingRoomIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  VerifiedUser as VerifiedUserIcon,
  Login as LoginIcon,
  Dashboard as DashboardIcon,
  Badge as BadgeIcon,
} from '@mui/icons-material';

export default function Home() {
  const { user } = useAuth();
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: theme.palette.mode === 'dark'
          ? 'radial-gradient(circle at 50% 10%, #1e1b4b 0%, #0b0f19 80%)'
          : 'radial-gradient(circle at 50% 10%, #e0e7ff 0%, #f8fafc 80%)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        py: 6,
      }}
    >
      {/* Top Header Bar */}
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 8 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 3,
                background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 900,
                fontSize: '1.25rem',
                boxShadow: '0 8px 16px rgba(79, 70, 229, 0.3)',
              }}
            >
              V
            </Box>
            <Box>
              <Typography variant="h6" color="text.primary" sx={{fontWeight: 800}}>
                Vizmo
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{fontWeight: 600}}>
                Visitor Management
              </Typography>
            </Box>
          </Box>

          <Box>
            {!user ? (
              <Button
                component={Link}
                href="/login"
                variant="outlined"
                startIcon={<LoginIcon />}
                sx={{ borderRadius: 3, fontWeight: 700 }}
              >
                Staff Login
              </Button>
            ) : (
              <Button
                component={Link}
                href="/admin"
                variant="contained"
                startIcon={<DashboardIcon />}
                sx={{ borderRadius: 3, fontWeight: 700 }}
              >
                Go to Dashboard
              </Button>
            )}
          </Box>
        </Box>

        {/* Hero Section */}
        <Box sx={{ textAlign: 'center', mb: 8, maxWidth: 800, mx: 'auto' }}>
          <Chip
            icon={<VerifiedUserIcon color="primary" fontSize="small" />}
            label="Smart & Touchless Visitor Management"
            color="primary"
            variant="outlined"
            sx={{ mb: 3, fontWeight: 700, borderRadius: 3, px: 1, py: 2.2 }}
          />
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 900,
              fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.25rem' },
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              mb: 2,
            }}
          >
            Welcome to{' '}
            <Box
              component="span"
              sx={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Modern Workplace
            </Box>
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, maxWidth: 650, mx: 'auto' }}>
            A fast, seamless, and secure self-service visitor registration and touchless check-in experience.
          </Typography>
        </Box>

        {/* Main Action Cards */}
        <Grid container spacing={4} sx={{ mb: 10, maxWidth: 900, mx: 'auto' }}>
          {/* Check In Card */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Card
              sx={{
                height: '100%',
                borderRadius: 4,
                border: 2,
                borderColor: 'primary.light',
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': {
                  transform: 'translateY(-6px)',
                  boxShadow: '0 20px 40px rgba(79, 70, 229, 0.2)',
                },
              }}
            >
              <CardActionArea component={Link} href="/checkin" sx={{ height: '100%', p: 4 }}>
                <CardContent sx={{ textAlign: 'center', p: 0 }}>
                  <Box
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: 4,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 3,
                      boxShadow: '0 8px 24px rgba(79, 70, 229, 0.4)',
                    }}
                  >
                    <PersonAddIcon sx={{ fontSize: 38 }} />
                  </Box>
                  <Typography variant="h4" gutterBottom sx={{fontWeight: 800}}>
                    Check In
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                    Register arrival, scan QR invite, sign NDA, and notify your host immediately.
                  </Typography>
                  <Chip label="Self-Service / Touchless" size="small" color="primary" variant="filled" />
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          {/* Check Out Card */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Card
              sx={{
                height: '100%',
                borderRadius: 4,
                border: 2,
                borderColor: 'secondary.light',
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': {
                  transform: 'translateY(-6px)',
                  boxShadow: '0 20px 40px rgba(6, 182, 212, 0.2)',
                },
              }}
            >
              <CardActionArea component={Link} href="/checkout" sx={{ height: '100%', p: 4 }}>
                <CardContent sx={{ textAlign: 'center', p: 0 }}>
                  <Box
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: 4,
                      bgcolor: 'secondary.main',
                      color: 'secondary.contrastText',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 3,
                      boxShadow: '0 8px 24px rgba(6, 182, 212, 0.4)',
                    }}
                  >
                    <MeetingRoomIcon sx={{ fontSize: 38 }} />
                  </Box>
                  <Typography variant="h4" gutterBottom sx={{fontWeight: 800}}>
                    Check Out
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                    Quickly scan your badge, token, or search by phone number to complete your visit.
                  </Typography>
                  <Chip label="Quick Exit" size="small" color="secondary" variant="filled" />
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        </Grid>

        {/* Feature Highlights Grid */}
        <Grid container spacing={3} sx={{ maxWidth: 1000, mx: 'auto', mb: 6 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <QrCodeScannerIcon color="primary" sx={{ fontSize: 32 }} />
              <Box>
                <Typography variant="subtitle2" sx={{fontWeight: 700}}>
                  Touchless QR Scan
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Scan pre-registered invite code from mobile
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <SpeedIcon color="primary" sx={{ fontSize: 32 }} />
              <Box>
                <Typography variant="subtitle2" sx={{fontWeight: 700}}>
                  Instant Host Alerts
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  SMS, Email & Push notifications on arrival
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <SecurityIcon color="primary" sx={{ fontSize: 32 }} />
              <Box>
                <Typography variant="subtitle2" sx={{fontWeight: 700}}>
                  Watchlist & NDA
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Digital signoff, photo ID & security checks
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 'auto', pt: 6 }}>
          <Typography variant="caption" color="text.secondary" sx={{fontWeight: 600, letterSpacing: "0.1em", textTransform: 'uppercase'}}>
            Powered by Vizmo Visitor Management System
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
