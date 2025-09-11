import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Collapse,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Alert,
  Divider,
  Avatar,
  Tooltip,
  LinearProgress,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import {
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon,
  TrendingUp as OpportunityIcon,
  Speed as PerformanceIcon,
  Security as ComplianceIcon,
  Error as RiskIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Lightbulb as LightbulbIcon,
  PlayArrow as ActionIcon,
  Star as StarIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { ExecutiveInsight } from '../../services/executiveDashboardService';

interface ExecutiveInsightPanelProps {
  insights: ExecutiveInsight[];
  maxDisplayCount?: number;
  showFilters?: boolean;
  onInsightAction?: (action: string, insightId: string) => void;
  onViewAll?: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
  </div>
);

export const ExecutiveInsightPanel: React.FC<ExecutiveInsightPanelProps> = ({
  insights,
  maxDisplayCount = 5,
  showFilters = true,
  onInsightAction,
  onViewAll
}) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedInsight, setSelectedInsight] = useState<ExecutiveInsight | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterUrgency, setFilterUrgency] = useState<string>('all');

  // Filter and categorize insights
  const filteredInsights = useMemo(() => {
    return insights.filter(insight => {
      if (filterCategory !== 'all' && insight.category !== filterCategory) return false;
      if (filterUrgency !== 'all' && insight.urgency !== filterUrgency) return false;
      return true;
    });
  }, [insights, filterCategory, filterUrgency]);

  const categorizedInsights = useMemo(() => {
    const categories = {
      opportunity: filteredInsights.filter(i => i.category === 'opportunity'),
      risk: filteredInsights.filter(i => i.category === 'risk'),
      performance: filteredInsights.filter(i => i.category === 'performance'),
      compliance: filteredInsights.filter(i => i.category === 'compliance')
    };
    return categories;
  }, [filteredInsights]);

  const urgencyPrioritizedInsights = useMemo(() => {
    const urgencyOrder = { immediate: 3, 'short-term': 2, 'long-term': 1 };
    return [...filteredInsights].sort((a, b) => {
      const urgencyDiff = urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;
      
      // Secondary sort by impact
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    });
  }, [filteredInsights]);

  // Utility functions
  const getImpactColor = (impact: string): 'error' | 'warning' | 'info' => {
    switch (impact) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      default: return 'info';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'immediate': return <WarningIcon color="error" />;
      case 'short-term': return <ScheduleIcon color="warning" />;
      default: return <InfoIcon color="info" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'opportunity': return <OpportunityIcon color="success" />;
      case 'risk': return <RiskIcon color="error" />;
      case 'performance': return <PerformanceIcon color="primary" />;
      case 'compliance': return <ComplianceIcon color="info" />;
      default: return <InfoIcon />;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      opportunity: '#2e7d32',
      risk: '#d32f2f',
      performance: '#1976d2',
      compliance: '#7b1fa2'
    };
    return colors[category as keyof typeof colors] || '#666';
  };

  const handleInsightAction = (action: string, insightId: string) => {
    if (onInsightAction) {
      onInsightAction(action, insightId);
    }
  };

  const toggleExpanded = (insightId: string) => {
    const newExpanded = new Set(expandedInsights);
    if (newExpanded.has(insightId)) {
      newExpanded.delete(insightId);
    } else {
      newExpanded.add(insightId);
    }
    setExpandedInsights(newExpanded);
  };

  const openDetails = (insight: ExecutiveInsight) => {
    setSelectedInsight(insight);
    setDetailsOpen(true);
  };

  const renderInsightCard = (insight: ExecutiveInsight, index: number) => {
    const isExpanded = expandedInsights.has(insight.id);
    
    return (
      <Card 
        key={insight.id} 
        sx={{ 
          mb: 2, 
          position: 'relative',
          '&:hover': { boxShadow: 3 },
          border: `2px solid ${getCategoryColor(insight.category)}20`
        }}
      >
        {/* Category Indicator */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            bgcolor: getCategoryColor(insight.category)
          }}
        />

        <CardContent sx={{ pt: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flex: 1, mr: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {getCategoryIcon(insight.category)}
                <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
                  {insight.title}
                </Typography>
                {index < 3 && (
                  <Chip 
                    icon={<StarIcon />}
                    label="Priority"
                    color="warning"
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
              <Typography variant="body2" color="textSecondary">
                {new Date(insight.createdAt).toLocaleDateString()}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip 
                  label={insight.impact} 
                  color={getImpactColor(insight.impact)}
                  size="small"
                />
                <Chip 
                  label={insight.category}
                  variant="outlined"
                  size="small"
                  sx={{ color: getCategoryColor(insight.category) }}
                />
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getUrgencyIcon(insight.urgency)}
                <Typography variant="caption" color="textSecondary">
                  {insight.urgency}
                </Typography>
                <Tooltip title="Confidence Level">
                  <Chip 
                    label={`${(insight.confidence * 100).toFixed(0)}%`}
                    variant="outlined"
                    size="small"
                  />
                </Tooltip>
              </Box>
            </Box>
          </Box>

          {/* Description */}
          <Typography variant="body1" paragraph>
            {insight.description}
          </Typography>

          {/* Data Support Visualization */}
          {insight.dataSupport && Object.keys(insight.dataSupport.metrics || {}).length > 0 && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Supporting Data
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(insight.dataSupport.metrics).map(([key, value]) => (
                  <Grid item xs={6} sm={3} key={key}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" color="primary">
                        {typeof value === 'number' ? value.toLocaleString() : value}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Quick Recommendations */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>
              Recommendations ({insight.recommendations.length})
            </Typography>
            <IconButton
              size="small"
              onClick={() => toggleExpanded(insight.id)}
              sx={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}
            >
              <ExpandMoreIcon />
            </IconButton>
          </Box>

          <Collapse in={isExpanded}>
            <List dense>
              {insight.recommendations.map((rec, recIndex) => (
                <ListItem key={recIndex} sx={{ py: 0.5, px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircleIcon sx={{ fontSize: 18 }} color="primary" />
                  </ListItemIcon>
                  <ListItemText primary={rec} />
                  <Button
                    size="small"
                    startIcon={<ActionIcon />}
                    onClick={() => handleInsightAction(`action_${recIndex}`, insight.id)}
                  >
                    Act
                  </Button>
                </ListItem>
              ))}
            </List>
          </Collapse>

          {/* Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<LightbulbIcon />}
              onClick={() => openDetails(insight)}
            >
              View Details
            </Button>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton
                size="small"
                onClick={() => handleInsightAction('timeline', insight.id)}
                title="View Timeline"
              >
                <TimelineIcon />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => handleInsightAction('analytics', insight.id)}
                title="Deep Analytics"
              >
                <AssessmentIcon />
              </IconButton>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderCategorySummary = () => (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {Object.entries(categorizedInsights).map(([category, categoryInsights]) => (
        <Grid item xs={6} sm={3} key={category}>
          <Card sx={{ textAlign: 'center', bgcolor: `${getCategoryColor(category)}10` }}>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                {getCategoryIcon(category)}
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: getCategoryColor(category) }}>
                {categoryInsights.length}
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'capitalize' }}>
                {category}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderInsightsByCategory = (category: string) => {
    const categoryInsights = categorizedInsights[category as keyof typeof categorizedInsights] || [];
    
    if (categoryInsights.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="textSecondary">
            No {category} insights at this time
          </Typography>
        </Box>
      );
    }

    return (
      <Box>
        {categoryInsights.slice(0, maxDisplayCount).map((insight, index) => 
          renderInsightCard(insight, index)
        )}
        {categoryInsights.length > maxDisplayCount && (
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button variant="outlined" onClick={onViewAll}>
              View All {categoryInsights.length} {category} Insights
            </Button>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Executive Insights
        </Typography>
        <Badge badgeContent={insights.length} color="primary">
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            size="small"
          >
            Filter
          </Button>
        </Badge>
      </Box>

      {/* Category Summary */}
      {renderCategorySummary()}

      {/* Tabs */}
      <Tabs 
        value={currentTab} 
        onChange={(_, newValue) => setCurrentTab(newValue)}
        sx={{ mb: 2 }}
      >
        <Tab 
          label={
            <Badge badgeContent={urgencyPrioritizedInsights.length} color="error">
              Priority
            </Badge>
          } 
        />
        <Tab 
          label={
            <Badge badgeContent={categorizedInsights.opportunity.length} color="success">
              Opportunities
            </Badge>
          } 
        />
        <Tab 
          label={
            <Badge badgeContent={categorizedInsights.risk.length} color="error">
              Risks
            </Badge>
          } 
        />
        <Tab 
          label={
            <Badge badgeContent={categorizedInsights.performance.length} color="primary">
              Performance
            </Badge>
          } 
        />
        <Tab 
          label={
            <Badge badgeContent={categorizedInsights.compliance.length} color="info">
              Compliance
            </Badge>
          } 
        />
      </Tabs>

      {/* Tab Panels */}
      <TabPanel value={currentTab} index={0}>
        <Typography variant="h6" gutterBottom>
          Priority Insights (Urgency & Impact Based)
        </Typography>
        {urgencyPrioritizedInsights.slice(0, maxDisplayCount).map((insight, index) => 
          renderInsightCard(insight, index)
        )}
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        {renderInsightsByCategory('opportunity')}
      </TabPanel>

      <TabPanel value={currentTab} index={2}>
        {renderInsightsByCategory('risk')}
      </TabPanel>

      <TabPanel value={currentTab} index={3}>
        {renderInsightsByCategory('performance')}
      </TabPanel>

      <TabPanel value={currentTab} index={4}>
        {renderInsightsByCategory('compliance')}
      </TabPanel>

      {/* Detailed Insight Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        {selectedInsight && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {getCategoryIcon(selectedInsight.category)}
                <Box>
                  <Typography variant="h6">{selectedInsight.title}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {selectedInsight.category} • {selectedInsight.urgency} • {selectedInsight.impact} impact
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="body1" paragraph>
                    {selectedInsight.description}
                  </Typography>
                </Grid>

                {/* Metrics Visualization */}
                {selectedInsight.dataSupport?.metrics && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Key Metrics
                    </Typography>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={Object.entries(selectedInsight.dataSupport.metrics).map(([key, value]) => ({
                        name: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                        value: value
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="value" fill={getCategoryColor(selectedInsight.category)} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Grid>
                )}

                {/* Recommendations */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Detailed Recommendations
                  </Typography>
                  <List>
                    {selectedInsight.recommendations.map((rec, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <CheckCircleIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={rec}
                          secondary={`Priority: ${index < 2 ? 'High' : index < 4 ? 'Medium' : 'Low'}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              </Grid>
            </DialogContent>
            
            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)}>
                Close
              </Button>
              <Button
                variant="contained"
                startIcon={<ActionIcon />}
                onClick={() => {
                  handleInsightAction('implement', selectedInsight.id);
                  setDetailsOpen(false);
                }}
              >
                Take Action
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};