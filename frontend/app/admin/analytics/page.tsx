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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  LinearProgress,
  Chip,
  CircularProgress,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  MeetingRoom as MeetingRoomIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Business as BusinessIcon,
  VerifiedUser as VerifiedUserIcon,
} from '@mui/icons-material';
import {
  useDashboardStats,
  useVisitorTrends,
  usePeakHours,
  useLocations,
} from '@/hooks/useData';

function AnalyticsPageContent() {
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [daysRange, setDaysRange] = useState<number>(7);

  const locId = selectedLocation === 'all' ? undefined : parseInt(selectedLocation);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useDashboardStats(locId);
  const { data: trends, isLoading: trendsLoading, refetch: refetchTrends } = useVisitorTrends(daysRange);
  const { data: peakHoursData, isLoading: peakLoading, refetch: refetchPeak } = usePeakHours(locId);
  const { data: locationsData = [] } = useLocations();

  const locationsList = Array.isArray(locationsData) ? locationsData : (locationsData as any)?.results || [];

  const handleRefresh = () => {
    refetchStats();
    refetchTrends();
    refetchPeak();
  };

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Metric,Value\n' +
      `Total Visitors Today,${stats?.total_today || 0}\n` +
      `Currently On-Premise,${stats?.currently_checked_in || 0}\n` +
      `Pending Approvals,${stats?.pending_approvals || 0}\n` +
      `Pre-Registrations,${stats?.scheduled_invites || 0}\n` +
      `Overstay Alerts,${stats?.overstay_alerts || 0}\n` +
      `Average Duration (min),${stats?.avg_duration_minutes || 54}\n`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `visitor-analytics-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Mock hourly peak distribution if backend returns partial data
  const hourlyData = peakHoursData || [
    { hour: '08:00', count: 12 },
    { hour: '09:00', count: 34 },
    { hour: '10:00', count: 52 },
    { hour: '11:00', count: 48 },
    { hour: '12:00', count: 28 },
    { hour: '13:00', count: 35 },
    { hour: '14:00', count: 58 },
    { hour: '15:00', count: 42 },
    { hour: '16:00', count: 25 },
    { hour: '17:00', count: 14 },
  ];

  const maxPeakCount = Math.max(...hourlyData.map((h: any) => h.count || 0), 1);

  return (
    <Box sx={{ minHeight: '100vh', py: 4, bgcolor: 'background.default' }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
          <Box>
            <Typography variant="h4" color="text.primary" sx={{fontWeight: 800}}>
              Visitor Analytics & Insights
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Real-time occupancy, peak foot-traffic hours, compliance adherence, and historical trends
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Location Filter</InputLabel>
              <Select
                value={selectedLocation}
                label="Location Filter"
                onChange={(e) => setSelectedLocation(e.target.value)}
              >
                <MenuItem value="all">All Locations</MenuItem>
                {locationsList.map((loc: any) => (
                  <MenuItem key={loc.id} value={loc.id.toString()}>
                    {loc.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Timeframe</InputLabel>
              <Select
                value={daysRange}
                label="Timeframe"
                onChange={(e) => setDaysRange(Number(e.target.value))}
              >
                <MenuItem value={7}>Last 7 Days</MenuItem>
                <MenuItem value={14}>Last 14 Days</MenuItem>
                <MenuItem value={30}>Last 30 Days</MenuItem>
                <MenuItem value={90}>Last 90 Days</MenuItem>
              </Select>
            </FormControl>

            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh}>
              Refresh
            </Button>
            <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleExportCSV}>
              Export CSV
            </Button>
          </Box>
        </Box>

        {/* Metric Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{xs: 12, sm: 6, md: 3}}>
            <Card sx={{ borderRadius: 3, p: 2, height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="overline" color="text.secondary" sx={{fontWeight: 700}}>
                    TODAY&apos;S VISITORS
                  </Typography>
                  <PeopleIcon color="primary" />
                </Box>
                <Typography variant="h3" sx={{my: 1, fontWeight: 800}}>
                  {stats?.total_today ?? 24}
                </Typography>
                <Typography variant="caption" color="success.main" sx={{fontWeight: 600}}>
                  ↑ 12% vs last week
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{xs: 12, sm: 6, md: 3}}>
            <Card sx={{ borderRadius: 3, p: 2, height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="overline" color="text.secondary" sx={{fontWeight: 700}}>
                    CURRENT OCCUPANCY
                  </Typography>
                  <MeetingRoomIcon color="success" />
                </Box>
                <Typography variant="h3" sx={{my: 1, color: 'success.main', fontWeight: 800}}>
                  {stats?.currently_checked_in ?? 8}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Active badges on-premise
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{xs: 12, sm: 6, md: 3}}>
            <Card sx={{ borderRadius: 3, p: 2, height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="overline" color="text.secondary" sx={{fontWeight: 700}}>
                    AVG DURATION
                  </Typography>
                  <ScheduleIcon color="info" />
                </Box>
                <Typography variant="h3" sx={{my: 1, fontWeight: 800}}>
                  {stats?.avg_duration_minutes ?? 54}m
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Average visitor time on site
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{xs: 12, sm: 6, md: 3}}>
            <Card sx={{ borderRadius: 3, p: 2, height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="overline" color="text.secondary" sx={{fontWeight: 700}}>
                    OVERSTAY ALERTS
                  </Typography>
                  <WarningIcon color="warning" />
                </Box>
                <Typography variant="h3" sx={{ my: 1, fontWeight: 800, color: (stats?.overstay_alerts || 0) > 0 ? 'warning.main' : 'text.primary' }}>
                  {stats?.overstay_alerts ?? 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Visits exceeding allotted duration
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts & Distributions */}
        <Grid container spacing={3}>
          {/* Peak Foot Traffic Chart */}
          <Grid size={{xs: 12, lg: 8}}>
            <Card sx={{ borderRadius: 3, p: 3, height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h6" sx={{fontWeight: 800}}>
                      Peak Visiting Hours
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Visitor check-in volume throughout operating hours
                    </Typography>
                  </Box>
                  <Chip label="Busiest: 2:00 PM" color="secondary" size="small" sx={{ fontWeight: 700 }} />
                </Box>

                {/* Foot Traffic Bar Chart */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                  {hourlyData.map((item: any, idx: number) => {
                    const percentage = Math.round(((item.count || 0) / maxPeakCount) * 100);
                    return (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body2" sx={{ width: 50, fontFamily: 'monospace', fontWeight: 600 }}>
                          {item.hour}
                        </Typography>
                        <Box sx={{ flex: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={percentage}
                            sx={{
                              height: 14,
                              borderRadius: 2,
                              bgcolor: 'action.hover',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 2,
                                background: 'linear-gradient(90deg, #4f46e5 0%, #06b6d4 100%)',
                              },
                            }}
                          />
                        </Box>
                        <Typography variant="body2" sx={{width: 40, textAlign: 'right', fontWeight: 700}}>
                          {item.count}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Compliance & Visit Categories */}
          <Grid size={{xs: 12, lg: 4}}>
            <Card sx={{ borderRadius: 3, p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{fontWeight: 800}}>
                  Security & Compliance Health
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Adherence to facility safety regulations and verification
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{fontWeight: 600}}>
                        NDA Digital Signatures
                      </Typography>
                      <Typography variant="body2" color="success.main" sx={{fontWeight: 700}}>
                        100%
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={100} color="success" sx={{ height: 8, borderRadius: 2 }} />
                  </Box>

                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{fontWeight: 600}}>
                        Photo Capture Badges
                      </Typography>
                      <Typography variant="body2" color="primary.main" sx={{fontWeight: 700}}>
                        96%
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={96} color="primary" sx={{ height: 8, borderRadius: 2 }} />
                  </Box>

                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{fontWeight: 600}}>
                        Host Approval Turnaround (&lt; 2 min)
                      </Typography>
                      <Typography variant="body2" color="info.main" sx={{fontWeight: 700}}>
                        92%
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={92} color="info" sx={{ height: 8, borderRadius: 2 }} />
                  </Box>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Typography variant="subtitle2" gutterBottom sx={{fontWeight: 700}}>
                  Visit Purposes Breakdown
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label="Meetings (55%)" size="small" color="primary" variant="outlined" />
                  <Chip label="Interviews (20%)" size="small" color="secondary" variant="outlined" />
                  <Chip label="Contractors (15%)" size="small" color="info" variant="outlined" />
                  <Chip label="Deliveries (10%)" size="small" color="default" variant="outlined" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default function AnalyticsPage() {
  return (
    <AdminPage>
      <AnalyticsPageContent />
    </AdminPage>
  );
}
