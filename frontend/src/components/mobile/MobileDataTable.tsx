import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Paper,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  useTheme,
  useMediaQuery,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Avatar,
  Button,
  Menu,
  MenuItem,
  Skeleton,
  Alert,
  SwipeableDrawer,
  Drawer,
  Tabs,
  Tab,
  FormControl,
  Select,
  InputLabel
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  ViewList as TableViewIcon,
  ViewModule as CardViewIcon,
  MoreVert as MoreIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  SwipeLeft as SwipeLeftIcon,
  SwipeRight as SwipeRightIcon
} from '@mui/icons-material';

interface Column {
  id: string;
  label: string;
  numeric?: boolean;
  format?: (value: any) => string;
  sortable?: boolean;
  filterable?: boolean;
  mobileHidden?: boolean;
  mobileHeader?: boolean;
  icon?: React.ReactNode;
  width?: number | string;
}

interface MobileDataTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  title?: string;
  searchable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  pagination?: boolean;
  rowsPerPageOptions?: number[];
  defaultRowsPerPage?: number;
  emptyMessage?: string;
  onRowClick?: (row: any, index: number) => void;
  onRowSwipe?: (row: any, index: number, direction: 'left' | 'right') => void;
  swipeActions?: {
    left?: { icon: React.ReactNode; label: string; action: (row: any) => void; color?: string; };
    right?: { icon: React.ReactNode; label: string; action: (row: any) => void; color?: string; };
  };
  mobileCardActions?: Array<{ icon: React.ReactNode; label: string; action: (row: any) => void; }>;
  groupBy?: string;
  stickyHeader?: boolean;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface FilterConfig {
  [key: string]: string | number | boolean;
}

const MobileDataTable: React.FC<MobileDataTableProps> = ({
  columns,
  data,
  loading = false,
  title,
  searchable = true,
  sortable = true,
  filterable = true,
  pagination = true,
  rowsPerPageOptions = [10, 25, 50],
  defaultRowsPerPage = 10,
  emptyMessage = "No data available",
  onRowClick,
  onRowSwipe,
  swipeActions,
  mobileCardActions,
  groupBy,
  stickyHeader = true
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));

  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filters, setFilters] = useState<FilterConfig>({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [swipingRow, setSwipingRow] = useState<{ index: number; direction: 'left' | 'right' | null; progress: number; }>({ index: -1, direction: null, progress: 0 });

  // Automatically switch to cards on mobile
  useEffect(() => {
    setViewMode(isMobile ? 'cards' : 'table');
  }, [isMobile]);

  // Filter and search data
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Apply search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(row =>
        columns.some(col => {
          const value = row[col.id];
          return String(value).toLowerCase().includes(searchLower);
        })
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        filtered = filtered.filter(row => {
          const rowValue = row[key];
          if (typeof value === 'boolean') {
            return Boolean(rowValue) === value;
          }
          return String(rowValue).toLowerCase().includes(String(value).toLowerCase());
        });
      }
    });

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        
        if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, filters, sortConfig, columns]);

  // Group data if groupBy is specified
  const groupedData = useMemo(() => {
    if (!groupBy) return { '': filteredData };
    
    return filteredData.reduce((groups: { [key: string]: any[] }, row) => {
      const groupKey = row[groupBy] || 'Other';
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(row);
      return groups;
    }, {});
  }, [filteredData, groupBy]);

  // Paginated data
  const paginatedData = useMemo(() => {
    if (!pagination) return filteredData;
    const startIndex = page * rowsPerPage;
    return filteredData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredData, page, rowsPerPage, pagination]);

  const handleSort = (column: Column) => {
    if (!sortable || !column.sortable) return;
    
    setSortConfig(prevSort => {
      if (prevSort?.key === column.id) {
        return prevSort.direction === 'asc' 
          ? { key: column.id, direction: 'desc' }
          : null;
      }
      return { key: column.id, direction: 'asc' };
    });
  };

  const handleFilterChange = (columnId: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [columnId]: value
    }));
    setPage(0);
  };

  const toggleRowExpansion = (index: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleSwipeStart = (index: number, event: React.TouchEvent) => {
    if (!swipeActions || !isMobile) return;
    
    const touch = event.touches[0];
    setSwipingRow({
      index,
      direction: null,
      progress: 0
    });
  };

  const handleSwipeMove = (index: number, event: React.TouchEvent) => {
    if (swipingRow.index !== index) return;
    
    const touch = event.touches[0];
    const startX = touch.clientX;
    const progress = Math.abs(startX) / 100;
    const direction = startX > 50 ? 'right' : startX < -50 ? 'left' : null;
    
    setSwipingRow({
      index,
      direction,
      progress: Math.min(progress, 1)
    });
  };

  const handleSwipeEnd = (index: number, row: any) => {
    if (swipingRow.progress > 0.5 && swipingRow.direction) {
      onRowSwipe?.(row, index, swipingRow.direction);
    }
    setSwipingRow({ index: -1, direction: null, progress: 0 });
  };

  // Render loading skeleton
  const renderSkeleton = () => (
    <Box>
      {Array.from({ length: 5 }).map((_, index) => (
        <Card key={index} sx={{ marginBottom: 1 }}>
          <CardContent>
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="text" width="40%" height={20} />
            <Skeleton variant="text" width="80%" height={20} />
          </CardContent>
        </Card>
      ))}
    </Box>
  );

  // Render mobile card view
  const renderCardView = () => {
    const dataToRender = pagination ? paginatedData : filteredData;
    
    if (groupBy) {
      return Object.entries(groupedData).map(([groupName, groupRows]) => (
        <Box key={groupName} sx={{ marginBottom: 3 }}>
          <Typography variant="h6" gutterBottom color="primary">
            {groupName} ({groupRows.length})
          </Typography>
          {groupRows.map((row, index) => renderMobileCard(row, index))}
        </Box>
      ));
    }

    return dataToRender.map((row, index) => renderMobileCard(row, index));
  };

  const renderMobileCard = (row: any, index: number) => {
    const isExpanded = expandedRows.has(index);
    const primaryColumn = columns.find(col => col.mobileHeader) || columns[0];
    const secondaryColumns = columns.filter(col => !col.mobileHidden && col.id !== primaryColumn.id);
    const hiddenColumns = columns.filter(col => col.mobileHidden);

    return (
      <Card
        key={index}
        sx={{
          marginBottom: 2,
          cursor: onRowClick ? 'pointer' : 'default',
          transform: swipingRow.index === index ? `translateX(${swipingRow.progress * 50}px)` : 'none',
          transition: swipingRow.index === index ? 'none' : 'transform 0.2s ease',
          position: 'relative',
          overflow: 'hidden',
          '&:hover': onRowClick ? {
            backgroundColor: theme.palette.action.hover,
            boxShadow: theme.shadows[4]
          } : {}
        }}
        onClick={() => onRowClick?.(row, index)}
        onTouchStart={(e) => handleSwipeStart(index, e)}
        onTouchMove={(e) => handleSwipeMove(index, e)}
        onTouchEnd={() => handleSwipeEnd(index, row)}
      >
        {/* Swipe Actions Background */}
        {swipeActions && swipingRow.index === index && swipingRow.direction && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: swipingRow.direction === 'right' ? 0 : 'auto',
              right: swipingRow.direction === 'left' ? 0 : 'auto',
              width: `${swipingRow.progress * 100}%`,
              height: '100%',
              backgroundColor: swipingRow.direction === 'left' 
                ? swipeActions.left?.color || theme.palette.error.main
                : swipeActions.right?.color || theme.palette.success.main,
              display: 'flex',
              alignItems: 'center',
              justifyContent: swipingRow.direction === 'left' ? 'flex-end' : 'flex-start',
              padding: 2,
              color: 'white'
            }}
          >
            {swipingRow.direction === 'left' ? swipeActions.left?.icon : swipeActions.right?.icon}
          </Box>
        )}

        <CardContent>
          {/* Primary Info */}
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" marginBottom={1}>
            <Box flex={1}>
              <Typography variant="h6" component="div" noWrap>
                {primaryColumn.format 
                  ? primaryColumn.format(row[primaryColumn.id])
                  : row[primaryColumn.id]
                }
              </Typography>
              {secondaryColumns.slice(0, 2).map((col) => (
                <Typography key={col.id} variant="body2" color="text.secondary" noWrap>
                  {col.format ? col.format(row[col.id]) : row[col.id]}
                </Typography>
              ))}
            </Box>

            {/* Card Actions */}
            <Box display="flex" gap={1}>
              {hiddenColumns.length > 0 && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRowExpansion(index);
                  }}
                >
                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              )}
              
              {mobileCardActions && (
                <IconButton size="small">
                  <MoreIcon />
                </IconButton>
              )}
            </Box>
          </Box>

          {/* Quick Stats */}
          <Box display="flex" gap={1} marginBottom={1}>
            {secondaryColumns.slice(2, 5).map((col) => {
              const value = row[col.id];
              return (
                <Chip
                  key={col.id}
                  size="small"
                  icon={col.icon}
                  label={col.format ? col.format(value) : value}
                  variant="outlined"
                />
              );
            })}
          </Box>

          {/* Expandable Details */}
          <Collapse in={isExpanded}>
            <Divider sx={{ marginY: 1 }} />
            <List dense>
              {hiddenColumns.map((col) => (
                <ListItem key={col.id} disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {col.icon || <PersonIcon fontSize="small" />}
                  </ListItemIcon>
                  <ListItemText
                    primary={col.label}
                    secondary={col.format ? col.format(row[col.id]) : row[col.id]}
                  />
                </ListItem>
              ))}
            </List>
          </Collapse>
        </CardContent>
      </Card>
    );
  };

  // Render desktop table view
  const renderTableView = () => (
    <TableContainer component={Paper} sx={{ maxHeight: '70vh' }}>
      <Table stickyHeader={stickyHeader}>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.id}
                align={column.numeric ? 'right' : 'left'}
                style={{ minWidth: column.width }}
              >
                {sortable && column.sortable ? (
                  <TableSortLabel
                    active={sortConfig?.key === column.id}
                    direction={sortConfig?.key === column.id ? sortConfig.direction : 'asc'}
                    onClick={() => handleSort(column)}
                  >
                    {column.label}
                  </TableSortLabel>
                ) : (
                  column.label
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {(pagination ? paginatedData : filteredData).map((row, index) => (
            <TableRow
              key={index}
              hover
              onClick={() => onRowClick?.(row, index)}
              sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              {columns.map((column) => (
                <TableCell key={column.id} align={column.numeric ? 'right' : 'left'}>
                  {column.format ? column.format(row[column.id]) : row[column.id]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  if (loading) {
    return renderSkeleton();
  }

  if (data.length === 0) {
    return (
      <Alert severity="info" sx={{ margin: 2 }}>
        {emptyMessage}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={2}>
        {title && (
          <Typography variant="h6" component="div">
            {title} ({filteredData.length})
          </Typography>
        )}
        
        <Box display="flex" gap={1}>
          {/* Search */}
          {searchable && (
            <TextField
              size="small"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
              sx={{ width: isMobile ? 150 : 200 }}
            />
          )}

          {/* Filters */}
          {filterable && (
            <IconButton onClick={() => setFilterDrawerOpen(true)}>
              <FilterIcon />
            </IconButton>
          )}

          {/* View Mode Toggle */}
          {!isMobile && (
            <Box>
              <IconButton
                color={viewMode === 'table' ? 'primary' : 'default'}
                onClick={() => setViewMode('table')}
              >
                <TableViewIcon />
              </IconButton>
              <IconButton
                color={viewMode === 'cards' ? 'primary' : 'default'}
                onClick={() => setViewMode('cards')}
              >
                <CardViewIcon />
              </IconButton>
            </Box>
          )}
        </Box>
      </Box>

      {/* Swipe Instructions */}
      {isMobile && swipeActions && (
        <Alert severity="info" sx={{ marginBottom: 2 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <SwipeLeftIcon fontSize="small" />
            <Typography variant="body2">
              Swipe left or right on cards for quick actions
            </Typography>
            <SwipeRightIcon fontSize="small" />
          </Box>
        </Alert>
      )}

      {/* Content */}
      {viewMode === 'cards' ? renderCardView() : renderTableView()}

      {/* Pagination */}
      {pagination && (
        <TablePagination
          rowsPerPageOptions={rowsPerPageOptions}
          component="div"
          count={filteredData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      )}

      {/* Filter Drawer */}
      <SwipeableDrawer
        anchor="bottom"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        onOpen={() => setFilterDrawerOpen(true)}
      >
        <Box sx={{ padding: 2, minHeight: 200 }}>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          {columns.filter(col => col.filterable).map((column) => (
            <TextField
              key={column.id}
              fullWidth
              margin="dense"
              label={column.label}
              value={filters[column.id] || ''}
              onChange={(e) => handleFilterChange(column.id, e.target.value)}
            />
          ))}
          <Box display="flex" justifyContent="flex-end" gap={1} marginTop={2}>
            <Button onClick={() => {
              setFilters({});
              setFilterDrawerOpen(false);
            }}>
              Clear
            </Button>
            <Button
              variant="contained"
              onClick={() => setFilterDrawerOpen(false)}
            >
              Apply
            </Button>
          </Box>
        </Box>
      </SwipeableDrawer>
    </Box>
  );
};

export default MobileDataTable;