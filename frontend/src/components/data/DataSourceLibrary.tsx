import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tooltip,
  Grid,
  Divider
} from '@mui/material';
import {
  Search,
  FilterList,
  Sort,
  MoreVert,
  Upload,
  Refresh,
  Delete,
  Edit,
  Visibility,
  GetApp,
  Schedule,
  Assessment,
  CheckCircle,
  Warning,
  DataUsage,
  TrendingUp,
  CalendarToday,
  Person,
  Storage
} from '@mui/icons-material';
import { PersonaLayout } from '../common/PersonaLayout';
import { RoleGuard } from '../common/RoleGuard';
import { useUser } from '../../contexts/UserContext';
import { useTenant } from '../../contexts/TenantContext';
import { formatDistanceToNow, format } from 'date-fns';

// Data source interfaces
export interface DataSource {
  id: string;
  name: string;
  description: string;
  uploadId: string;
  columnMapping: Record<string, string>;
  mappingPresetId?: string;
  mappingPresetName?: string;
  status: 'active' | 'archived' | 'processing' | 'error';
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
  createdBy: string;
  tenantId: string;
  
  // File information
  fileInfo: {
    originalName: string;
    size: number;
    type: string;
    rowCount: number;
    columnCount: number;
  };
  
  // Usage statistics
  stats: {
    calculationsRun: number;
    lastCalculationAt?: Date;
    averageProcessingTime: number;
    successRate: number;
    totalProcessed: number;
  };
  
  // Data quality metrics
  quality: {
    score: number; // 0-100
    issues: DataQualityIssue[];
    completeness: number;
    accuracy: number;
    consistency: number;
  };
  
  tags: string[];
}

export interface DataQualityIssue {
  type: 'missing_values' | 'invalid_format' | 'duplicate_records' | 'outliers' | 'inconsistent_data';
  severity: 'low' | 'medium' | 'high' | 'critical';
  column?: string;
  count: number;
  message: string;
  suggestion?: string;
}

// Filter and sort options
export type SortOption = 'name' | 'created' | 'lastUsed' | 'size' | 'quality' | 'usage';
export type FilterOption = 'all' | 'active' | 'archived' | 'recent' | 'high-quality' | 'frequently-used';

interface DataSourceLibraryProps {
  onDataSourceSelect?: (dataSource: DataSource) => void;
  selectionMode?: boolean;
  showActions?: boolean;
}

export const DataSourceLibrary: React.FC<DataSourceLibraryProps> = ({
  onDataSourceSelect,
  selectionMode = false,
  showActions = true
}) => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { currentTenant } = useTenant();
  
  // State management
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [filteredDataSources, setFilteredDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // UI state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  // Mock data - in real app, this would come from API
  useEffect(() => {
    const loadDataSources = async () => {
      setLoading(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data sources
      const mockDataSources: DataSource[] = [
        {
          id: 'ds_001',
          name: 'Q1 2024 Employee Data',
          description: 'Quarterly employee data with performance metrics and salary information',
          uploadId: 'upload_001',
          columnMapping: {
            'Employee Name': 'employee_name',
            'Base Salary': 'base_salary',
            'Department': 'department',
            'Performance Rating': 'performance_rating'
          },
          mappingPresetId: 'preset_standard',
          mappingPresetName: 'Standard Employee Mapping',
          status: 'active',
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-20'),
          lastUsedAt: new Date('2024-01-25'),
          createdBy: user?.name || 'John Doe',
          tenantId: currentTenant?.id || 'default',
          fileInfo: {
            originalName: 'employee_data_q1_2024.csv',
            size: 245760,
            type: 'text/csv',
            rowCount: 1250,
            columnCount: 8
          },
          stats: {
            calculationsRun: 15,
            lastCalculationAt: new Date('2024-01-25'),
            averageProcessingTime: 45000,
            successRate: 98.2,
            totalProcessed: 18750
          },
          quality: {
            score: 94,
            issues: [
              {
                type: 'missing_values',
                severity: 'low',
                column: 'Middle Name',
                count: 3,
                message: '3 records have missing middle names',
                suggestion: 'Consider making middle name optional or provide default values'
              }
            ],
            completeness: 99.8,
            accuracy: 95.5,
            consistency: 92.0
          },
          tags: ['quarterly', 'performance', 'complete']
        },
        {
          id: 'ds_002',
          name: 'December Bonus Run',
          description: 'Year-end bonus calculation data including special awards',
          uploadId: 'upload_002',
          columnMapping: {
            'EmpID': 'employee_id',
            'Full Name': 'employee_name',
            'Annual Salary': 'base_salary',
            'Bonus Percentage': 'bonus_percentage'
          },
          status: 'active',
          createdAt: new Date('2023-12-01'),
          updatedAt: new Date('2023-12-15'),
          lastUsedAt: new Date('2023-12-20'),
          createdBy: user?.name || 'Jane Smith',
          tenantId: currentTenant?.id || 'default',
          fileInfo: {
            originalName: 'december_bonus_2023.xlsx',
            size: 156800,
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            rowCount: 890,
            columnCount: 12
          },
          stats: {
            calculationsRun: 8,
            lastCalculationAt: new Date('2023-12-20'),
            averageProcessingTime: 32000,
            successRate: 100,
            totalProcessed: 7120
          },
          quality: {
            score: 87,
            issues: [
              {
                type: 'outliers',
                severity: 'medium',
                column: 'Bonus Percentage',
                count: 12,
                message: '12 records have unusually high bonus percentages',
                suggestion: 'Review bonus percentages above 50% for accuracy'
              },
              {
                type: 'inconsistent_data',
                severity: 'low',
                column: 'Department',
                count: 5,
                message: 'Department names have inconsistent formatting',
                suggestion: 'Standardize department naming convention'
              }
            ],
            completeness: 98.5,
            accuracy: 91.2,
            consistency: 82.1
          },
          tags: ['year-end', 'bonus', 'complete']
        },
        {
          id: 'ds_003',
          name: 'New Hire Batch - Jan 2024',
          description: 'New employee onboarding data for January 2024',
          uploadId: 'upload_003',
          columnMapping: {
            'Name': 'employee_name',
            'Department': 'department',
            'Start Date': 'hire_date',
            'Starting Salary': 'base_salary'
          },
          status: 'processing',
          createdAt: new Date('2024-01-30'),
          updatedAt: new Date('2024-01-30'),
          createdBy: user?.name || 'Mike Johnson',
          tenantId: currentTenant?.id || 'default',
          fileInfo: {
            originalName: 'new_hires_jan_2024.csv',
            size: 45120,
            type: 'text/csv',
            rowCount: 45,
            columnCount: 6
          },
          stats: {
            calculationsRun: 0,
            averageProcessingTime: 0,
            successRate: 0,
            totalProcessed: 0
          },
          quality: {
            score: 0,
            issues: [],
            completeness: 0,
            accuracy: 0,
            consistency: 0
          },
          tags: ['new-hires', 'january', 'processing']
        }
      ];
      
      setDataSources(mockDataSources);
      setLoading(false);
    };
    
    loadDataSources();
  }, [user, currentTenant]);
  
  // Filter and search logic
  useEffect(() => {
    let filtered = [...dataSources];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ds => 
        ds.name.toLowerCase().includes(query) ||
        ds.description.toLowerCase().includes(query) ||
        ds.fileInfo.originalName.toLowerCase().includes(query) ||
        ds.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Apply category filter
    switch (selectedFilter) {
      case 'active':
        filtered = filtered.filter(ds => ds.status === 'active');
        break;
      case 'archived':
        filtered = filtered.filter(ds => ds.status === 'archived');
        break;
      case 'recent':
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(ds => ds.createdAt > thirtyDaysAgo);
        break;
      case 'high-quality':
        filtered = filtered.filter(ds => ds.quality.score >= 90);
        break;
      case 'frequently-used':
        filtered = filtered.filter(ds => ds.stats.calculationsRun >= 5);
        break;
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'created':
          aVal = a.createdAt.getTime();
          bVal = b.createdAt.getTime();
          break;
        case 'lastUsed':
          aVal = a.lastUsedAt?.getTime() || 0;
          bVal = b.lastUsedAt?.getTime() || 0;
          break;
        case 'size':
          aVal = a.fileInfo.size;
          bVal = b.fileInfo.size;
          break;
        case 'quality':
          aVal = a.quality.score;
          bVal = b.quality.score;
          break;
        case 'usage':
          aVal = a.stats.calculationsRun;
          bVal = b.stats.calculationsRun;
          break;
        default:
          aVal = a.createdAt.getTime();
          bVal = b.createdAt.getTime();
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    
    setFilteredDataSources(filtered);
  }, [dataSources, searchQuery, selectedFilter, sortBy, sortOrder]);
  
  // Utility functions
  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };
  
  const getStatusColor = (status: DataSource['status']) => {
    switch (status) {
      case 'active': return 'success';
      case 'processing': return 'warning';
      case 'error': return 'error';
      case 'archived': return 'default';
      default: return 'default';
    }
  };
  
  const getQualityColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };
  
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, dataSource: DataSource) => {
    setAnchorEl(event.currentTarget);
    setSelectedDataSource(dataSource);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDataSource(null);
  };
  
  const handleUseDataSource = (dataSource: DataSource) => {
    if (onDataSourceSelect) {
      onDataSourceSelect(dataSource);
    } else {
      navigate('/batch', { 
        state: { 
          reuseDataSource: dataSource,
          presetMapping: dataSource.columnMapping 
        } 
      });
    }
    handleMenuClose();
  };
  
  const handleViewDetails = (dataSource: DataSource) => {
    setSelectedDataSource(dataSource);
    setDetailsDialogOpen(true);
    handleMenuClose();
  };
  
  const handleDelete = () => {
    if (selectedDataSource) {
      // In real app, make API call to delete
      setDataSources(prev => prev.filter(ds => ds.id !== selectedDataSource.id));
      setDeleteDialogOpen(false);
      setSelectedDataSource(null);
    }
    handleMenuClose();
  };

  if (loading) {
    return (
      <PersonaLayout title="Data Source Library">
        <Box className="flex items-center justify-center h-64">
          <Typography>Loading data sources...</Typography>
        </Box>
      </PersonaLayout>
    );
  }

  return (
    <PersonaLayout
      title="Data Source Library"
      breadcrumbs={[
        { label: 'Data Hub', path: '/batch' },
        { label: 'Data Sources', path: '/data-sources' }
      ]}
      actions={
        <div className="flex items-center space-x-2">
          <Button
            variant="contained"
            startIcon={<Upload />}
            onClick={() => navigate('/batch')}
          >
            New Upload
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Summary Statistics */}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box className="flex items-center">
                  <Storage className="w-8 h-8 text-blue-500 mr-3" />
                  <div>
                    <Typography variant="h4" component="div">
                      {dataSources.length}
                    </Typography>
                    <Typography color="text.secondary">
                      Total Sources
                    </Typography>
                  </div>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box className="flex items-center">
                  <DataUsage className="w-8 h-8 text-green-500 mr-3" />
                  <div>
                    <Typography variant="h4" component="div">
                      {dataSources.reduce((sum, ds) => sum + ds.fileInfo.rowCount, 0).toLocaleString()}
                    </Typography>
                    <Typography color="text.secondary">
                      Total Records
                    </Typography>
                  </div>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box className="flex items-center">
                  <Assessment className="w-8 h-8 text-purple-500 mr-3" />
                  <div>
                    <Typography variant="h4" component="div">
                      {Math.round(dataSources.reduce((sum, ds) => sum + ds.quality.score, 0) / dataSources.length)}%
                    </Typography>
                    <Typography color="text.secondary">
                      Avg. Quality
                    </Typography>
                  </div>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box className="flex items-center">
                  <TrendingUp className="w-8 h-8 text-orange-500 mr-3" />
                  <div>
                    <Typography variant="h4" component="div">
                      {dataSources.reduce((sum, ds) => sum + ds.stats.calculationsRun, 0)}
                    </Typography>
                    <Typography color="text.secondary">
                      Total Calculations
                    </Typography>
                  </div>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Search and Filter Bar */}
        <Card>
          <CardContent>
            <Box className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <TextField
                placeholder="Search data sources..."
                variant="outlined"
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                className="flex-1 max-w-md"
              />
              
              <div className="flex items-center space-x-2">
                <Button
                  variant={selectedFilter === 'all' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setSelectedFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={selectedFilter === 'recent' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setSelectedFilter('recent')}
                >
                  Recent
                </Button>
                <Button
                  variant={selectedFilter === 'high-quality' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setSelectedFilter('high-quality')}
                >
                  High Quality
                </Button>
                <Button
                  variant={selectedFilter === 'frequently-used' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setSelectedFilter('frequently-used')}
                >
                  Popular
                </Button>
              </div>
            </Box>
          </CardContent>
        </Card>

        {/* Data Sources Grid */}
        <Grid container spacing={3}>
          {filteredDataSources.map((dataSource) => (
            <Grid item xs={12} lg={6} key={dataSource.id}>
              <Card 
                className={`transition-all duration-200 hover:shadow-lg ${
                  selectionMode ? 'cursor-pointer hover:border-blue-500' : ''
                }`}
                onClick={() => selectionMode && onDataSourceSelect?.(dataSource)}
              >
                <CardContent>
                  {/* Header */}
                  <Box className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <Typography variant="h6" component="div" className="font-semibold">
                        {dataSource.name}
                      </Typography>
                      <Typography color="text.secondary" variant="body2" className="mt-1">
                        {dataSource.description}
                      </Typography>
                    </div>
                    
                    {showActions && (
                      <div className="flex items-center space-x-1">
                        <Chip
                          label={dataSource.status}
                          color={getStatusColor(dataSource.status) as any}
                          size="small"
                        />
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuClick(e, dataSource)}
                        >
                          <MoreVert />
                        </IconButton>
                      </div>
                    )}
                  </Box>
                  
                  {/* File Info */}
                  <Box className="flex items-center space-x-4 mb-3 text-sm text-gray-600">
                    <span>{dataSource.fileInfo.originalName}</span>
                    <span>•</span>
                    <span>{formatFileSize(dataSource.fileInfo.size)}</span>
                    <span>•</span>
                    <span>{dataSource.fileInfo.rowCount.toLocaleString()} rows</span>
                  </Box>
                  
                  {/* Quality and Usage Metrics */}
                  <Grid container spacing={2} className="mb-3">
                    <Grid item xs={6}>
                      <Box className="flex items-center">
                        <Typography variant="body2" color="text.secondary">
                          Quality Score:
                        </Typography>
                        <Chip
                          label={`${dataSource.quality.score}%`}
                          color={getQualityColor(dataSource.quality.score) as any}
                          size="small"
                          className="ml-2"
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box className="flex items-center">
                        <Typography variant="body2" color="text.secondary">
                          Usage:
                        </Typography>
                        <Typography variant="body2" className="ml-2 font-medium">
                          {dataSource.stats.calculationsRun} runs
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  
                  {/* Tags */}
                  <Box className="flex flex-wrap gap-1 mb-3">
                    {dataSource.tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                  
                  {/* Timestamps */}
                  <Box className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      Created {formatDistanceToNow(dataSource.createdAt, { addSuffix: true })}
                    </span>
                    {dataSource.lastUsedAt && (
                      <span>
                        Last used {formatDistanceToNow(dataSource.lastUsedAt, { addSuffix: true })}
                      </span>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        
        {filteredDataSources.length === 0 && (
          <Box className="text-center py-12">
            <DataUsage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <Typography variant="h6" color="text.secondary">
              No data sources found
            </Typography>
            <Typography color="text.secondary" className="mb-4">
              {searchQuery ? 'Try adjusting your search criteria' : 'Upload your first data file to get started'}
            </Typography>
            <Button
              variant="contained"
              startIcon={<Upload />}
              onClick={() => navigate('/batch?browse=1')}
            >
              Upload Data
            </Button>
          </Box>
        )}
      </div>
      
      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedDataSource && handleUseDataSource(selectedDataSource)}>
          <Upload className="mr-2 w-4 h-4" />
          Use This Mapping
        </MenuItem>
        <MenuItem onClick={() => selectedDataSource && handleViewDetails(selectedDataSource)}>
          <Visibility className="mr-2 w-4 h-4" />
          View Details
        </MenuItem>
        <MenuItem onClick={() => selectedDataSource && navigate(`/batch/${selectedDataSource.uploadId}/results`)}>
          <Assessment className="mr-2 w-4 h-4" />
          View Results
        </MenuItem>
        <Divider />
        <RoleGuard require={{ type: 'role', roles: ['admin'] }} fallback="hide">
          <MenuItem onClick={() => setDeleteDialogOpen(true)} className="text-red-600">
            <Delete className="mr-2 w-4 h-4" />
            Delete
          </MenuItem>
        </RoleGuard>
      </Menu>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Data Source</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedDataSource?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </PersonaLayout>
  );
};

export default DataSourceLibrary;
