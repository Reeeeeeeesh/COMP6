/**
 * Plan Library - Comprehensive plan management interface with advanced search, filters, and collaboration
 * Central hub for browsing, creating, and managing compensation calculation plans
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  IconButton,
  Menu,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  ListItemText,
  Tooltip,
  Badge,
  Divider,
  Fab,
  InputAdornment,
  LinearProgress,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  FileCopy as CopyIcon,
  Archive as ArchiveIcon,
  GetApp as ExportIcon,
  Upload as ImportIcon,
  PlayArrow as TestIcon,
  Group as CollabIcon,
  Schedule as ScheduleIcon,
  CheckCircle as ActiveIcon,
  Edit as DraftIcon,
  Warning as WarningIcon,
  History as HistoryIcon,
  FileCopy as TemplateIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { useUser } from '../../contexts/UserContext';
import { planService } from '../../services/planService';
import {
  Plan,
  PlanTemplate,
  PlanFilters,
  PlanStatus,
  PlanType,
} from '../../types/planTypes';

interface PlanLibraryProps {
  mode?: 'library' | 'templates' | 'shared';
}

export const PlanLibrary: React.FC<PlanLibraryProps> = ({ mode = 'library' }) => {
  const navigate = useNavigate();
  const { user } = useUser();

  // State Management
  const [plans, setPlans] = useState<Plan[]>([]);
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<PlanFilters>({});
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'updatedAt' | 'createdAt' | 'status'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Dialog States
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // Notification
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load data
  const applySearch = useCallback(
    (source: Plan[], query: string) => {
      if (!query.trim()) return source;
      const lowered = query.toLowerCase();
      return source.filter(plan =>
        plan.name.toLowerCase().includes(lowered) ||
        plan.description?.toLowerCase().includes(lowered) ||
        plan.tags.some(tag => tag.toLowerCase().includes(lowered))
      );
    },
    []
  );

  const sortPlans = useCallback(
    (source: Plan[]) => {
      const sorted = [...source];
      sorted.sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'status':
            return a.status.localeCompare(b.status);
          case 'createdAt':
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case 'updatedAt':
          default:
            return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        }
      });
      if (sortOrder === 'desc') {
        sorted.reverse();
      }
      return sorted;
    },
    [sortBy, sortOrder]
  );

  const recomputeVisiblePlans = useCallback(
    (source: Plan[], query: string) => {
      const sorted = sortPlans(source);
      return applySearch(sorted, query);
    },
    [applySearch, sortPlans]
  );

  useEffect(() => {
    if (mode !== 'library') {
      setPlans([]);
      setAllPlans([]);
      setTemplates([]);
      setLoading(false);
      setError(
        mode === 'templates'
          ? 'Template library is not available yet. '
          : 'Shared plans view is not available yet.'
      );
      return;
    }

    setError(null);
    loadData();
  }, [mode, filters]);

  useEffect(() => {
    if (mode !== 'library') return;
    setPlans(recomputeVisiblePlans(allPlans, searchQuery));
  }, [allPlans, searchQuery, recomputeVisiblePlans, mode]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (mode !== 'library') {
        return;
      }

      const planData = await planService.getPlans(filters);
      setAllPlans(planData.plans);
      setPlans(recomputeVisiblePlans(planData.plans, searchQuery));
    } catch (err) {
      setError(`Failed to load plans: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (mode !== 'library') return;
    setPlans(recomputeVisiblePlans(allPlans, query));
  };

  const handleFilterChange = (newFilters: Partial<PlanFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleCreatePlan = () => {
    navigate('/plans/create');
  };

  const handleCreateFromTemplate = (templateId: string) => {
    navigate(`/plans/create?template=${templateId}`);
  };

  const handleEditPlan = (planId: string) => {
    navigate(`/plans/${planId}/edit`);
  };

  const handleViewPlan = (planId: string) => {
    navigate(`/plans/${planId}`);
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      await planService.deletePlan(planId);
      setNotification({ message: 'Plan deleted successfully', type: 'success' });
      await loadData();
    } catch (err) {
      setNotification({ message: `Failed to delete plan: ${err}`, type: 'error' });
    }
    setShowDeleteDialog(false);
    setSelectedPlan(null);
  };

  const handleDuplicatePlan = async (planId: string, planName: string) => {
    try {
      const duplicatedPlan = await planService.duplicatePlan(planId, `${planName} (Copy)`);
      setNotification({ message: 'Plan duplicated successfully', type: 'success' });
      await loadData();
      navigate(`/plans/${duplicatedPlan.id}/edit`);
    } catch (err) {
      setNotification({ message: `Failed to duplicate plan: ${err}`, type: 'error' });
    }
  };

  const handleBulkDelete = async () => {
    try {
      await planService.bulkDelete(selectedPlans);
      setNotification({ message: `${selectedPlans.length} plans deleted successfully`, type: 'success' });
      setSelectedPlans([]);
      await loadData();
    } catch (err) {
      setNotification({ message: `Bulk delete failed: ${err}`, type: 'error' });
    }
    setShowBulkActions(false);
  };

  const handleExportPlan = async (planId: string, planName: string) => {
    try {
      const blob = await planService.exportPlan(planId, 'json');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${planName}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setNotification({ message: 'Plan exported successfully', type: 'success' });
    } catch (err) {
      setNotification({ message: `Export failed: ${err}`, type: 'error' });
    }
  };

  // Computed values
  const filteredItems = useMemo(() => {
    const items = mode === 'templates' ? templates : plans;
    return items.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt || a.createdAt);
          bValue = new Date(b.updatedAt || b.createdAt);
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [plans, templates, mode, sortBy, sortOrder]);

  const getStatusIcon = (status: PlanStatus) => {
    switch (status) {
      case 'active': return <ActiveIcon color="success" />;
      case 'draft': return <DraftIcon color="primary" />;
      case 'testing': return <TestIcon color="warning" />;
      case 'inactive': return <ArchiveIcon color="disabled" />;
      case 'archived': return <ArchiveIcon color="disabled" />;
      default: return <DraftIcon />;
    }
  };

  const getStatusColor = (status: PlanStatus) => {
    switch (status) {
      case 'active': return 'success';
      case 'draft': return 'primary';
      case 'testing': return 'warning';
      case 'inactive': return 'default';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography>Loading {mode}...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          {mode === 'templates' ? 'Plan Templates' : mode === 'shared' ? 'Shared Plans' : 'Plan Library'}
        </Typography>
        
        <Stack direction="row" spacing={1}>
          {selectedPlans.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setShowBulkActions(true)}
            >
              Bulk Actions ({selectedPlans.length})
            </Button>
          )}
          
          {mode === 'library' && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreatePlan}
            >
              Create Plan
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            fullWidth
            placeholder={`Search ${mode}...`}
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
          
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Sort by</InputLabel>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              label="Sort by"
            >
              <MenuItem value="updatedAt">Last Updated</MenuItem>
              <MenuItem value="createdAt">Created Date</MenuItem>
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="status">Status</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {/* Filter Panel */}
        {showFilters && (
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Grid container spacing={2}>
              {mode !== 'templates' && (
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      multiple
                      value={filters.status || []}
                      onChange={(e) => handleFilterChange({ status: e.target.value as PlanStatus[] })}
                      label="Status"
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip key={value} label={value} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      <MenuItem value="draft">Draft</MenuItem>
                      <MenuItem value="testing">Testing</MenuItem>
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                      <MenuItem value="archived">Archived</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
              
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    multiple
                    value={filters.type || []}
                    onChange={(e) => handleFilterChange({ type: e.target.value as PlanType[] })}
                    label="Type"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="commission">Commission</MenuItem>
                    <MenuItem value="bonus">Bonus</MenuItem>
                    <MenuItem value="incentive">Incentive</MenuItem>
                    <MenuItem value="hybrid">Hybrid</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Tags"
                  placeholder="Enter tags..."
                  value={filters.tags?.join(', ') || ''}
                  onChange={(e) => handleFilterChange({ 
                    tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) 
                  })}
                />
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Items Grid */}
      <Grid container spacing={3}>
        {filteredItems.map((item) => {
          const isTemplate = mode === 'templates';
          const plan = item as Plan;
          const template = item as PlanTemplate;
          const isSelected = selectedPlans.includes(item.id);

          return (
            <Grid item xs={12} sm={6} lg={4} key={item.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  border: isSelected ? 2 : 1,
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  cursor: 'pointer',
                  '&:hover': {
                    elevation: 4,
                    borderColor: 'primary.light',
                  }
                }}
                onClick={() => isTemplate ? null : handleViewPlan(item.id)}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                        {!isTemplate && (
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              setSelectedPlans(prev => 
                                isSelected 
                                  ? prev.filter(id => id !== item.id)
                                  : [...prev, item.id]
                              );
                            }}
                          />
                        )}
                        
                        <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
                          {item.name}
                        </Typography>
                        
                        {!isTemplate ? getStatusIcon(plan.status) : <TemplateIcon color="primary" />}
                      </Stack>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {item.description}
                      </Typography>

                      <Stack direction="row" spacing={1} mb={2}>
                        <Chip 
                          label={item.type} 
                          size="small" 
                          color="primary" 
                          variant="outlined" 
                        />
                        {!isTemplate && (
                          <Chip 
                            label={plan.status} 
                            size="small" 
                            color={getStatusColor(plan.status) as any}
                          />
                        )}
                      </Stack>

                      {item.tags.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                          {item.tags.slice(0, 3).map((tag) => (
                            <Chip key={tag} label={tag} size="small" />
                          ))}
                          {item.tags.length > 3 && (
                            <Chip label={`+${item.tags.length - 3}`} size="small" />
                          )}
                        </Box>
                      )}
                    </Box>

                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlan(isTemplate ? null : plan);
                        setActionMenuAnchor(e.currentTarget);
                      }}
                    >
                      <MoreIcon />
                    </IconButton>
                  </Stack>

                  {!isTemplate && (
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 'auto' }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {plan.collaborators.length > 0 && (
                          <Tooltip title={`${plan.collaborators.length} collaborators`}>
                            <Badge badgeContent={plan.collaborators.length} color="primary">
                              <CollabIcon fontSize="small" />
                            </Badge>
                          </Tooltip>
                        )}
                        
                        {plan.version > 1 && (
                          <Tooltip title={`Version ${plan.version}`}>
                            <Badge badgeContent={plan.version} color="secondary">
                              <HistoryIcon fontSize="small" />
                            </Badge>
                          </Tooltip>
                        )}
                      </Stack>

                      <Typography variant="caption" color="text.secondary">
                        Updated {new Date(plan.updatedAt).toLocaleDateString()}
                      </Typography>
                    </Stack>
                  )}

                  {isTemplate && (
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 'auto' }}>
                      <Typography variant="caption" color="text.secondary">
                        Used {template.usageCount} times
                      </Typography>
                      
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="caption">★</Typography>
                        <Typography variant="caption">{template.rating.toFixed(1)}</Typography>
                      </Stack>
                    </Stack>
                  )}
                </CardContent>

                <CardActions>
                  {isTemplate ? (
                    <Button 
                      size="small" 
                      variant="contained"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateFromTemplate(template.id);
                      }}
                    >
                      Use Template
                    </Button>
                  ) : (
                    <Stack direction="row" spacing={1}>
                      <Button 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditPlan(plan.id);
                        }}
                        startIcon={<EditIcon />}
                      >
                        Edit
                      </Button>
                      
                      <Button 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicatePlan(plan.id, plan.name);
                        }}
                        startIcon={<CopyIcon />}
                      >
                        Duplicate
                      </Button>
                    </Stack>
                  )}
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {filteredItems.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No {mode} found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {searchQuery ? 'Try adjusting your search terms or filters' : `Get started by creating your first ${mode.slice(0, -1)}`}
          </Typography>
          
          {mode === 'library' && !searchQuery && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreatePlan}
            >
              Create Your First Plan
            </Button>
          )}
        </Box>
      )}

      {/* Floating Action Button for Templates */}
      {mode === 'templates' && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={handleCreatePlan}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={() => setActionMenuAnchor(null)}
      >
        {selectedPlan && (
          [
            <MenuItem key="edit" onClick={() => handleEditPlan(selectedPlan.id)}>
              <EditIcon sx={{ mr: 1 }} /> Edit
            </MenuItem>,
            <MenuItem key="duplicate" onClick={() => handleDuplicatePlan(selectedPlan.id, selectedPlan.name)}>
              <CopyIcon sx={{ mr: 1 }} /> Duplicate
            </MenuItem>,
            <MenuItem key="export" onClick={() => handleExportPlan(selectedPlan.id, selectedPlan.name)}>
              <ExportIcon sx={{ mr: 1 }} /> Export
            </MenuItem>,
            <MenuItem key="share" onClick={() => {}}>
              <ShareIcon sx={{ mr: 1 }} /> Share
            </MenuItem>,
            <Divider key="divider" />,
            <MenuItem 
              key="delete" 
              onClick={() => setShowDeleteDialog(true)}
              sx={{ color: 'error.main' }}
            >
              <DeleteIcon sx={{ mr: 1 }} /> Delete
            </MenuItem>,
          ]
        )}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Delete Plan</DialogTitle>
        <DialogContent>
          Are you sure you want to delete "{selectedPlan?.name}"? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button 
            onClick={() => selectedPlan && handleDeletePlan(selectedPlan.id)}
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Actions Dialog */}
      <Dialog open={showBulkActions} onClose={() => setShowBulkActions(false)}>
        <DialogTitle>Bulk Actions</DialogTitle>
        <DialogContent>
          <Typography>
            What would you like to do with the {selectedPlans.length} selected plans?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBulkActions(false)}>Cancel</Button>
          <Button onClick={handleBulkDelete} color="error">
            Delete All
          </Button>
        </DialogActions>
      </Dialog>

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

export default PlanLibrary;
