'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Chip,
  Button,
} from '@mui/material';
import {
  HourglassEmpty as HourglassIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import api from '@/lib/api';

function WaitingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const visitorId = searchParams.get('id');
  const [status, setStatus] = useState('PENDING');

  useEffect(() => {
    if (!visitorId) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/visitors/${visitorId}/`);
        const visitor = res.data;
        setStatus(visitor.status);

        if (visitor.status === 'CHECKED_IN' || visitor.status === 'APPROVED') {
          router.push('/checkin/success');
        } else if (visitor.status === 'REJECTED') {
          alert('Your visit request was declined by the host.');
          router.push('/');
        }
      } catch (err) {
        console.error(err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [visitorId, router]);

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
        <Box sx={{ position: 'relative', display: 'inline-block', mb: 3 }}>
          <CircularProgress size={72} thickness={4} />
          <HourglassIcon
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'primary.main',
              fontSize: 32,
            }}
          />
        </Box>

        <Typography variant="h4" gutterBottom sx={{fontWeight: 800}}>
          Waiting for Host Approval
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Your host has been notified of your arrival. Please take a seat in the reception lobby while they review your visit.
        </Typography>

        <Chip
          label={`STATUS: ${status}`}
          color="warning"
          sx={{ fontWeight: 800, letterSpacing: 1, py: 2, px: 1, mb: 3 }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button variant="outlined" color="inherit" onClick={() => router.push('/')}>
            Cancel and Return Home
          </Button>
        </Box>
      </Card>
    </Box>
  );
}

export default function WaitingPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      }
    >
      <WaitingPageContent />
    </Suspense>
  );
}
