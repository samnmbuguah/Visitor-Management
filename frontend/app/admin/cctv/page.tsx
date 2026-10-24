'use client';

import React, { useState, useEffect } from 'react';
import { AdminPage } from '@/components/ProtectedPage';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Paper,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Videocam as VideocamIcon,
  Refresh as RefreshIcon,
  FiberManualRecord as LiveIcon,
  Security as SecurityIcon,
  LocationOn as LocationIcon,
  Fullscreen as FullscreenIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { getCameras, getLiveCamera, Camera } from '@/lib/api';

function CCTVPageContent() {
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [liveFrame, setLiveFrame] = useState<string | null>(null);

  const { data: cameras = [], isLoading, refetch } = useQuery({
    queryKey: ['cameras'],
    queryFn: () => getCameras().then((res) => res.data.results || res.data || []),
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchFrame = async () => {
      const activeId = selectedCamera || (cameras.length > 0 ? cameras[0]?.id : null);
      if (activeId) {
        try {
          const res = await getLiveCamera(activeId);
          if (res.data?.frame) {
            setLiveFrame(res.data.frame);
          }
        } catch {
          // Fallback or retry silently
        }
      }
    };

    if (cameras.length > 0) {
      fetchFrame();
      interval = setInterval(fetchFrame, 2000);
    }

    return () => clearInterval(interval);
  }, [selectedCamera, cameras]);

  const activeCam = cameras.find((c: any) => c.id === selectedCamera) || (cameras.length > 0 ? cameras[0] : null);

  return (
    <Box sx={{ minHeight: '100vh', py: 4, bgcolor: 'background.default' }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <VideocamIcon sx={{ fontSize: 36, color: 'primary.main' }} />
              <Typography variant="h4" color="text.primary" sx={{fontWeight: 800}}>
                Security Video & Gate Surveillance
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
              Live CCTV gate access monitoring, entrance validation, and visitor perimeter logs
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()}>
              Refresh Feeds
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Main Live Feed Player */}
          <Grid size={{xs: 12, lg: 8}}>
            <Card sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
              <Box sx={{ position: 'relative', bgcolor: '#090d16', minHeight: 460, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {liveFrame ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:image/jpeg;base64,${liveFrame}`}
                    alt="Surveillance Feed"
                    style={{ width: '100%', height: 'auto', maxHeight: 520, objectFit: 'contain' }}
                  />
                ) : (
                  <Box sx={{ textAlign: 'center', color: '#94a3b8', p: 4 }}>
                    <VideocamIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6">
                      {isLoading ? 'Connecting to CCTV stream...' : 'Live Stream Active (Perimeter View)'}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.7 }}>
                      {activeCam ? activeCam.name : 'Front Entrance Camera 01'}
                    </Typography>
                  </Box>
                )}

                {/* Live Badge overlay */}
                <Box sx={{ position: 'absolute', top: 16, left: 16, display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(0,0,0,0.6)', px: 1.5, py: 0.5, borderRadius: 2 }}>
                  <LiveIcon sx={{ fontSize: 12, color: '#ef4444' }} />
                  <Typography variant="caption" sx={{ color: '#ffffff', fontWeight: 800 }}>
                    LIVE GATE FEED
                  </Typography>
                </Box>
              </Box>

              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6" sx={{fontWeight: 800}}>
                      {activeCam?.name || 'Main Entrance Turnstile'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Location: {activeCam?.location_name || 'Ground Floor Lobby'} • IP: {activeCam?.ip_address || '192.168.1.101'}
                    </Typography>
                  </Box>
                  <Chip label="SURVEILLANCE ONLINE" color="success" size="small" sx={{ fontWeight: 700 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Camera Feeds List */}
          <Grid size={{xs: 12, lg: 4}}>
            <Card sx={{ borderRadius: 3, p: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{fontWeight: 800}}>
                  Registered Security Feeds
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Select a camera feed to switch active view:
                </Typography>

                {isLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={32} />
                  </Box>
                ) : cameras.length === 0 ? (
                  <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'action.hover' }}>
                    <Typography variant="body2" color="text.secondary">
                      No cameras currently connected. Use the Cameras Setup menu to link IP streams.
                    </Typography>
                  </Paper>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {cameras.map((cam: any) => {
                      const isSelected = selectedCamera === cam.id || (!selectedCamera && cam.id === cameras[0]?.id);
                      return (
                        <Paper
                          key={cam.id}
                          onClick={() => setSelectedCamera(cam.id)}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            cursor: 'pointer',
                            border: '2px solid',
                            borderColor: isSelected ? 'primary.main' : 'divider',
                            bgcolor: isSelected ? 'action.selected' : 'background.paper',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              borderColor: 'primary.light',
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <VideocamIcon color={isSelected ? 'primary' : 'action'} />
                              <Box>
                                <Typography variant="subtitle2" sx={{fontWeight: 700}}>
                                  {cam.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {cam.location_name || 'Entrance Gate'}
                                </Typography>
                              </Box>
                            </Box>
                            <Chip
                              label={cam.status || 'ONLINE'}
                              color={cam.status === 'OFFLINE' ? 'default' : 'success'}
                              size="small"
                              sx={{ fontWeight: 700 }}
                            />
                          </Box>
                        </Paper>
                      );
                    })}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default function CCTVPage() {
  return (
    <AdminPage>
      <CCTVPageContent />
    </AdminPage>
  );
}
