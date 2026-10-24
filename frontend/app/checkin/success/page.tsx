'use client';

import React from 'react';
import Link from 'next/link';
import {
  Box,
  Container,
  Card,
  Typography,
  Button,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Home as HomeIcon,
} from '@mui/icons-material';

export default function SuccessPage() {
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
      <Card sx={{ maxWidth: 480, width: '100%', p: 5, textAlign: 'center', borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
        <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
        <Typography variant="h3" gutterBottom sx={{fontWeight: 800}}>
          Welcome!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, fontSize: 18 }}>
          You have successfully checked in. Your host has been notified and will receive you shortly.
        </Typography>

        <Link href="/" passHref style={{ textDecoration: 'none' }}>
          <Button variant="contained" size="large" startIcon={<HomeIcon />} sx={{ px: 4, py: 1.5, fontWeight: 700 }}>
            Back to Home
          </Button>
        </Link>
      </Card>
    </Box>
  );
}
