import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  Tooltip,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  Alert
} from '@mui/material';
import {
  DragIndicator as DragIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Settings as SettingsIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  TableChart as TableIcon,
  BarChart as ChartIcon,
  PieChart as PieIcon,
  Timeline as LineIcon,
  Dashboard as DashboardIcon,
  FilterList as FilterIcon,
  Functions as FormulaIcon,
  DateRange as DateIcon,
  Group as GroupIcon
} from '@mui/icons-material';

interface ReportBuilderProps {
  open: boolean;
  onClose: () => void;
  reportId?: string;
  onSave: (report: CustomReport) => void;
}

interface CustomReport {
  id?: string;
  name: string;
  description: string;
  sections: ReportSection[];
  filters: ReportFilter[];
  parameters: ReportParameter[];
  layout: ReportLayout;
  styling: ReportStyling;
}

interface ReportSection {
  id: string;
  type: 'table' | 'chart' | 'metric' | 'text' | 'image';
  title: string;
  dataSource: string;
  configuration: any;
  position: { x: number; y: number; width: number; height: number; };
}

interface ReportFilter {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between';
  value: any;
  label: string;
}

interface ReportParameter {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  label: string;
  defaultValue: any;
  options?: string[];
  required: boolean;
}

interface ReportLayout {
  orientation: 'portrait' | 'landscape';
  pageSize: 'a4' | 'letter' | 'legal';
  margins: { top: number; right: number; bottom: number; left: number; };
  columns: number;
}

interface ReportStyling {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  fontSize: number;
  includeLogo: boolean;
  includeHeader: boolean;
  includeFooter: boolean;
}

interface ComponentDefinition {
  type: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  defaultConfig: any;
}

const ReportBuilder: React.FC<ReportBuilderProps> = ({
  open,
  onClose,
  reportId,
  onSave
}) => {
  const [report, setReport] = useState<CustomReport>({
    name: '',
    description: '',
    sections: [],
    filters: [],
    parameters: [],
    layout: {
      orientation: 'portrait',
      pageSize: 'a4',
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      columns: 1
    },
    styling: {
      primaryColor: '#1976d2',
      secondaryColor: '#dc004e',
      fontFamily: 'Roboto',
      fontSize: 12,
      includeLogo: true,
      includeHeader: true,
      includeFooter: true
    }
  });

  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<any>({});
  const canvasRef = useRef<HTMLDivElement>(null);

  // Available components for the report
  const componentLibrary: ComponentDefinition[] = [
    {
      type: 'table',
      label: 'Data Table',
      icon: <TableIcon />,
      description: 'Tabular data display with sorting and filtering',
      defaultConfig: {
        dataSource: 'employees',
        columns: ['name', 'department', 'salary', 'bonus'],
        sortable: true,
        paginated: false,
        maxRows: 100
      }
    },
    {
      type: 'chart',
      label: 'Chart',
      icon: <ChartIcon />,
      description: 'Various chart types for data visualization',
      defaultConfig: {
        chartType: 'bar',
        dataSource: 'compensation',
        xAxis: 'department',
        yAxis: 'totalBonus',
        showLegend: true,
        showTooltip: true
      }
    },
    {
      type: 'metric',
      label: 'Key Metric',
      icon: <DashboardIcon />,
      description: 'Display key performance indicators',
      defaultConfig: {
        metricType: 'total',
        dataSource: 'employees',
        field: 'bonus',
        format: 'currency',
        showTrend: true,
        trendPeriod: 'previous_month'
      }
    },
    {
      type: 'text',
      label: 'Text Block',
      icon: <FormulaIcon />,
      description: 'Static text, headers, and formatted content',
      defaultConfig: {
        content: 'Enter your text here...',
        fontSize: 14,
        fontWeight: 'normal',
        textAlign: 'left',
        color: '#000000'
      }
    }
  ];

  const dataSources = [
    { value: 'employees', label: 'Employee Data' },
    { value: 'compensation', label: 'Compensation Data' },
    { value: 'departments', label: 'Department Data' },
    { value: 'performance', label: 'Performance Metrics' },
    { value: 'scenarios', label: 'Scenario Results' }
  ];

  const handleAddSection = (componentType: string) => {
    const component = componentLibrary.find(c => c.type === componentType);
    if (!component) return;

    const newSection: ReportSection = {
      id: `section-${Date.now()}`,
      type: componentType as ReportSection['type'],
      title: component.label,
      dataSource: component.defaultConfig.dataSource || 'employees',
      configuration: { ...component.defaultConfig },
      position: { x: 0, y: report.sections.length * 200, width: 12, height: 200 }
    };

    setReport(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
  };

  const handleRemoveSection = (sectionId: string) => {
    setReport(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId)
    }));
  };

  const handleSectionConfig = (section: ReportSection) => {
    setSelectedSection(section.id);
    setCurrentConfig(section.configuration);
    setConfigDialogOpen(true);
  };

  const handleSaveConfig = () => {
    if (!selectedSection) return;

    setReport(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === selectedSection
          ? { ...section, configuration: currentConfig }
          : section
      )
    }));

    setConfigDialogOpen(false);
    setSelectedSection(null);
  };

  const handleAddFilter = () => {
    const newFilter: ReportFilter = {
      id: `filter-${Date.now()}`,
      field: 'department',
      operator: 'equals',
      value: '',
      label: 'Department Filter'
    };

    setReport(prev => ({
      ...prev,
      filters: [...prev.filters, newFilter]
    }));
  };

  const handleAddParameter = () => {
    const newParameter: ReportParameter = {
      id: `param-${Date.now()}`,
      name: `param_${report.parameters.length + 1}`,
      type: 'text',
      label: 'New Parameter',
      defaultValue: '',
      required: false
    };

    setReport(prev => ({
      ...prev,
      parameters: [...prev.parameters, newParameter]
    }));
  };

  const handleSaveReport = () => {
    if (!report.name.trim()) {
      alert('Please enter a report name');
      return;
    }

    onSave(report);
    onClose();
  };

  const renderSectionPreview = (section: ReportSection) => {
    switch (section.type) {
      case 'table':
        return (
          <Box sx={{ padding: 2, border: '1px solid #ddd', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>{section.title}</Typography>
            <Alert severity="info" sx={{ marginBottom: 2 }}>
              Table: {section.configuration.columns?.join(', ') || 'No columns configured'}
            </Alert>
            <Typography variant="body2">
              Data Source: {section.dataSource}
            </Typography>
          </Box>
        );

      case 'chart':
        return (
          <Box sx={{ padding: 2, border: '1px solid #ddd', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>{section.title}</Typography>
            <Alert severity="success" sx={{ marginBottom: 2 }}>
              {section.configuration.chartType} Chart: {section.configuration.xAxis} vs {section.configuration.yAxis}
            </Alert>
            <Typography variant="body2">
              Data Source: {section.dataSource}
            </Typography>
          </Box>
        );

      case 'metric':
        return (
          <Box sx={{ padding: 2, border: '1px solid #ddd', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>{section.title}</Typography>
            <Typography variant="h3" color="primary">
              {section.configuration.format === 'currency' ? '$1,234,567' : '1,234'}
            </Typography>
            <Typography variant="body2">
              {section.configuration.metricType} of {section.configuration.field}
            </Typography>
          </Box>
        );

      case 'text':
        return (
          <Box sx={{ padding: 2, border: '1px solid #ddd', borderRadius: 1 }}>
            <Typography 
              variant="body1"
              sx={{
                fontSize: section.configuration.fontSize,
                fontWeight: section.configuration.fontWeight,
                textAlign: section.configuration.textAlign,
                color: section.configuration.color
              }}
            >
              {section.configuration.content}
            </Typography>
          </Box>
        );

      default:
        return (
          <Box sx={{ padding: 2, border: '1px solid #ddd', borderRadius: 1 }}>
            <Typography variant="body2">Unknown section type</Typography>
          </Box>
        );
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <Box sx={{ display: 'flex', height: '100vh' }}>
        {/* Component Library Drawer */}
        <Drawer
          variant="persistent"
          anchor="left"
          open={drawerOpen}
          sx={{
            '& .MuiDrawer-paper': {
              width: 300,
              boxSizing: 'border-box',
              position: 'relative',
              height: '100%'
            },
          }}
        >
          <Box sx={{ padding: 2 }}>
            <Typography variant="h6" gutterBottom>
              Report Components
            </Typography>
            <List>
              {componentLibrary.map((component) => (
                <ListItem
                  key={component.type}
                  button
                  onClick={() => handleAddSection(component.type)}
                  sx={{ border: '1px solid #eee', borderRadius: 1, marginBottom: 1 }}
                >
                  <ListItemIcon>{component.icon}</ListItemIcon>
                  <ListItemText 
                    primary={component.label} 
                    secondary={component.description}
                  />
                </ListItem>
              ))}
            </List>

            <Divider sx={{ margin: 2 }} />

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Filters ({report.filters.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Button startIcon={<AddIcon />} onClick={handleAddFilter} size="small">
                  Add Filter
                </Button>
                {report.filters.map((filter) => (
                  <Chip
                    key={filter.id}
                    label={filter.label}
                    onDelete={() => setReport(prev => ({
                      ...prev,
                      filters: prev.filters.filter(f => f.id !== filter.id)
                    }))}
                    sx={{ margin: 0.5 }}
                  />
                ))}
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Parameters ({report.parameters.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Button startIcon={<AddIcon />} onClick={handleAddParameter} size="small">
                  Add Parameter
                </Button>
                {report.parameters.map((param) => (
                  <Chip
                    key={param.id}
                    label={param.label}
                    onDelete={() => setReport(prev => ({
                      ...prev,
                      parameters: prev.parameters.filter(p => p.id !== param.id)
                    }))}
                    sx={{ margin: 0.5 }}
                  />
                ))}
              </AccordionDetails>
            </Accordion>
          </Box>
        </Drawer>

        {/* Main Content Area */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <Paper elevation={1} sx={{ padding: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={2}>
                <IconButton onClick={() => setDrawerOpen(!drawerOpen)}>
                  <DragIcon />
                </IconButton>
                <TextField
                  label="Report Name"
                  value={report.name}
                  onChange={(e) => setReport(prev => ({ ...prev, name: e.target.value }))}
                  size="small"
                  sx={{ minWidth: 200 }}
                />
                <TextField
                  label="Description"
                  value={report.description}
                  onChange={(e) => setReport(prev => ({ ...prev, description: e.target.value }))}
                  size="small"
                  sx={{ minWidth: 300 }}
                />
              </Box>
              <Box display="flex" gap={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={previewMode}
                      onChange={(e) => setPreviewMode(e.target.checked)}
                    />
                  }
                  label="Preview"
                />
                <Button startIcon={<PreviewIcon />} variant="outlined">
                  Preview
                </Button>
                <Button startIcon={<SaveIcon />} variant="contained" onClick={handleSaveReport}>
                  Save Report
                </Button>
                <IconButton onClick={onClose}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </Box>
          </Paper>

          {/* Canvas Area */}
          <Box
            ref={canvasRef}
            sx={{
              flexGrow: 1,
              padding: 3,
              backgroundColor: '#f5f5f5',
              overflow: 'auto'
            }}
          >
            <Paper
              sx={{
                minHeight: '297mm', // A4 height
                width: report.layout.orientation === 'portrait' ? '210mm' : '297mm',
                margin: '0 auto',
                padding: 3,
                backgroundColor: 'white'
              }}
            >
              {report.sections.length === 0 ? (
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  minHeight={400}
                  sx={{ border: '2px dashed #ccc', borderRadius: 2 }}
                >
                  <Typography variant="h5" color="text.secondary" gutterBottom>
                    Start Building Your Report
                  </Typography>
                  <Typography variant="body1" color="text.secondary" textAlign="center">
                    Drag components from the left panel to add sections to your report
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {report.sections.map((section) => (
                    <Grid item xs={section.position.width} key={section.id}>
                      <Card
                        sx={{
                          minHeight: section.position.height,
                          border: selectedSection === section.id ? '2px solid #1976d2' : 'none',
                          cursor: 'pointer'
                        }}
                        onClick={() => setSelectedSection(section.id)}
                      >
                        <Box display="flex" justifyContent="between" alignItems="center" padding={1}>
                          <DragIcon sx={{ color: '#ccc' }} />
                          <Box flexGrow={1} />
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSectionConfig(section);
                            }}
                          >
                            <SettingsIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveSection(section.id);
                            }}
                          >
                            <RemoveIcon />
                          </IconButton>
                        </Box>
                        <CardContent>
                          {renderSectionPreview(section)}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Paper>
          </Box>
        </Box>
      </Box>

      {/* Section Configuration Dialog */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Configure Section</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3} paddingTop={1}>
            <FormControl fullWidth>
              <InputLabel>Data Source</InputLabel>
              <Select
                value={currentConfig.dataSource || ''}
                label="Data Source"
                onChange={(e) => setCurrentConfig(prev => ({ ...prev, dataSource: e.target.value }))}
              >
                {dataSources.map((source) => (
                  <MenuItem key={source.value} value={source.value}>
                    {source.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedSection && report.sections.find(s => s.id === selectedSection)?.type === 'table' && (
              <TextField
                fullWidth
                label="Columns (comma-separated)"
                value={currentConfig.columns?.join(', ') || ''}
                onChange={(e) => setCurrentConfig(prev => ({ 
                  ...prev, 
                  columns: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                }))}
              />
            )}

            {selectedSection && report.sections.find(s => s.id === selectedSection)?.type === 'chart' && (
              <>
                <FormControl fullWidth>
                  <InputLabel>Chart Type</InputLabel>
                  <Select
                    value={currentConfig.chartType || 'bar'}
                    label="Chart Type"
                    onChange={(e) => setCurrentConfig(prev => ({ ...prev, chartType: e.target.value }))}
                  >
                    <MenuItem value="bar">Bar Chart</MenuItem>
                    <MenuItem value="line">Line Chart</MenuItem>
                    <MenuItem value="pie">Pie Chart</MenuItem>
                    <MenuItem value="area">Area Chart</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="X-Axis Field"
                  value={currentConfig.xAxis || ''}
                  onChange={(e) => setCurrentConfig(prev => ({ ...prev, xAxis: e.target.value }))}
                />
                <TextField
                  fullWidth
                  label="Y-Axis Field"
                  value={currentConfig.yAxis || ''}
                  onChange={(e) => setCurrentConfig(prev => ({ ...prev, yAxis: e.target.value }))}
                />
              </>
            )}

            {selectedSection && report.sections.find(s => s.id === selectedSection)?.type === 'text' && (
              <>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Content"
                  value={currentConfig.content || ''}
                  onChange={(e) => setCurrentConfig(prev => ({ ...prev, content: e.target.value }))}
                />
                <TextField
                  type="number"
                  label="Font Size"
                  value={currentConfig.fontSize || 14}
                  onChange={(e) => setCurrentConfig(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveConfig} variant="contained">Save Configuration</Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default ReportBuilder;