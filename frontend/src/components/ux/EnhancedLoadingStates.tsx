import React from 'react';
import {
  Box,
  Skeleton,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  CircularProgress,
  LinearProgress,
  useTheme,
  useMediaQuery,
  Stack
} from '@mui/material';
import { keyframes } from '@emotion/react';

// Animated skeleton with shimmer effect
const shimmerAnimation = keyframes`
  0% {
    background-position: -468px 0;
  }
  100% {
    background-position: 468px 0;
  }
`;

const pulseAnimation = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
`;

const waveAnimation = keyframes`
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(100%);
  }
`;

const AnimatedSkeleton: React.FC<{
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'rectangular' | 'circular';
  animation?: 'shimmer' | 'pulse' | 'wave';
  children?: React.ReactNode;
}> = ({ 
  width, 
  height, 
  variant = 'text', 
  animation = 'shimmer',
  children
}) => {
  const theme = useTheme();
  
  const getAnimation = () => {
    switch (animation) {
      case 'pulse':
        return pulseAnimation;
      case 'wave':
        return waveAnimation;
      case 'shimmer':
      default:
        return shimmerAnimation;
    }
  };

  return (
    <Box
      sx={{
        width,
        height,
        backgroundColor: theme.palette.action.hover,
        borderRadius: variant === 'circular' ? '50%' : 
                     variant === 'rectangular' ? theme.shape.borderRadius : 4,
        position: 'relative',
        overflow: 'hidden',
        '&::after': animation === 'shimmer' ? {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          background: `linear-gradient(90deg, transparent, ${theme.palette.action.selected}, transparent)`,
          animation: `${getAnimation()} 1.6s ease-in-out infinite`
        } : {},
        animation: animation !== 'shimmer' ? `${getAnimation()} 2s ease-in-out infinite` : 'none'
      }}
    >
      {children}
    </Box>
  );
};

// Loading card skeleton
export const CardSkeleton: React.FC<{
  hasAvatar?: boolean;
  hasImage?: boolean;
  lines?: number;
  actions?: number;
}> = ({ 
  hasAvatar = true, 
  hasImage = false, 
  lines = 3, 
  actions = 2 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Card sx={{ margin: 1 }}>
      {hasImage && (
        <AnimatedSkeleton 
          width="100%" 
          height={isMobile ? 140 : 200} 
          variant="rectangular" 
        />
      )}
      
      <CardHeader
        avatar={
          hasAvatar && (
            <AnimatedSkeleton 
              width={40} 
              height={40} 
              variant="circular"
              animation="pulse"
            />
          )
        }
        title={
          <AnimatedSkeleton 
            width="60%" 
            height={24} 
            variant="text"
          />
        }
        subheader={
          <AnimatedSkeleton 
            width="40%" 
            height={16} 
            variant="text"
          />
        }
      />
      
      <CardContent>
        {Array.from({ length: lines }).map((_, index) => (
          <AnimatedSkeleton
            key={index}
            width={index === lines - 1 ? '75%' : '100%'}
            height={16}
            variant="text"
            animation="wave"
          />
        ))}
        
        {actions > 0 && (
          <Box display="flex" gap={1} marginTop={2}>
            {Array.from({ length: actions }).map((_, index) => (
              <AnimatedSkeleton
                key={index}
                width={80}
                height={32}
                variant="rectangular"
                animation="pulse"
              />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// Table skeleton
export const TableSkeleton: React.FC<{
  rows?: number;
  columns?: number;
  hasHeader?: boolean;
}> = ({ rows = 5, columns = 4, hasHeader = true }) => {
  return (
    <TableContainer component={Paper}>
      <Table>
        {hasHeader && (
          <TableHead>
            <TableRow>
              {Array.from({ length: columns }).map((_, index) => (
                <TableCell key={index}>
                  <AnimatedSkeleton 
                    width="80%" 
                    height={20} 
                    variant="text"
                    animation="shimmer"
                  />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
        )}
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  <AnimatedSkeleton 
                    width={colIndex === 0 ? '90%' : `${60 + Math.random() * 30}%`}
                    height={16} 
                    variant="text"
                    animation="wave"
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// List skeleton
export const ListSkeleton: React.FC<{
  items?: number;
  hasAvatar?: boolean;
  hasSecondary?: boolean;
}> = ({ items = 5, hasAvatar = true, hasSecondary = true }) => {
  return (
    <List>
      {Array.from({ length: items }).map((_, index) => (
        <ListItem key={index} alignItems="flex-start">
          {hasAvatar && (
            <ListItemAvatar>
              <AnimatedSkeleton 
                width={40} 
                height={40} 
                variant="circular"
                animation="pulse"
              />
            </ListItemAvatar>
          )}
          <ListItemText
            primary={
              <AnimatedSkeleton 
                width="70%" 
                height={20} 
                variant="text"
                animation="shimmer"
              />
            }
            secondary={
              hasSecondary && (
                <Stack spacing={0.5} marginTop={0.5}>
                  <AnimatedSkeleton 
                    width="90%" 
                    height={14} 
                    variant="text"
                    animation="wave"
                  />
                  <AnimatedSkeleton 
                    width="60%" 
                    height={14} 
                    variant="text"
                    animation="wave"
                  />
                </Stack>
              )
            }
          />
        </ListItem>
      ))}
    </List>
  );
};

// Dashboard skeleton
export const DashboardSkeleton: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box padding={2}>
      {/* Header */}
      <Box marginBottom={4}>
        <AnimatedSkeleton 
          width="300px" 
          height={32} 
          variant="text"
          animation="shimmer"
        />
        <AnimatedSkeleton 
          width="200px" 
          height={18} 
          variant="text"
          animation="wave"
        />
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} marginBottom={4}>
        {Array.from({ length: isMobile ? 2 : 4 }).map((_, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box flex={1}>
                    <AnimatedSkeleton 
                      width="80%" 
                      height={16} 
                      variant="text"
                      animation="pulse"
                    />
                    <AnimatedSkeleton 
                      width="60%" 
                      height={24} 
                      variant="text"
                      animation="shimmer"
                    />
                  </Box>
                  <AnimatedSkeleton 
                    width={32} 
                    height={32} 
                    variant="circular"
                    animation="wave"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Chart Area */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader
              title={
                <AnimatedSkeleton 
                  width="200px" 
                  height={24} 
                  variant="text"
                />
              }
            />
            <CardContent>
              <AnimatedSkeleton 
                width="100%" 
                height={300} 
                variant="rectangular"
                animation="shimmer"
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader
              title={
                <AnimatedSkeleton 
                  width="150px" 
                  height={24} 
                  variant="text"
                />
              }
            />
            <CardContent>
              <ListSkeleton items={4} hasAvatar={false} hasSecondary={false} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// Form skeleton
export const FormSkeleton: React.FC<{
  fields?: number;
  hasTitle?: boolean;
}> = ({ fields = 5, hasTitle = true }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box padding={3} maxWidth={600} margin="0 auto">
      {hasTitle && (
        <Box marginBottom={3} textAlign="center">
          <AnimatedSkeleton 
            width="250px" 
            height={32} 
            variant="text"
            animation="shimmer"
          />
          <AnimatedSkeleton 
            width="180px" 
            height={18} 
            variant="text"
            animation="wave"
          />
        </Box>
      )}

      <Stack spacing={3}>
        {Array.from({ length: fields }).map((_, index) => (
          <Box key={index}>
            <AnimatedSkeleton 
              width="120px" 
              height={16} 
              variant="text"
              animation="pulse"
            />
            <AnimatedSkeleton 
              width="100%" 
              height={56} 
              variant="rectangular"
              animation="shimmer"
            />
          </Box>
        ))}

        <Box display="flex" gap={2} justifyContent={isMobile ? 'stretch' : 'flex-end'}>
          <AnimatedSkeleton 
            width={isMobile ? '100%' : 100} 
            height={40} 
            variant="rectangular"
            animation="wave"
          />
          <AnimatedSkeleton 
            width={isMobile ? '100%' : 120} 
            height={40} 
            variant="rectangular"
            animation="pulse"
          />
        </Box>
      </Stack>
    </Box>
  );
};

// Progressive loading states
export const ProgressiveLoader: React.FC<{
  stages: Array<{
    name: string;
    progress: number;
    completed: boolean;
  }>;
  currentStage: number;
}> = ({ stages, currentStage }) => {
  const theme = useTheme();

  return (
    <Box padding={3} textAlign="center">
      <Box marginBottom={4}>
        <CircularProgress 
          size={80} 
          thickness={4}
          sx={{
            color: theme.palette.primary.main,
            animationDuration: '750ms'
          }}
        />
      </Box>

      <Typography variant="h6" gutterBottom>
        {stages[currentStage]?.name}
      </Typography>

      <Box marginTop={3}>
        {stages.map((stage, index) => (
          <Box key={index} marginBottom={2}>
            <Box display="flex" alignItems="center" gap={2} marginBottom={1}>
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: stage.completed 
                    ? theme.palette.success.main
                    : index === currentStage 
                    ? theme.palette.primary.main
                    : theme.palette.grey[300],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  color: 'white',
                  fontWeight: 'bold'
                }}
              >
                {stage.completed ? '✓' : index + 1}
              </Box>
              <Typography 
                variant="body2" 
                color={stage.completed || index === currentStage ? 'text.primary' : 'text.secondary'}
              >
                {stage.name}
              </Typography>
            </Box>
            
            {index === currentStage && (
              <LinearProgress
                variant="determinate"
                value={stage.progress}
                sx={{
                  height: 4,
                  borderRadius: 2,
                  marginLeft: 3.5,
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 2,
                    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
                  }
                }}
              />
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// Content placeholder with call-to-action
export const EmptyStateSkeleton: React.FC<{
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  illustration?: React.ReactNode;
}> = ({ 
  title = "Loading your data", 
  description = "Please wait while we prepare everything for you",
  actionText,
  onAction,
  illustration
}) => {
  const theme = useTheme();

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      padding={6}
      textAlign="center"
      minHeight={400}
    >
      {illustration || (
        <Box marginBottom={3}>
          <AnimatedSkeleton 
            width={120} 
            height={120} 
            variant="circular"
            animation="pulse"
          />
        </Box>
      )}

      <Typography variant="h5" gutterBottom color="text.secondary">
        {title}
      </Typography>
      
      <Typography variant="body1" color="text.secondary" maxWidth={400} marginBottom={3}>
        {description}
      </Typography>

      {actionText && onAction && (
        <AnimatedSkeleton 
          width={150} 
          height={40} 
          variant="rectangular"
          animation="shimmer"
        />
      )}

      {/* Loading dots animation */}
      <Box display="flex" gap={0.5} marginTop={2}>
        {[0, 1, 2].map((index) => (
          <Box
            key={index}
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: theme.palette.primary.main,
              animation: `${pulseAnimation} 1.4s ease-in-out infinite`,
              animationDelay: `${index * 0.2}s`
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

// Skeleton with fade-in transition
export const FadeInSkeleton: React.FC<{
  loading: boolean;
  children: React.ReactNode;
  skeleton: React.ReactNode;
  timeout?: number;
}> = ({ loading, children, skeleton, timeout = 300 }) => {
  return (
    <Box position="relative">
      <Box 
        sx={{
          opacity: loading ? 0 : 1,
          transition: `opacity ${timeout}ms ease-in-out`,
          position: loading ? 'absolute' : 'static',
          visibility: loading ? 'hidden' : 'visible'
        }}
      >
        {children}
      </Box>
      
      {loading && (
        <Box
          sx={{
            opacity: 1,
            transition: `opacity ${timeout}ms ease-in-out`
          }}
        >
          {skeleton}
        </Box>
      )}
    </Box>
  );
};

export default {
  AnimatedSkeleton,
  CardSkeleton,
  TableSkeleton,
  ListSkeleton,
  DashboardSkeleton,
  FormSkeleton,
  ProgressiveLoader,
  EmptyStateSkeleton,
  FadeInSkeleton
};