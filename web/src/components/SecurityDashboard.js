import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Chip,
  LinearProgress,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Alert,
  Snackbar,
  Fab,
  Badge,
} from '@mui/material';
import {
  Security,
  DoorSliding,
  Warning,
  Notifications,
  CameraAlt,
  Shield,
  OpenInNew,
  Refresh,
  NotificationsActive,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import axios from 'axios';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

const ThreatLevelChip = styled(Chip)(({ level }) => ({
  fontWeight: 'bold',
  ...(level === 'LOW' && {
    backgroundColor: '#4caf50',
    color: 'white',
  }),
  ...(level === 'MEDIUM' && {
    backgroundColor: '#ff9800',
    color: 'white',
  }),
  ...(level === 'HIGH' && {
    backgroundColor: '#f44336',
    color: 'white',
  }),
  ...(level === 'CRITICAL' && {
    backgroundColor: '#9c27b0',
    color: 'white',
  }),
}));

const SecurityDashboard = ({ token, tenantId }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [threatLevel, setThreatLevel] = useState('LOW');

  useEffect(() => {
    fetchDashboardData();
    fetchNotifications();
    
    // Set up periodic refresh
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchNotifications();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [token, tenantId]);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(
        'http://localhost:8001/api/security/dashboard/?time_range=24h',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      setDashboardData(response.data);
      setThreatLevel(response.data.threat_indicators.overall_threat_level);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to fetch security data');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(
        'http://localhost:8001/api/notifications/history/?page=1&page_size=10',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      setNotifications(response.data.notifications);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([
      fetchDashboardData(),
      fetchNotifications(),
    ]);
    setLoading(false);
  };

  const handleOpenGate = async () => {
    try {
      const response = await axios.post(
        'http://localhost:8001/api/security/gate/',
        {
          action: 'open',
          reason: 'Manual open from web dashboard',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (response.data.success) {
        setSuccessMessage('Gate opened successfully');
        setShowSuccess(true);
      }
    } catch (err) {
      console.error('Error opening gate:', err);
      setError('Failed to open gate');
    }
  };

  const getThreatColor = (level) => {
    switch (level) {
      case 'LOW': return '#4caf50';
      case 'MEDIUM': return '#ff9800';
      case 'HIGH': return '#f44336';
      case 'CRITICAL': return '#9c27b0';
      default: return '#757575';
    }
  };

  const getThreatIcon = (level) => {
    switch (level) {
      case 'LOW': return <Shield />;
      case 'MEDIUM': return <Warning />;
      case 'HIGH': return <Security />;
      case 'CRITICAL': return <Security />;
      default: return <Shield />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'LOW': return 'success';
      case 'MEDIUM': return 'warning';
      case 'HIGH': return 'error';
      case 'CRITICAL': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <Typography>Loading security dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Snackbar
        open={showSuccess}
        autoHideDuration={6000}
        onClose={() => setShowSuccess(false)}
      >
        <Alert onClose={() => setShowSuccess(false)} severity="success">
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Security Dashboard
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Threat Level Card */}
      <StyledCard sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Box sx={{ mr: 2, color: getThreatColor(threatLevel) }}>
              {getThreatIcon(threatLevel)}
            </Box>
            <Box flexGrow={1}>
              <Typography variant="h6" gutterBottom>
                Current Threat Level
              </Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <ThreatLevelChip
                  label={threatLevel}
                  level={threatLevel}
                />
                <Typography variant="body2" color="text.secondary">
                  Score: {dashboardData?.threat_indicators?.threat_score || 0}/100
                </Typography>
              </Box>
            </Box>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(dashboardData?.threat_indicators?.threat_score || 0)}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                backgroundColor: getThreatColor(threatLevel),
              },
            }}
          />
        </CardContent>
      </StyledCard>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StyledCard>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <DoorSliding color="primary" sx={{ mr: 2 }} />
                <Typography variant="h6">
                  {dashboardData?.summary?.total_access_attempts || 0}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Access Attempts
              </Typography>
              <Typography variant="caption" color="success.main">
                {dashboardData?.summary?.access_granted_rate || 0}% granted
              </Typography>
            </CardContent>
          </StyledCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StyledCard>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Warning color="warning" sx={{ mr: 2 }} />
                <Typography variant="h6">
                  {dashboardData?.incidents?.open_count || 0}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Open Incidents
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total: {dashboardData?.incidents?.total || 0}
              </Typography>
            </CardContent>
          </StyledCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StyledCard>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Notifications color="error" sx={{ mr: 2 }} />
                <Typography variant="h6">
                  {dashboardData?.alerts?.active || 0}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Active Alerts
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total: {dashboardData?.alerts?.total || 0}
              </Typography>
            </CardContent>
          </StyledCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StyledCard>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <CameraAlt color="success" sx={{ mr: 2 }} />
                <Typography variant="h6">
                  {dashboardData?.cameras?.online || 0}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Online Cameras
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total: {dashboardData?.cameras?.total || 0}
              </Typography>
            </CardContent>
          </StyledCard>
        </Grid>
      </Grid>

      {/* Control Panel */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <StyledCard>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Gate Control
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<DoorSliding />}
                onClick={handleOpenGate}
                fullWidth
                sx={{ py: 2 }}
              >
                Open Gate
              </Button>
            </CardContent>
          </StyledCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <StyledCard>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Camera Monitoring
              </Typography>
              <Button
                variant="outlined"
                startIcon={<CameraAlt />}
                onClick={() => window.open('/camera-view', '_blank')}
                fullWidth
                sx={{ py: 2 }}
              >
                View Live Cameras
              </Button>
            </CardContent>
          </StyledCard>
        </Grid>
      </Grid>

      {/* Recent Notifications */}
      <StyledCard>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Recent Security Alerts
            </Typography>
            <Badge badgeContent={notifications.length} color="error">
              <NotificationsActive />
            </Badge>
          </Box>
          
          <List>
            {notifications.map((notification, index) => (
              <ListItem
                key={index}
                divider
                secondaryAction={
                  <IconButton edge="end">
                    <OpenInNew />
                  </IconButton>
                }
              >
                <ListItemIcon>
                  <Notifications color={getSeverityColor(notification.severity)} />
                </ListItemIcon>
                <ListItemText
                  primary={notification.title}
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary">
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(notification.created_at).toLocaleString()}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
            {notifications.length === 0 && (
              <ListItem>
                <ListItemText
                  primary="No recent notifications"
                  secondary="Security alerts will appear here"
                />
              </ListItem>
            )}
          </List>
        </CardContent>
      </StyledCard>
    </Box>
  );
};

export default SecurityDashboard;
