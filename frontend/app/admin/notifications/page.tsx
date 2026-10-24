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
  Tabs,
  Tab,
  CircularProgress,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Notifications as NotificationIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Send as SendIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import {
  useNotificationTemplates,
  useNotificationLogs,
  useSendTestNotification,
  useLocations,
} from '@/hooks/useData';

const TEMPLATE_TYPES = [
  { value: 'VISITOR_ARRIVAL', label: 'Visitor Arrival (Instant Alert)' },
  { value: 'VISITOR_CHECKOUT', label: 'Visitor Check-Out (Departure)' },
  { value: 'PRE_REGISTRATION', label: 'Pre-Registration Digital Invite' },
  { value: 'OVERSTAY_ALERT', label: 'Overstay Security Alert' },
  { value: 'APPROVAL_REQUIRED', label: 'Host Approval Request' },
];

function NotificationsPageContent() {
  const [activeTab, setActiveTab] = useState(0);

  // Send Test Dialog
  const [openTestModal, setOpenTestModal] = useState(false);
  const [testForm, setTestForm] = useState({
    recipient: '',
    channel: 'EMAIL',
    template_type: 'VISITOR_ARRIVAL',
  });
  const [testSuccess, setTestSuccess] = useState(false);

  // Queries
  const { data: templatesData = [], isLoading: templatesLoading, refetch: refetchTemplates } = useNotificationTemplates();
  const { data: logsData = [], isLoading: logsLoading, refetch: refetchLogs } = useNotificationLogs();
  const { data: locationsData = [] } = useLocations();

  // Mutations
  const sendTestMutation = useSendTestNotification();

  const templatesList = Array.isArray(templatesData) ? templatesData : (templatesData as any)?.results || [];
  const logsList = Array.isArray(logsData) ? logsData : (logsData as any)?.results || [];

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testForm.recipient) {
      alert('Please enter a recipient email or phone number.');
      return;
    }

    try {
      await sendTestMutation.mutateAsync(testForm);
      setTestSuccess(true);
      setTimeout(() => {
        setTestSuccess(false);
        setOpenTestModal(false);
      }, 1500);
      refetchLogs();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to send test notification.');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', py: 4, bgcolor: 'background.default' }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
          <Box>
            <Typography variant="h4" color="text.primary" sx={{fontWeight: 800}}>
              Communications & Alerts
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Instant host arrival alerts, SMS/Email delivery logs, and automated templates
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => {
                refetchTemplates();
                refetchLogs();
              }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={() => setOpenTestModal(true)}
            >
              Send Test Notification
            </Button>
          </Box>
        </Box>

        {/* Tabs */}
        <Paper sx={{ mb: 3, borderRadius: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            indicatorColor="primary"
            textColor="primary"
            sx={{ px: 2 }}
          >
            <Tab label="Notification Templates" icon={<EmailIcon />} iconPosition="start" />
            <Tab label="Delivery History Logs" icon={<NotificationIcon />} iconPosition="start" />
          </Tabs>
        </Paper>

        {/* Tab 0: Templates */}
        {activeTab === 0 && (
          <Grid container spacing={3}>
            {templatesLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : templatesList.length === 0 ? (
              <Grid size={12}>
                <Card sx={{ p: 6, textAlign: 'center' }}>
                  <Typography variant="h6" color="text.secondary">
                    Standard built-in system notification templates are currently active (Host Arrival Alert, Digital Invite Pass, Checkout Confirmation, Overstay Alert).
                  </Typography>
                </Card>
              </Grid>
            ) : (
              templatesList.map((tpl: any) => (
                <Grid size={{xs: 12, md: 6}} key={tpl.id}>
                  <Card sx={{ height: '100%', borderRadius: 3 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={{fontWeight: 800}}>
                          {tpl.name || tpl.type}
                        </Typography>
                        <Chip
                          label={tpl.type}
                          color="primary"
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                      </Box>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                        Subject: <strong>{tpl.subject || 'Automated Visitor Notification'}</strong>
                      </Typography>
                      <Paper sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap' }}>
                        {tpl.body || 'Dear {{host_name}}, your guest {{visitor_name}} from {{visitor_company}} has arrived and is waiting at the reception.'}
                      </Paper>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        )}

        {/* Tab 1: Delivery History Logs */}
        {activeTab === 1 && (
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ p: 3 }}>
              {logsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <Table>
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Recipient</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Channel</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Event / Type</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Dispatched At</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {logsList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                            No notifications dispatched yet. Check-ins and invites will automatically generate delivery logs here.
                          </TableCell>
                        </TableRow>
                      ) : (
                        logsList.map((log: any) => (
                          <TableRow key={log.id} hover>
                            <TableCell>
                              <Typography variant="subtitle2" sx={{fontWeight: 600}}>
                                {log.recipient}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {log.channel === 'SMS' ? <SmsIcon fontSize="small" /> : <EmailIcon fontSize="small" />}
                                <Typography variant="body2">{log.channel || 'EMAIL'}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip label={log.event_type || 'VISITOR_ARRIVAL'} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={log.status || 'SENT'}
                                color={log.status === 'SENT' || log.status === 'DELIVERED' ? 'success' : 'warning'}
                                size="small"
                                sx={{ fontWeight: 700 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {new Date(log.created_at || Date.now()).toLocaleString()}
                              </Typography>
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
        )}

        {/* Send Test Dialog */}
        <Dialog open={openTestModal} onClose={() => setOpenTestModal(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Dispatch Test Notification</DialogTitle>
          <form onSubmit={handleSendTest}>
            <DialogContent dividers>
              {testSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Test notification successfully sent!
                </Alert>
              )}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Channel</InputLabel>
                  <Select
                    value={testForm.channel}
                    label="Channel"
                    onChange={(e) => setTestForm({ ...testForm, channel: e.target.value })}
                  >
                    <MenuItem value="EMAIL">Email</MenuItem>
                    <MenuItem value="SMS">SMS Message</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  required
                  fullWidth
                  label={testForm.channel === 'EMAIL' ? 'Recipient Email' : 'Recipient Phone Number'}
                  placeholder={testForm.channel === 'EMAIL' ? 'host@example.com' : '+15551234567'}
                  value={testForm.recipient}
                  onChange={(e) => setTestForm({ ...testForm, recipient: e.target.value })}
                />
                <FormControl fullWidth>
                  <InputLabel>Template Type</InputLabel>
                  <Select
                    value={testForm.template_type}
                    label="Template Type"
                    onChange={(e) => setTestForm({ ...testForm, template_type: e.target.value })}
                  >
                    {TEMPLATE_TYPES.map((t) => (
                      <MenuItem key={t.value} value={t.value}>
                        {t.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
              <Button onClick={() => setOpenTestModal(false)}>Close</Button>
              <Button type="submit" variant="contained" disabled={sendTestMutation.isPending}>
                {sendTestMutation.isPending ? 'Sending...' : 'Send Test'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Container>
    </Box>
  );
}

export default function NotificationsPage() {
  return (
    <AdminPage>
      <NotificationsPageContent />
    </AdminPage>
  );
}
