/**
 * Approval Dashboard - Central hub for managing approval workflows
 * Features advanced filtering, search, statistics, and bulk operations
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Grid,
  Stack,
  Chip,
  Button,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Badge,
  Alert,
  LinearProgress,
  Tooltip,
  Menu,
  Checkbox,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Divider,
  Avatar,
  AvatarGroup,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  MoreVert as MoreIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Schedule as PendingIcon,
  Assignment as InReviewIcon,
  Edit as DraftIcon,
  Warning as OverdueIcon,
  TrendingUp as TrendingIcon,
  GetApp as ExportIcon,
  Notifications as NotificationIcon,
  Group as CollabIcon,
  AccessTime as TimeIcon,
  Flag as PriorityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckBox as BulkSelectIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { useUser } from '../../contexts/UserContext';
import { approvalService } from '../../services/approvalService';
import {
  ApprovalWorkflow,
  ApprovalFilters,
  ApprovalStatistics,
  ApprovalStatus,
  ApprovalPriority,
} from '../../types/approvalTypes';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`approval-tabpanel-${index}`}
      aria-labelledby={`approval-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export const ApprovalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();

  // State Management
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [statistics, setStatistics] = useState<ApprovalStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Tab Management
  const [activeTab, setActiveTab] = useState(0);
  
  // Filter and Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ApprovalFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  
  // Selection and Bulk Actions
  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionAnchor, setBulkActionAnchor] = useState<HTMLElement | null>(null);
  
  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  // Notifications
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  } | null>(null);

  // Load data
  useEffect(() => {
    loadDashboardData();
  }, [filters, activeTab]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load workflows based on active tab
      const tabFilters = getTabFilters(activeTab);
      const workflowData = await approvalService.getWorkflows({
        ...filters,
        ...tabFilters,
      });
      
      setWorkflows(workflowData.workflows);

      // Load statistics
      const statsData = await approvalService.getStatistics(user?.id);
      setStatistics(statsData);
    } catch (err) {
      setError(`Failed to load dashboard: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDashboardData();
      setNotification({ message: 'Dashboard refreshed successfully', type: 'success' });
    } catch (err) {
      setNotification({ message: `Refresh failed: ${err}`, type: 'error' });
    } finally {
      setRefreshing(false);
    }
  };

  const getTabFilters = (tabIndex: number): Partial<ApprovalFilters> => {
    switch (tabIndex) {
      case 0: // All Workflows
        return {};
      case 1: // My Pending
        return { assignedToMe: true, status: ['pending', 'in_review'] };
      case 2: // Pending Approval
        return { status: ['pending', 'in_review'] };
      case 3: // Completed
        return { status: ['approved', 'rejected'] };
      case 4: // Overdue
        return { dueWithinDays: -1 };
      default:
        return {};
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // In real implementation, this would trigger a search API call
    // For now, we'll filter client-side
  };

  const handleFilterChange = (newFilters: Partial<ApprovalFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleWorkflowSelect = (workflowId: string, selected: boolean) => {
    setSelectedWorkflows(prev => 
      selected 
        ? [...prev, workflowId]
        : prev.filter(id => id !== workflowId)
    );
  };

  const handleSelectAll = () => {
    const allSelected = selectedWorkflows.length === workflows.length;
    setSelectedWorkflows(allSelected ? [] : workflows.map(w => w.id));
  };

  const handleBulkApprove = async () => {
    try {
      await approvalService.bulkApprove(selectedWorkflows, 'Bulk approval');
      setNotification({ message: 'Workflows approved successfully', type: 'success' });
      setSelectedWorkflows([]);
      await loadDashboardData();
    } catch (err) {
      setNotification({ message: `Bulk approval failed: ${err}`, type: 'error' });
    }
    setBulkActionAnchor(null);
  };

  const handleBulkReject = async () => {
    try {
      await approvalService.bulkReject(selectedWorkflows, 'Bulk rejection');
      setNotification({ message: 'Workflows rejected successfully', type: 'success' });
      setSelectedWorkflows([]);
      await loadDashboardData();
    } catch (err) {
      setNotification({ message: `Bulk rejection failed: ${err}`, type: 'error' });
    }
    setBulkActionAnchor(null);
  };

  const getStatusIcon = (status: ApprovalStatus) => {
    switch (status) {
      case 'approved': return <ApprovedIcon color="success" />;
      case 'rejected': return <RejectedIcon color="error" />;
      case 'pending': return <PendingIcon color="warning" />;
      case 'in_review': return <InReviewIcon color="info" />;
      case 'draft': return <DraftIcon color="disabled" />;
      case 'cancelled': return <Cancel color="disabled" />;
      default: return <DraftIcon />;
    }
  };

  const getStatusColor = (status: ApprovalStatus) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      case 'in_review': return 'info';
      case 'draft': return 'default';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: ApprovalPriority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'normal': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const isOverdue = (workflow: ApprovalWorkflow) => {
    return workflow.dueDate && new Date(workflow.dueDate) < new Date() && 
           !['approved', 'rejected', 'cancelled'].includes(workflow.status);
  };

  const filteredWorkflows = useMemo(() => {
    return workflows.filter(workflow => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        return (
          workflow.planName.toLowerCase().includes(searchLower) ||
          workflow.submitterName.toLowerCase().includes(searchLower) ||
          workflow.businessJustification?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [workflows, searchQuery]);

  const tabCounts = useMemo(() => {
    if (!statistics) return [0, 0, 0, 0, 0];
    
    return [
      statistics.totalWorkflows,
      statistics.myPendingApprovals,
      statistics.pendingApprovals,
      statistics.statusBreakdown.approved + statistics.statusBreakdown.rejected,
      statistics.overdue,
    ];
  }, [statistics]);

  if (loading && !refreshing) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography>Loading approval dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Approval Dashboard</Typography>
        
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateDialog(true)}
          >
            Create Workflow
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      {statistics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      Total Workflows
                    </Typography>
                    <Typography variant="h4">
                      {statistics.totalWorkflows}
                    </Typography>
                  </Box>
                  <TrendingIcon color="primary" sx={{ fontSize: 40 }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      My Pending
                    </Typography>
                    <Typography variant="h4" color="warning.main">
                      {statistics.myPendingApprovals}
                    </Typography>
                  </Box>
                  <Badge badgeContent={statistics.myPendingApprovals} color="warning">
                    <NotificationIcon color="warning" sx={{ fontSize: 40 }} />
                  </Badge>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      Approved Today
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {statistics.approvedToday}
                    </Typography>
                  </Box>
                  <ApprovedIcon color="success" sx={{ fontSize: 40 }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      Overdue
                    </Typography>
                    <Typography variant="h4" color="error.main">
                      {statistics.overdue}
                    </Typography>
                  </Box>
                  <OverdueIcon color="error" sx={{ fontSize: 40 }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            fullWidth
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
          
          {selectedWorkflows.length > 0 && (
            <Button
              variant="contained"
              startIcon={<BulkSelectIcon />}
              onClick={(e) => setBulkActionAnchor(e.currentTarget)}
            >
              Bulk Actions ({selectedWorkflows.length})
            </Button>
          )}
        </Stack>

        {/* Filter Panel */}
        {showFilters && (
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    multiple
                    value={filters.status || []}
                    onChange={(e) => handleFilterChange({ status: e.target.value as ApprovalStatus[] })}
                    label="Status"
                    renderValue={(selected) => selected.join(', ')}
                  >
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="in_review">In Review</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Priority</InputLabel>
                  <Select
                    multiple
                    value={filters.priority || []}
                    onChange={(e) => handleFilterChange({ priority: e.target.value as ApprovalPriority[] })}
                    label="Priority"
                    renderValue={(selected) => selected.join(', ')}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="normal">Normal</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Due Within Days"
                  type="number"
                  value={filters.dueWithinDays || ''}
                  onChange={(e) => handleFilterChange({ 
                    dueWithinDays: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    size="small"
                    onClick={() => setFilters({})}
                    startIcon={<ClearIcon />}
                  >
                    Clear Filters
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab 
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <span>All Workflows</span>
                {tabCounts[0] > 0 && <Chip label={tabCounts[0]} size="small" />}
              </Stack>
            } 
          />
          <Tab 
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <span>My Pending</span>
                {tabCounts[1] > 0 && <Chip label={tabCounts[1]} size="small" color="warning" />}
              </Stack>
            } 
          />
          <Tab 
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <span>Pending Approval</span>
                {tabCounts[2] > 0 && <Chip label={tabCounts[2]} size="small" color="info" />}
              </Stack>
            } 
          />
          <Tab 
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <span>Completed</span>
                {tabCounts[3] > 0 && <Chip label={tabCounts[3]} size="small" color="success" />}
              </Stack>
            } 
          />
          <Tab 
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <span>Overdue</span>
                {tabCounts[4] > 0 && <Chip label={tabCounts[4]} size="small" color="error" />}
              </Stack>
            } 
          />
        </Tabs>
      </Paper>

      {/* Workflow List */}
      <TabPanel value={activeTab} index={activeTab}>
        {selectedWorkflows.length > 0 && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'action.selected' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={2}>
                <Checkbox
                  checked={selectedWorkflows.length === filteredWorkflows.length}
                  indeterminate={selectedWorkflows.length > 0 && selectedWorkflows.length < filteredWorkflows.length}
                  onChange={handleSelectAll}
                />
                <Typography>
                  {selectedWorkflows.length} of {filteredWorkflows.length} workflows selected
                </Typography>
              </Stack>
              
              <Button
                size="small"
                onClick={() => setSelectedWorkflows([])}
                startIcon={<ClearIcon />}
              >
                Clear Selection
              </Button>
            </Stack>
          </Paper>
        )}
        
        <Stack spacing={2}>
          {filteredWorkflows.map((workflow) => (
            <Card 
              key={workflow.id}
              sx={{ 
                border: selectedWorkflows.includes(workflow.id) ? 2 : 1,
                borderColor: selectedWorkflows.includes(workflow.id) ? 'primary.main' : 'divider',
                ...(isOverdue(workflow) && { borderColor: 'error.main', borderWidth: 2 }),
              }}
            >
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Checkbox
                    checked={selectedWorkflows.includes(workflow.id)}
                    onChange={(e) => handleWorkflowSelect(workflow.id, e.target.checked)}
                  />
                  
                  <Box sx={{ flexGrow: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={2} mb={1}>
                      <Typography variant="h6" component="div">
                        {workflow.planName}
                      </Typography>
                      
                      <Chip
                        icon={getStatusIcon(workflow.status)}
                        label={workflow.status}
                        color={getStatusColor(workflow.status) as any}
                        size="small"
                      />
                      
                      <Chip
                        icon={<PriorityIcon />}
                        label={workflow.priority}
                        color={getPriorityColor(workflow.priority) as any}
                        size="small"
                        variant="outlined"
                      />
                      
                      {isOverdue(workflow) && (
                        <Chip
                          icon={<OverdueIcon />}
                          label="Overdue"
                          color="error"
                          size="small"
                        />
                      )}
                    </Stack>
                    
                    <Stack direction="row" alignItems="center" spacing={3} mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        Submitted by: {workflow.submitterName}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary">
                        Stage: {workflow.currentStage} of {workflow.totalStages}
                      </Typography>
                      
                      {workflow.dueDate && (
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <TimeIcon fontSize="small" color="disabled" />
                          <Typography variant="body2" color="text.secondary">
                            Due: {new Date(workflow.dueDate).toLocaleDateString()}
                          </Typography>
                        </Stack>
                      )}
                    </Stack>
                    
                    {workflow.businessJustification && (
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {workflow.businessJustification}
                      </Typography>
                    )}
                  </Box>
                  
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {workflow.tags.length > 0 && (
                      <Stack direction="row" spacing={0.5}>
                        {workflow.tags.slice(0, 2).map((tag) => (
                          <Chip key={tag} label={tag} size="small" variant="outlined" />
                        ))}
                        {workflow.tags.length > 2 && (
                          <Chip label={`+${workflow.tags.length - 2}`} size="small" variant="outlined" />
                        )}
                      </Stack>
                    )}
                    
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => navigate(`/approvals/${workflow.id}`)}
                    >
                      View Details
                    </Button>
                    
                    <IconButton size="small">
                      <MoreIcon />
                    </IconButton>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>

        {filteredWorkflows.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No workflows found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {searchQuery ? 'Try adjusting your search terms or filters' : 'No workflows match the current filter criteria'}
            </Typography>
            
            {activeTab === 0 && !searchQuery && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowCreateDialog(true)}
              >
                Create Your First Workflow
              </Button>
            )}
          </Box>
        )}
      </TabPanel>

      {/* Bulk Actions Menu */}
      <Menu
        anchorEl={bulkActionAnchor}
        open={Boolean(bulkActionAnchor)}
        onClose={() => setBulkActionAnchor(null)}
      >
        <MenuItem onClick={handleBulkApprove}>
          <ApprovedIcon sx={{ mr: 1 }} />
          Bulk Approve
        </MenuItem>
        <MenuItem onClick={handleBulkReject}>
          <RejectedIcon sx={{ mr: 1 }} />
          Bulk Reject
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => setShowExportDialog(true)}>
          <ExportIcon sx={{ mr: 1 }} />
          Export Selected
        </MenuItem>
      </Menu>

      {/* Notification */}
      <Snackbar
        open={Boolean(notification)}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        message={notification?.message}
      />
    </Box>
  );
};

export default ApprovalDashboard;