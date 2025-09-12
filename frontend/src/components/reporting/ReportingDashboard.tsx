import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  CircularProgress,
  LinearProgress,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  FileDownload as DownloadIcon,
  Schedule as ScheduleIcon,
  Assessment as ReportIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Email as EmailIcon,
  Settings as SettingsIcon,
  Preview as PreviewIcon,
  History as HistoryIcon,
  Dashboard as DashboardIcon,
  TableChart as TableIcon,
  PictureAsPdf as PdfIcon,
  InsertDriveFile as ExcelIcon,
  Description as CsvIcon
} from '@mui/icons-material';

interface ReportingDashboardProps {
  userId?: string;
  tenantId?: string;
  userRole?: 'analyst' | 'executive' | 'admin';
}

interface Report {
  id: string;
  name: string;
  description: string;
  type: 'standard' | 'custom' | 'scheduled';
  category: string;
  status: 'draft' | 'active' | 'archived';
  lastGenerated: string;
  createdBy: string;
  isShared: boolean;
  exportFormats: ExportFormat[];
  schedule?: ReportSchedule;
  parameters: ReportParameter[];
}

interface ExportFormat {
  format: 'pdf' | 'excel' | 'csv' | 'json';
  enabled: boolean;
  options: any;
}

interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  enabled: boolean;
  nextRun: string;
  recipients: string[];
}

interface ReportParameter {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  value: any;
  options?: string[];
  required: boolean;
}

interface ExportJob {
  id: string;
  reportId: string;
  reportName: string;
  format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  requestedAt: string;
  completedAt?: string;
  downloadUrl?: string;
  error?: string;
}

const ReportingDashboard: React.FC<ReportingDashboardProps> = ({
  userId,
  tenantId,
  userRole = 'analyst'
}) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [newReport, setNewReport] = useState({
    name: '',
    description: '',
    type: 'standard' as Report['type'],
    category: 'compensation'
  });

  // Sample data for demonstration
  const sampleReports: Report[] = [
    {
      id: 'rpt-001',
      name: 'Monthly Compensation Report',
      description: 'Comprehensive monthly analysis of compensation distribution',
      type: 'scheduled',
      category: 'Compensation',
      status: 'active',
      lastGenerated: '2024-01-15T10:30:00Z',
      createdBy: 'John Doe',
      isShared: true,
      exportFormats: [
        { format: 'pdf', enabled: true, options: { orientation: 'landscape' } },
        { format: 'excel', enabled: true, options: { includeCharts: true } }
      ],
      schedule: {
        frequency: 'monthly',
        enabled: true,
        nextRun: '2024-02-01T09:00:00Z',
        recipients: ['executives@company.com', 'hr@company.com']
      },
      parameters: [
        { key: 'month', label: 'Month', type: 'select', value: '2024-01', options: ['2024-01', '2024-02'], required: true },
        { key: 'includeBenchmarks', label: 'Include Benchmarks', type: 'boolean', value: true, required: false }
      ]
    },
    {
      id: 'rpt-002',
      name: 'Department Performance Analysis',
      description: 'Detailed analysis of department-wise performance metrics',
      type: 'standard',
      category: 'Performance',
      status: 'active',
      lastGenerated: '2024-01-14T14:20:00Z',
      createdBy: 'Jane Smith',
      isShared: false,
      exportFormats: [
        { format: 'excel', enabled: true, options: { includeCharts: true } },
        { format: 'csv', enabled: true, options: {} }
      ],
      parameters: [
        { key: 'departments', label: 'Departments', type: 'select', value: 'all', options: ['all', 'Fixed Income', 'Equities'], required: true }
      ]
    },
    {
      id: 'rpt-003',
      name: 'Executive Summary Dashboard',
      description: 'High-level executive summary with key metrics and insights',
      type: 'custom',
      category: 'Executive',
      status: 'draft',
      lastGenerated: '',
      createdBy: 'Current User',
      isShared: false,
      exportFormats: [
        { format: 'pdf', enabled: true, options: { includeExecutiveSummary: true } }
      ],
      parameters: []
    }
  ];

  const sampleExportJobs: ExportJob[] = [
    {
      id: 'job-001',
      reportId: 'rpt-001',
      reportName: 'Monthly Compensation Report',
      format: 'pdf',
      status: 'completed',
      progress: 100,
      requestedAt: '2024-01-15T10:30:00Z',
      completedAt: '2024-01-15T10:35:00Z',
      downloadUrl: '/downloads/monthly-compensation-jan-2024.pdf'
    },
    {
      id: 'job-002',
      reportId: 'rpt-002',
      reportName: 'Department Performance Analysis',
      format: 'excel',
      status: 'processing',
      progress: 65,
      requestedAt: '2024-01-15T11:00:00Z'
    },
    {
      id: 'job-003',
      reportId: 'rpt-001',
      reportName: 'Monthly Compensation Report',
      format: 'excel',
      status: 'failed',
      progress: 0,
      requestedAt: '2024-01-15T09:45:00Z',
      error: 'Data source temporarily unavailable'
    }
  ];

  useEffect(() => {
    // Simulate API calls
    const loadReportingData = async () => {
      setLoading(true);
      try {
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        setReports(sampleReports);
        setExportJobs(sampleExportJobs);
      } catch (error) {
        console.error('Error loading reporting data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReportingData();
  }, [userId, tenantId]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleCreateReport = async () => {
    if (!newReport.name.trim()) return;

    const report: Report = {
      id: `rpt-${Date.now()}`,
      name: newReport.name,
      description: newReport.description,
      type: newReport.type,
      category: newReport.category,
      status: 'draft',
      lastGenerated: '',
      createdBy: 'Current User',
      isShared: false,
      exportFormats: [
        { format: 'pdf', enabled: true, options: {} },
        { format: 'excel', enabled: true, options: {} }
      ],
      parameters: []
    };

    setReports(prev => [...prev, report]);
    setNewReport({ name: '', description: '', type: 'standard', category: 'compensation' });
    setCreateDialogOpen(false);
  };

  const handleExportReport = async (report: Report, format: 'pdf' | 'excel' | 'csv' | 'json') => {
    const exportJob: ExportJob = {
      id: `job-${Date.now()}`,
      reportId: report.id,
      reportName: report.name,
      format: format,
      status: 'pending',
      progress: 0,
      requestedAt: new Date().toISOString()
    };

    setExportJobs(prev => [exportJob, ...prev]);
    
    // Simulate export processing
    setTimeout(() => {
      setExportJobs(prev => prev.map(job => 
        job.id === exportJob.id 
          ? { ...job, status: 'processing', progress: 25 }
          : job
      ));
    }, 1000);

    setTimeout(() => {
      setExportJobs(prev => prev.map(job => 
        job.id === exportJob.id 
          ? { 
              ...job, 
              status: 'completed', 
              progress: 100, 
              completedAt: new Date().toISOString(),
              downloadUrl: `/downloads/${report.name.toLowerCase().replace(/\s+/g, '-')}.${format}`
            }
          : job
      ));
    }, 5000);
  };

  const handleScheduleToggle = (reportId: string, enabled: boolean) => {
    setReports(prev => prev.map(report => 
      report.id === reportId && report.schedule
        ? { ...report, schedule: { ...report.schedule, enabled } }
        : report
    ));
  };

  const getStatusColor = (status: Report['status'] | ExportJob['status']) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'success';
      case 'draft': return 'warning';
      case 'processing': return 'info';
      case 'pending': return 'info';
      case 'failed': return 'error';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf': return <PdfIcon />;
      case 'excel': return <ExcelIcon />;
      case 'csv': return <CsvIcon />;
      default: return <TableIcon />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
        <Typography variant="body1" sx={{ marginLeft: 2 }}>
          Loading reporting dashboard...
        </Typography>
      </Box>
    );
  }

  const filteredReports = reports.filter((report, index) => {
    switch (activeTab) {
      case 1: return report.status === 'active';
      case 2: return report.type === 'scheduled';
      case 3: return report.type === 'custom';
      default: return true;
    }
  });

  return (
    <Box sx={{ width: '100%', padding: 3 }}>
      {/* Header */}
      <Paper elevation={2} sx={{ padding: 3, marginBottom: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" gutterBottom>
              Reporting & Export System
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create, manage, and export comprehensive compensation reports
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Report
            </Button>
            <Tooltip title="Report Settings">
              <IconButton>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* Navigation Tabs */}
      <Paper elevation={1} sx={{ marginBottom: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="All Reports" icon={<ReportIcon />} />
          <Tab label="Active Reports" icon={<DashboardIcon />} />
          <Tab label="Scheduled" icon={<ScheduleIcon />} />
          <Tab label="Custom Reports" icon={<EditIcon />} />
        </Tabs>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={3} marginBottom={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {reports.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Reports
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {reports.filter(r => r.status === 'active').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Reports
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="info.main">
                {reports.filter(r => r.schedule?.enabled).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Scheduled Reports
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                {exportJobs.filter(j => j.status === 'processing').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Processing Exports
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Reports List */}
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ padding: 2 }}>
            <Typography variant="h6" gutterBottom>
              Reports
            </Typography>
            {filteredReports.length === 0 ? (
              <Alert severity="info">No reports found for the selected filter.</Alert>
            ) : (
              <Grid container spacing={2}>
                {filteredReports.map((report) => (
                  <Grid item xs={12} key={report.id}>
                    <Card variant="outlined">
                      <CardHeader
                        title={report.name}
                        subheader={`${report.category} • Created by ${report.createdBy}`}
                        avatar={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip 
                              label={report.type} 
                              size="small" 
                              variant="outlined" 
                            />
                            <Chip 
                              label={report.status} 
                              size="small" 
                              color={getStatusColor(report.status)} 
                            />
                          </Box>
                        }
                        action={
                          report.schedule && (
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={report.schedule.enabled}
                                  onChange={(e) => handleScheduleToggle(report.id, e.target.checked)}
                                  size="small"
                                />
                              }
                              label="Scheduled"
                              labelPlacement="start"
                            />
                          )
                        }
                      />
                      <CardContent>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {report.description}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1} marginTop={1}>
                          {report.exportFormats.filter(f => f.enabled).map((format) => (
                            <Chip
                              key={format.format}
                              icon={getFormatIcon(format.format)}
                              label={format.format.toUpperCase()}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                        {report.lastGenerated && (
                          <Typography variant="caption" color="text.secondary">
                            Last generated: {new Date(report.lastGenerated).toLocaleDateString()}
                          </Typography>
                        )}
                      </CardContent>
                      <CardActions>
                        <Button
                          startIcon={<PreviewIcon />}
                          size="small"
                        >
                          Preview
                        </Button>
                        <Button
                          startIcon={<DownloadIcon />}
                          size="small"
                          onClick={() => {
                            setSelectedReport(report);
                            setExportDialogOpen(true);
                          }}
                        >
                          Export
                        </Button>
                        <Button
                          startIcon={<EditIcon />}
                          size="small"
                        >
                          Edit
                        </Button>
                        {report.isShared && (
                          <Chip 
                            icon={<ShareIcon />} 
                            label="Shared" 
                            size="small" 
                            color="primary" 
                            variant="outlined" 
                          />
                        )}
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>

        {/* Export Jobs Sidebar */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ padding: 2 }}>
            <Box display="flex" alignItems="center" gap={1} marginBottom={2}>
              <HistoryIcon />
              <Typography variant="h6">
                Export History
              </Typography>
            </Box>
            <List>
              {exportJobs.slice(0, 5).map((job) => (
                <React.Fragment key={job.id}>
                  <ListItem>
                    <ListItemText
                      primary={job.reportName}
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            {job.format.toUpperCase()} • {new Date(job.requestedAt).toLocaleString()}
                          </Typography>
                          {job.status === 'processing' && (
                            <LinearProgress 
                              variant="determinate" 
                              value={job.progress} 
                              sx={{ marginTop: 1 }}
                            />
                          )}
                          {job.error && (
                            <Alert severity="error" sx={{ marginTop: 1 }}>
                              {job.error}
                            </Alert>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                        <Chip 
                          label={job.status} 
                          size="small" 
                          color={getStatusColor(job.status)} 
                        />
                        {job.downloadUrl && (
                          <Button
                            size="small"
                            startIcon={<DownloadIcon />}
                            href={job.downloadUrl}
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
          </Paper>
        </Grid>
      </Grid>

      {/* Create Report Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Report</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3} paddingTop={1}>
            <TextField
              fullWidth
              label="Report Name"
              value={newReport.name}
              onChange={(e) => setNewReport(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={newReport.description}
              onChange={(e) => setNewReport(prev => ({ ...prev, description: e.target.value }))}
            />
            <FormControl fullWidth>
              <InputLabel>Report Type</InputLabel>
              <Select
                value={newReport.type}
                label="Report Type"
                onChange={(e) => setNewReport(prev => ({ ...prev, type: e.target.value as Report['type'] }))}
              >
                <MenuItem value="standard">Standard Report</MenuItem>
                <MenuItem value="custom">Custom Report</MenuItem>
                <MenuItem value="scheduled">Scheduled Report</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={newReport.category}
                label="Category"
                onChange={(e) => setNewReport(prev => ({ ...prev, category: e.target.value }))}
              >
                <MenuItem value="compensation">Compensation</MenuItem>
                <MenuItem value="performance">Performance</MenuItem>
                <MenuItem value="executive">Executive</MenuItem>
                <MenuItem value="compliance">Compliance</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateReport} variant="contained">Create Report</Button>
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Export Report: {selectedReport?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Select the format for exporting this report
          </Typography>
          <Box display="flex" flexDirection="column" gap={2} marginTop={2}>
            {selectedReport?.exportFormats.filter(f => f.enabled).map((format) => (
              <Button
                key={format.format}
                variant="outlined"
                startIcon={getFormatIcon(format.format)}
                onClick={() => {
                  handleExportReport(selectedReport, format.format);
                  setExportDialogOpen(false);
                }}
                sx={{ justifyContent: 'flex-start' }}
              >
                Export as {format.format.toUpperCase()}
              </Button>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportingDashboard;