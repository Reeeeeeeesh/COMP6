import React from 'react';
import { Alert, AlertTitle, IconButton, Box, Typography, Chip } from '@mui/material';
import { ExpandMore, ExpandLess, Error, Warning, Info } from '@mui/icons-material';

interface ErrorItem {
  message: string;
  context?: string;
  severity?: 'error' | 'warning' | 'info';
  suggestions?: string[];
}

interface ErrorDisplayProps {
  errors: ErrorItem[];
  title?: string;
  maxVisible?: number;
  showContext?: boolean;
  collapsible?: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  errors,
  title = "Issues Found",
  maxVisible = 3,
  showContext = true,
  collapsible = true
}) => {
  const [expanded, setExpanded] = React.useState(false);
  
  if (!errors || errors.length === 0) {
    return null;
  }

  const errorCount = errors.filter(e => e.severity === 'error' || !e.severity).length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;
  const infoCount = errors.filter(e => e.severity === 'info').length;

  const visibleErrors = expanded ? errors : errors.slice(0, maxVisible);
  const hasMore = errors.length > maxVisible;

  const getIcon = (severity: string = 'error') => {
    switch (severity) {
      case 'warning': return <Warning fontSize="small" />;
      case 'info': return <Info fontSize="small" />;
      default: return <Error fontSize="small" />;
    }
  };


  return (
    <Alert severity={errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'info'}>
      <AlertTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" component="span">
            {title}
          </Typography>
          <Box display="flex" gap={1}>
            {errorCount > 0 && (
              <Chip 
                label={`${errorCount} error${errorCount > 1 ? 's' : ''}`} 
                color="error" 
                size="small" 
              />
            )}
            {warningCount > 0 && (
              <Chip 
                label={`${warningCount} warning${warningCount > 1 ? 's' : ''}`} 
                color="warning" 
                size="small" 
              />
            )}
            {infoCount > 0 && (
              <Chip 
                label={`${infoCount} info`} 
                color="info" 
                size="small" 
              />
            )}
          </Box>
        </Box>
      </AlertTitle>

      <Box sx={{ mt: 1 }}>
        {visibleErrors.map((error, index) => (
          <Box key={index} sx={{ mb: 1.5, pl: 1 }}>
            <Box display="flex" alignItems="flex-start" gap={1}>
              {getIcon(error.severity)}
              <Box flex={1}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {error.message}
                </Typography>
                
                {showContext && error.context && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Context: {error.context}
                  </Typography>
                )}
                
                {error.suggestions && error.suggestions.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Suggestions:
                    </Typography>
                    <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
                      {error.suggestions.map((suggestion, suggestionIndex) => (
                        <li key={suggestionIndex}>
                          <Typography variant="caption" color="text.secondary">
                            {suggestion}
                          </Typography>
                        </li>
                      ))}
                    </ul>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        ))}
        
        {collapsible && hasMore && (
          <Box display="flex" justifyContent="center" sx={{ mt: 2 }}>
            <IconButton 
              onClick={() => setExpanded(!expanded)}
              size="small"
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                color: 'text.secondary'
              }}
            >
              <Typography variant="caption">
                {expanded 
                  ? 'Show less' 
                  : `Show ${errors.length - maxVisible} more issue${errors.length - maxVisible > 1 ? 's' : ''}`
                }
              </Typography>
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
        )}
      </Box>
    </Alert>
  );
};

export default ErrorDisplay;