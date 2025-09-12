import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
  Fab,
  Zoom,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Snackbar,
  Alert,
  Paper,
  Container,
  Grid,
  Collapse
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Dashboard as DashboardIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Upload as UploadIcon,
  Calculate as CalculateIcon,
  Download as DownloadIcon,
  KeyboardArrowUp as ScrollTopIcon,
  SwipeUp as SwipeUpIcon
} from '@mui/icons-material';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  title?: string;
  showNavigation?: boolean;
  showSpeedDial?: boolean;
  onNavigate?: (route: string) => void;
  currentRoute?: string;
  userRole?: 'analyst' | 'executive' | 'admin';
}

interface ViewportInfo {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
  touchDevice: boolean;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  route: string;
  roles: string[];
  mobileOnly?: boolean;
  desktopOnly?: boolean;
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  title = 'Compensation Platform',
  showNavigation = true,
  showSpeedDial = true,
  onNavigate,
  currentRoute = '/',
  userRole = 'analyst'
}) => {
  const theme = useTheme();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [viewportInfo, setViewportInfo] = useState<ViewportInfo>({
    width: 0,
    height: 0,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    orientation: 'landscape',
    touchDevice: false
  });
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [swipeGesture, setSwipeGesture] = useState({ startX: 0, startY: 0, active: false });
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  // Responsive breakpoints
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  // Navigation items with role-based visibility
  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      route: '/dashboard',
      roles: ['analyst', 'executive', 'admin']
    },
    {
      id: 'batch-upload',
      label: 'Data Upload',
      icon: <UploadIcon />,
      route: '/batch-upload',
      roles: ['analyst', 'admin'],
      mobileOnly: true
    },
    {
      id: 'calculations',
      label: 'Calculate',
      icon: <CalculateIcon />,
      route: '/calculations',
      roles: ['analyst', 'admin']
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <ReportsIcon />,
      route: '/reports',
      roles: ['analyst', 'executive', 'admin']
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: <PersonIcon />,
      route: '/profile',
      roles: ['analyst', 'executive', 'admin'],
      mobileOnly: true
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <SettingsIcon />,
      route: '/settings',
      roles: ['admin'],
      desktopOnly: true
    }
  ];

  // Speed dial actions for mobile
  const speedDialActions = [
    {
      icon: <UploadIcon />,
      name: 'Upload Data',
      action: () => onNavigate?.('/batch-upload')
    },
    {
      icon: <CalculateIcon />,
      name: 'Calculate',
      action: () => onNavigate?.('/calculations')
    },
    {
      icon: <DownloadIcon />,
      name: 'Export',
      action: () => onNavigate?.('/reports')
    },
    {
      icon: <SearchIcon />,
      name: 'Search',
      action: () => setNotificationOpen(true)
    }
  ];

  // Update viewport information
  useEffect(() => {
    const updateViewportInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setViewportInfo({
        width,
        height,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        orientation: width > height ? 'landscape' : 'portrait',
        touchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0
      });
    };

    updateViewportInfo();
    window.addEventListener('resize', updateViewportInfo);
    window.addEventListener('orientationchange', updateViewportInfo);

    return () => {
      window.removeEventListener('resize', updateViewportInfo);
      window.removeEventListener('orientationchange', updateViewportInfo);
    };
  }, []);

  // Handle scroll events for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        setShowScrollTop(scrollRef.current.scrollTop > 300);
      }
    };

    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Touch gesture handlers for mobile navigation
  const handleTouchStart = (event: React.TouchEvent) => {
    if (!viewportInfo.touchDevice) return;
    
    const touch = event.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    
    setSwipeGesture({
      startX: touch.clientX,
      startY: touch.clientY,
      active: true
    });
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!swipeGesture.active || !viewportInfo.touchDevice) return;
    
    const touch = event.touches[0];
    const deltaX = touch.clientX - swipeGesture.startX;
    const deltaY = touch.clientY - swipeGesture.startY;
    
    // Detect swipe gestures
    if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 30) {
      if (deltaX > 0 && swipeGesture.startX < 50) {
        // Swipe right from left edge - open drawer
        setMobileDrawerOpen(true);
      } else if (deltaX < -50 && mobileDrawerOpen) {
        // Swipe left - close drawer
        setMobileDrawerOpen(false);
      }
    }
  };

  const handleTouchEnd = () => {
    setSwipeGesture({ startX: 0, startY: 0, active: false });
  };

  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const handleDrawerToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  const handleNavigation = (route: string) => {
    onNavigate?.(route);
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  const renderNavigationItems = () => {
    return navigationItems
      .filter(item => {
        // Role-based filtering
        if (!item.roles.includes(userRole)) return false;
        
        // Device-specific filtering
        if (item.mobileOnly && !isMobile) return false;
        if (item.desktopOnly && isMobile) return false;
        
        return true;
      })
      .map((item) => (
        <Box
          key={item.id}
          sx={{
            display: 'flex',
            alignItems: 'center',
            padding: 2,
            cursor: 'pointer',
            backgroundColor: currentRoute === item.route ? theme.palette.action.selected : 'transparent',
            borderRadius: 1,
            margin: 1,
            '&:hover': {
              backgroundColor: theme.palette.action.hover
            },
            '&:active': {
              backgroundColor: theme.palette.action.focus
            }
          }}
          onClick={() => handleNavigation(item.route)}
        >
          <Box sx={{ marginRight: 2, color: theme.palette.primary.main }}>
            {item.icon}
          </Box>
          <Typography variant="body1" noWrap>
            {item.label}
          </Typography>
        </Box>
      ));
  };

  const drawerContent = (
    <Box sx={{ width: isMobile ? 280 : 240, height: '100%' }}>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          Navigation
        </Typography>
        {isMobile && (
          <IconButton onClick={() => setMobileDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        )}
      </Toolbar>
      <Box sx={{ padding: 1 }}>
        {renderNavigationItems()}
      </Box>
    </Box>
  );

  return (
    <Box 
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* App Bar */}
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: theme.zIndex.drawer + 1,
          backgroundColor: isMobile ? theme.palette.primary.main : theme.palette.background.paper,
          color: isMobile ? theme.palette.primary.contrastText : theme.palette.text.primary
        }}
      >
        <Toolbar>
          {showNavigation && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ 
                marginRight: 2,
                display: { lg: showNavigation && !isDesktop ? 'block' : 'none' }
              }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>

          {/* Mobile-specific header actions */}
          {isMobile && (
            <>
              <IconButton color="inherit" onClick={() => setNotificationOpen(true)}>
                <SearchIcon />
              </IconButton>
              <IconButton color="inherit">
                <NotificationsIcon />
              </IconButton>
            </>
          )}

          {/* Desktop-specific header actions */}
          {isDesktop && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {viewportInfo.width} × {viewportInfo.height} • {viewportInfo.orientation}
                </Typography>
              </Box>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flexGrow: 1, marginTop: '64px' }}>
        {/* Navigation Drawer */}
        {showNavigation && (
          <>
            {/* Mobile Drawer */}
            <Drawer
              variant="temporary"
              anchor="left"
              open={mobileDrawerOpen}
              onClose={() => setMobileDrawerOpen(false)}
              ModalProps={{ keepMounted: true }}
              sx={{
                display: { xs: 'block', lg: 'none' },
                '& .MuiDrawer-paper': {
                  boxSizing: 'border-box',
                  width: 280,
                  backgroundImage: 'none',
                  boxShadow: theme.shadows[8]
                },
              }}
            >
              {drawerContent}
            </Drawer>

            {/* Desktop Drawer */}
            <Drawer
              variant="permanent"
              sx={{
                display: { xs: 'none', lg: 'block' },
                '& .MuiDrawer-paper': {
                  boxSizing: 'border-box',
                  width: 240,
                  top: '64px',
                  height: 'calc(100% - 64px)',
                  backgroundImage: 'none'
                },
              }}
            >
              {drawerContent}
            </Drawer>
          </>
        )}

        {/* Main Content */}
        <Box
          component="main"
          ref={scrollRef}
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            backgroundColor: theme.palette.background.default,
            marginLeft: { lg: showNavigation ? '240px' : 0 },
            padding: isMobile ? 1 : 3,
            paddingBottom: isMobile ? '80px' : 3, // Account for mobile bottom navigation
            width: { lg: showNavigation ? 'calc(100% - 240px)' : '100%' }
          }}
        >
          {/* Responsive Container */}
          <Container
            maxWidth={false}
            sx={{
              padding: 0,
              maxWidth: {
                xs: '100%',
                sm: '100%',
                md: '100%',
                lg: '1400px',
                xl: '1600px'
              }
            }}
          >
            {children}
          </Container>
        </Box>
      </Box>

      {/* Mobile Speed Dial */}
      {isMobile && showSpeedDial && (
        <SpeedDial
          ariaLabel="Quick Actions"
          sx={{ 
            position: 'fixed', 
            bottom: 16, 
            right: 16,
            '& .MuiSpeedDial-fab': {
              backgroundColor: theme.palette.primary.main,
              '&:hover': {
                backgroundColor: theme.palette.primary.dark
              }
            }
          }}
          icon={<SpeedDialIcon />}
          onClose={() => setSpeedDialOpen(false)}
          onOpen={() => setSpeedDialOpen(true)}
          open={speedDialOpen}
        >
          {speedDialActions.map((action) => (
            <SpeedDialAction
              key={action.name}
              icon={action.icon}
              tooltipTitle={action.name}
              onClick={() => {
                action.action();
                setSpeedDialOpen(false);
              }}
            />
          ))}
        </SpeedDial>
      )}

      {/* Scroll to Top Button */}
      <Zoom in={showScrollTop}>
        <Fab
          color="primary"
          size="small"
          aria-label="scroll back to top"
          onClick={scrollToTop}
          sx={{
            position: 'fixed',
            bottom: isMobile && showSpeedDial ? 88 : 16,
            right: 16,
            zIndex: theme.zIndex.speedDial - 1
          }}
        >
          <ScrollTopIcon />
        </Fab>
      </Zoom>

      {/* Mobile Swipe Hint */}
      {isMobile && !mobileDrawerOpen && (
        <Collapse in={true}>
          <Paper
            sx={{
              position: 'fixed',
              top: '50%',
              left: 0,
              transform: 'translateY(-50%)',
              padding: 1,
              borderRadius: '0 8px 8px 0',
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              opacity: 0.7,
              zIndex: theme.zIndex.tooltip,
              animation: 'pulse 2s infinite'
            }}
          >
            <SwipeUpIcon 
              sx={{ 
                transform: 'rotate(-90deg)',
                fontSize: 16
              }} 
            />
          </Paper>
        </Collapse>
      )}

      {/* Notification Snackbar */}
      <Snackbar
        open={notificationOpen}
        autoHideDuration={3000}
        onClose={() => setNotificationOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setNotificationOpen(false)} 
          severity="info"
          sx={{ width: '100%' }}
        >
          Search feature coming soon! ({viewportInfo.width}×{viewportInfo.height})
        </Alert>
      </Snackbar>

      {/* Global CSS for mobile optimizations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 0.3; }
        }
        
        /* Touch-friendly scrollbars on mobile */
        @media (max-width: 768px) {
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          ::-webkit-scrollbar-track {
            background: transparent;
          }
          ::-webkit-scrollbar-thumb {
            background: rgba(0,0,0,0.2);
            border-radius: 4px;
          }
        }
        
        /* Prevent zoom on input focus (iOS) */
        @media screen and (max-width: 768px) {
          input, select, textarea {
            font-size: 16px !important;
          }
        }
        
        /* Safe area insets for notched devices */
        @supports (padding: max(0px)) {
          .main-content {
            padding-left: max(16px, env(safe-area-inset-left));
            padding-right: max(16px, env(safe-area-inset-right));
            padding-bottom: max(16px, env(safe-area-inset-bottom));
          }
        }
      `}</style>
    </Box>
  );
};

export default ResponsiveLayout;