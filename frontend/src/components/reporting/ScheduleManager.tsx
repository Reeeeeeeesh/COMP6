import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Tooltip,
  TimePicker,
  DatePicker
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Schedule as ScheduleIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Email as EmailIcon,
  AccessTime as TimeIcon,
  CalendarToday as CalendarIcon,
  Group as GroupIcon,
  Settings as SettingsIcon,
  PlayArrow as RunIcon,
  Pause as PauseIcon,
  History as HistoryIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { reportingService, Report, ReportSchedule } from '../../services/reportingService';

interface ScheduleManagerProps {
  open: boolean;
  onClose: () => void;
  reportId?: string;
  existingSchedule?: ReportSchedule;
  onSave: (schedule: ReportSchedule) => void;
}

interface ScheduleExecution {
  id: string;
  reportId: string;
  reportName: string;
  scheduledTime: string;
  executedTime?: string;
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'skipped';
  duration?: number;
  recipients: string[];
  error?: string;
  deliveryStatus: {
    email: 'sent' | 'failed' | 'pending';
    downloadUrl?: string;
  };
}

const ScheduleManager: React.FC<ScheduleManagerProps> = ({
  open,
  onClose,
  reportId,
  existingSchedule,
  onSave
}) => {
  const [schedule, setSchedule] = useState<ReportSchedule>({
    frequency: 'monthly',
    enabled: true,
    nextRun: '',
    recipients: [],
    deliveryMethod: 'email',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    runTime: '09:00',
    weekdays: [1], // Monday
    dayOfMonth: 1
  });

  const [reports, setReports] = useState<Report[]>([]);
  const [executions, setExecutions] = useState<ScheduleExecution[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [newRecipient, setNewRecipient] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Sample execution history data
  const sampleExecutions: ScheduleExecution[] = [
    {
      id: 'exec-001',
      reportId: 'rpt-001',
      reportName: 'Monthly Compensation Report',
      scheduledTime: '2024-01-01T09:00:00Z',
      executedTime: '2024-01-01T09:02:15Z',
      status: 'completed',
      duration: 135,
      recipients: ['executives@company.com', 'hr@company.com'],
      deliveryStatus: { email: 'sent', downloadUrl: '/downloads/monthly-comp-jan.pdf' }
    },
    {
      id: 'exec-002',
      reportId: 'rpt-001',
      reportName: 'Monthly Compensation Report',
      scheduledTime: '2024-02-01T09:00:00Z',
      executedTime: '2024-02-01T09:01:30Z',
      status: 'failed',
      recipients: ['executives@company.com', 'hr@company.com'],
      error: 'Data source connection timeout',
      deliveryStatus: { email: 'failed' }
    },
    {
      id: 'exec-003',
      reportId: 'rpt-002',
      reportName: 'Weekly Performance Summary',
      scheduledTime: '2024-01-08T10:30:00Z',
      executedTime: '2024-01-08T10:31:45Z',
      status: 'completed',
      duration: 105,
      recipients: ['managers@company.com'],
      deliveryStatus: { email: 'sent' }
    }
  ];

  useEffect(() => {
    if (existingSchedule) {
      setSchedule(existingSchedule);
    }
    setExecutions(sampleExecutions);
  }, [existingSchedule]);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const reportsList = await reportingService.getReports({ type: 'scheduled' });
      setReports(reportsList);
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const validateSchedule = (): string[] => {
    const errors: string[] = [];

    if (!schedule.frequency) {
      errors.push('Frequency is required');
    }

    if (!schedule.runTime) {
      errors.push('Run time is required');
    }

    if (schedule.recipients.length === 0) {
      errors.push('At least one recipient is required');
    }

    if (schedule.frequency === 'weekly' && (!schedule.weekdays || schedule.weekdays.length === 0)) {
      errors.push('At least one weekday must be selected for weekly frequency');
    }

    if (schedule.frequency === 'monthly' && (!schedule.dayOfMonth || schedule.dayOfMonth < 1 || schedule.dayOfMonth > 31)) {
      errors.push('Day of month must be between 1 and 31');
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    schedule.recipients.forEach(email => {
      if (!emailRegex.test(email)) {
        errors.push(`Invalid email address: ${email}`);
      }
    });

    return errors;
  };

  const handleSave = () => {
    const errors = validateSchedule();
    setValidationErrors(errors);

    if (errors.length === 0) {
      // Calculate next run time
      const nextRun = calculateNextRun(schedule);
      const updatedSchedule = { ...schedule, nextRun: nextRun.toISOString() };
      
      onSave(updatedSchedule);
      onClose();
    }
  };

  const calculateNextRun = (scheduleData: ReportSchedule): Date => {
    const now = new Date();
    const [hours, minutes] = scheduleData.runTime.split(':').map(Number);
    
    let nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);

    switch (scheduleData.frequency) {
      case 'daily':
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;

      case 'weekly':
        if (scheduleData.weekdays && scheduleData.weekdays.length > 0) {
          const currentDay = nextRun.getDay();
          const nextWeekday = scheduleData.weekdays
            .map(day => day === 0 ? 7 : day) // Convert Sunday from 0 to 7
            .sort((a, b) => a - b)
            .find(day => day > currentDay) || scheduleData.weekdays[0];
          
          let daysUntilNext = (nextWeekday === scheduleData.weekdays[0] && nextWeekday <= currentDay) 
            ? 7 - currentDay + nextWeekday 
            : nextWeekday - currentDay;
          
          if (daysUntilNext <= 0) daysUntilNext += 7;
          nextRun.setDate(nextRun.getDate() + daysUntilNext);
        }
        break;

      case 'monthly':
        if (scheduleData.dayOfMonth) {
          nextRun.setDate(scheduleData.dayOfMonth);
          if (nextRun <= now) {
            nextRun.setMonth(nextRun.getMonth() + 1);
          }
        }
        break;

      case 'quarterly':
        nextRun.setMonth(Math.ceil((nextRun.getMonth() + 1) / 3) * 3);
        nextRun.setDate(1);
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 3);
        }
        break;

      case 'yearly':
        nextRun.setMonth(0, 1); // January 1st
        if (nextRun <= now) {
          nextRun.setFullYear(nextRun.getFullYear() + 1);
        }
        break;
    }

    return nextRun;
  };

  const addRecipient = () => {
    if (newRecipient.trim() && !schedule.recipients.includes(newRecipient.trim())) {
      setSchedule(prev => ({
        ...prev,
        recipients: [...prev.recipients, newRecipient.trim()]
      }));
      setNewRecipient('');
    }
  };

  const removeRecipient = (email: string) => {
    setSchedule(prev => ({
      ...prev,
      recipients: prev.recipients.filter(r => r !== email)
    }));
  };

  const handleWeekdayToggle = (day: number) => {
    const currentWeekdays = schedule.weekdays || [];
    const newWeekdays = currentWeekdays.includes(day)
      ? currentWeekdays.filter(d => d !== day)
      : [...currentWeekdays, day].sort();

    setSchedule(prev => ({ ...prev, weekdays: newWeekdays }));
  };

  const getStatusIcon = (status: ScheduleExecution['status']) => {
    switch (status) {
      case 'completed': return <SuccessIcon color="success" />;
      case 'failed': return <ErrorIcon color="error" />;
      case 'running': return <RunIcon color="info" />;
      case 'scheduled': return <TimeIcon color="action" />;
      case 'skipped': return <WarningIcon color="warning" />;
      default: return <TimeIcon />;
    }
  };

  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <ScheduleIcon />
          <Typography variant="h6">
            {existingSchedule ? 'Edit Schedule' : 'Create Schedule'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box display="flex" flexDirection="column" gap={3} paddingTop={1}>
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert severity="error">
              <Typography variant="subtitle2" gutterBottom>Please fix the following errors:</Typography>
              <List dense>
                {validationErrors.map((error, index) => (
                  <ListItem key={index} sx={{ padding: 0 }}>
                    <Typography variant="body2">• {error}</Typography>
                  </ListItem>
                ))}
              </List>
            </Alert>
          )}

          {/* Basic Settings */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Schedule Settings</Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Frequency</InputLabel>
                    <Select
                      value={schedule.frequency}
                      label="Frequency"
                      onChange={(e) => setSchedule(prev => ({ 
                        ...prev, 
                        frequency: e.target.value as ReportSchedule['frequency']
                      }))}
                    >
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                      <MenuItem value="quarterly">Quarterly</MenuItem>
                      <MenuItem value="yearly">Yearly</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Run Time"
                    type="time"
                    value={schedule.runTime}
                    onChange={(e) => setSchedule(prev => ({ ...prev, runTime: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                {/* Weekly Settings */}
                {schedule.frequency === 'weekly' && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>Run on days:</Typography>
                    <Box display="flex" gap={1}>
                      {weekdayNames.map((day, index) => (
                        <Chip
                          key={index}
                          label={day}
                          clickable
                          color={schedule.weekdays?.includes(index) ? 'primary' : 'default'}
                          onClick={() => handleWeekdayToggle(index)}
                        />
                      ))}
                    </Box>
                  </Grid>
                )}

                {/* Monthly Settings */}
                {schedule.frequency === 'monthly' && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Day of Month"
                      type="number"
                      value={schedule.dayOfMonth || 1}
                      onChange={(e) => setSchedule(prev => ({ 
                        ...prev, 
                        dayOfMonth: parseInt(e.target.value) 
                      }))}
                      inputProps={{ min: 1, max: 31 }}
                    />
                  </Grid>
                )}

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Delivery Method</InputLabel>
                    <Select
                      value={schedule.deliveryMethod}
                      label="Delivery Method"
                      onChange={(e) => setSchedule(prev => ({ 
                        ...prev, 
                        deliveryMethod: e.target.value as ReportSchedule['deliveryMethod']
                      }))}
                    >
                      <MenuItem value="email">Email</MenuItem>
                      <MenuItem value="download">Download Link</MenuItem>
                      <MenuItem value="ftp">FTP Upload</MenuItem>
                      <MenuItem value="api">API Webhook</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={schedule.enabled}
                        onChange={(e) => setSchedule(prev => ({ ...prev, enabled: e.target.checked }))}
                      />
                    }
                    label="Enable Schedule"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Recipients */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Recipients</Typography>
              
              <Box display="flex" gap={2} marginBottom={2}>
                <TextField
                  fullWidth
                  label="Add recipient email"
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                />
                <Button variant="outlined" onClick={addRecipient} startIcon={<AddIcon />}>
                  Add
                </Button>
              </Box>

              <Box display="flex" flexWrap="wrap" gap={1}>
                {schedule.recipients.map((email) => (
                  <Chip
                    key={email}
                    label={email}
                    onDelete={() => removeRecipient(email)}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>

              {schedule.recipients.length === 0 && (
                <Alert severity="warning" sx={{ marginTop: 2 }}>
                  At least one recipient is required
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Next Run Preview */}
          {schedule.frequency && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Schedule Preview</Typography>
                <Typography variant="body2" color="text.secondary">
                  Next run: {calculateNextRun(schedule).toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Timezone: {schedule.timezone}
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Execution History */}
          {existingSchedule && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Recent Executions</Typography>
                <List>
                  {executions.slice(0, 5).map((execution) => (
                    <React.Fragment key={execution.id}>
                      <ListItem>
                        <ListItemIcon>
                          {getStatusIcon(execution.status)}
                        </ListItemIcon>
                        <ListItemText
                          primary={`${execution.reportName}`}
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                Scheduled: {new Date(execution.scheduledTime).toLocaleString()}
                              </Typography>
                              {execution.executedTime && (
                                <Typography variant="caption" display="block">
                                  Executed: {new Date(execution.executedTime).toLocaleString()}
                                  {execution.duration && ` (${execution.duration}s)`}
                                </Typography>
                              )}
                              {execution.error && (
                                <Alert severity="error" sx={{ marginTop: 1 }}>
                                  {execution.error}
                                </Alert>
                              )}
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip 
                              label={execution.status} 
                              size="small"
                              color={execution.status === 'completed' ? 'success' : 
                                     execution.status === 'failed' ? 'error' : 'default'}
                            />
                            {execution.deliveryStatus.downloadUrl && (
                              <Button
                                size="small"
                                href={execution.deliveryStatus.downloadUrl}
                                download
                              >
                                Download
                              </Button>
                            )}
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={loading}
        >
          {existingSchedule ? 'Update Schedule' : 'Create Schedule'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScheduleManager;