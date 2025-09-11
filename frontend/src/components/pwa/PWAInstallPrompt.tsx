import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Typography,
  Card,
  CardContent,
  IconButton,
  Slide,
  useTheme,
  useMediaQuery,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Paper,
  Backdrop
} from '@mui/material';
import {
  Close as CloseIcon,
  Install as InstallIcon,
  Phone as PhoneIcon,
  Laptop as LaptopIcon,
  Tablet as TabletIcon,
  Download as DownloadIcon,
  Offline as OfflineIcon,
  Notifications as NotificationsIcon,
  Home as HomeIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  CloudOff as CloudOffIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Refresh as RefreshIcon,
  Update as UpdateIcon
} from '@mui/icons-material';

interface PWAInstallPromptProps {
  appName?: string;
  appIcon?: string;
  features?: string[];
  autoShow?: boolean;
  showOnlyOnMobile?: boolean;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  appName = 'Compensation Platform',
  appIcon = '/icons/icon-192x192.png',
  features = [
    'Work offline',
    'Fast loading',
    'Push notifications',
    'Native app experience',
    'Secure data storage'
  ],
  autoShow = true,
  showOnlyOnMobile = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));

  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installMethod, setInstallMethod] = useState<'browser' | 'manual' | 'installed'>('browser');
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [showOfflineNotice, setShowOfflineNotice] = useState(false);

  // Detect PWA installation capability
  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.matchMedia('(display-mode: fullscreen)').matches) {
      setIsInstalled(true);
      setInstallMethod('installed');
      return;
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setInstallMethod('browser');
      
      if (autoShow && (!showOnlyOnMobile || isMobile)) {
        setTimeout(() => setShowInstallDialog(true), 3000);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallMethod('installed');
      setShowInstallDialog(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [autoShow, showOnlyOnMobile, isMobile]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineNotice(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineNotice(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Service Worker registration and update detection
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setShowUpdatePrompt(true);
                }
              });
            }
          });
        })
        .catch((error) => {
          console.log('SW registration failed: ', error);
        });
    }
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      setInstallMethod('manual');
      return;
    }

    try {
      await installPrompt.prompt();
      const result = await installPrompt.userChoice;
      
      if (result.outcome === 'accepted') {
        setIsInstalled(true);
        setShowInstallDialog(false);
      }
    } catch (error) {
      console.error('Installation failed:', error);
    }

    setInstallPrompt(null);
  };

  const handleUpdateApp = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }
      });
    }
    setShowUpdatePrompt(false);
  };

  const getDeviceIcon = () => {
    if (isMobile) return <PhoneIcon />;
    if (isTablet) return <TabletIcon />;
    return <LaptopIcon />;
  };

  const getInstallInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !isChrome;

    if (isIOS) {
      return (
        <Box>
          <Typography variant="body2" gutterBottom>
            To install on iOS:
          </Typography>
          <Typography variant="body2" component="div">
            1. Tap the Share button in Safari <br/>
            2. Scroll down and tap "Add to Home Screen" <br/>
            3. Tap "Add" to confirm
          </Typography>
        </Box>
      );
    }

    if (isAndroid) {
      return (
        <Box>
          <Typography variant="body2" gutterBottom>
            To install on Android:
          </Typography>
          <Typography variant="body2" component="div">
            1. Tap the menu button (⋮) in Chrome <br/>
            2. Tap "Add to Home screen" <br/>
            3. Tap "Add" to confirm
          </Typography>
        </Box>
      );
    }

    return (
      <Box>
        <Typography variant="body2" gutterBottom>
          To install on desktop:
        </Typography>
        <Typography variant="body2" component="div">
          1. Click the install icon in your browser's address bar <br/>
          2. Or use the browser menu → "Install {appName}"
        </Typography>
      </Box>
    );
  };

  const renderFeatureList = () => (
    <List dense>
      <ListItem>
        <ListItemIcon><OfflineIcon color="primary" /></ListItemIcon>
        <ListItemText 
          primary="Work Offline" 
          secondary="Access your data without internet connection"
        />
      </ListItem>
      <ListItem>
        <ListItemIcon><SpeedIcon color="primary" /></ListItemIcon>
        <ListItemText 
          primary="Fast Loading" 
          secondary="Instant startup and smooth performance"
        />
      </ListItem>
      <ListItem>
        <ListItemIcon><NotificationsIcon color="primary" /></ListItemIcon>
        <ListItemText 
          primary="Push Notifications" 
          secondary="Get notified about important updates"
        />
      </ListItem>
      <ListItem>
        <ListItemIcon><SecurityIcon color="primary" /></ListItemIcon>
        <ListItemText 
          primary="Secure & Private" 
          secondary="Your data is encrypted and secure"
        />
      </ListItem>
      <ListItem>
        <ListItemIcon><HomeIcon color="primary" /></ListItemIcon>
        <ListItemText 
          primary="Native Experience" 
          secondary="Full-screen app without browser chrome"
        />
      </ListItem>
    </List>
  );

  // Don't show if already installed
  if (isInstalled) {
    return (
      <>
        {/* Update Prompt */}
        <Dialog open={showUpdatePrompt} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <UpdateIcon color="primary" />
              <Typography>App Update Available</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography gutterBottom>
              A new version of {appName} is available. Update now to get the latest features and improvements.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowUpdatePrompt(false)}>Later</Button>
            <Button onClick={handleUpdateApp} variant="contained" startIcon={<UpdateIcon />}>
              Update Now
            </Button>
          </DialogActions>
        </Dialog>

        {/* Offline Notice */}
        <Snackbar
          open={showOfflineNotice}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          sx={{ zIndex: theme.zIndex.snackbar + 1 }}
        >
          <Alert
            severity="warning"
            action={
              <IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={() => setShowOfflineNotice(false)}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            }
            icon={<WifiOffIcon />}
          >
            You're offline. The app will work with cached data.
          </Alert>
        </Snackbar>
      </>
    );
  }

  return (
    <>
      {/* Install Button (always visible when installable) */}
      {installPrompt && (
        <Button
          variant="contained"
          startIcon={<InstallIcon />}
          onClick={() => setShowInstallDialog(true)}
          size={isMobile ? 'large' : 'medium'}
          sx={{
            position: 'fixed',
            top: isMobile ? 16 : 24,
            right: isMobile ? 16 : 24,
            zIndex: theme.zIndex.fab,
            backgroundColor: theme.palette.primary.main,
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
            }
          }}
        >
          Install App
        </Button>
      )}

      {/* Install Dialog */}
      <Dialog
        open={showInstallDialog}
        onClose={() => setShowInstallDialog(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        TransitionComponent={isMobile ? Slide : undefined}
        TransitionProps={isMobile ? { direction: 'up' } as any : {}}
      >
        <DialogTitle sx={{ paddingBottom: 1 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar
                src={appIcon}
                alt={appName}
                sx={{ width: 48, height: 48 }}
              >
                {getDeviceIcon()}
              </Avatar>
              <Box>
                <Typography variant="h6">{appName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Install this app on your device
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={() => setShowInstallDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {/* Network Status */}
          <Paper 
            elevation={0} 
            sx={{ 
              padding: 2, 
              marginBottom: 3, 
              backgroundColor: isOnline ? theme.palette.success.light : theme.palette.warning.light,
              color: isOnline ? theme.palette.success.contrastText : theme.palette.warning.contrastText
            }}
          >
            <Box display="flex" alignItems="center" gap={1}>
              {isOnline ? <WifiIcon /> : <WifiOffIcon />}
              <Typography variant="body2">
                {isOnline ? 'Online - Full functionality available' : 'Offline - Limited functionality'}
              </Typography>
            </Box>
          </Paper>

          {/* Features */}
          <Typography variant="h6" gutterBottom>
            Why install {appName}?
          </Typography>
          
          {renderFeatureList()}

          {/* Installation Method */}
          {installMethod === 'manual' && (
            <Card sx={{ marginTop: 2, backgroundColor: theme.palette.background.default }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Manual Installation
                </Typography>
                {getInstallInstructions()}
              </CardContent>
            </Card>
          )}

          {/* Device Info */}
          <Box 
            display="flex" 
            justifyContent="center" 
            alignItems="center" 
            gap={2} 
            marginTop={3}
            padding={2}
            bgcolor={theme.palette.background.default}
            borderRadius={1}
          >
            {getDeviceIcon()}
            <Typography variant="body2" color="text.secondary">
              Optimized for {isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'} devices
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ padding: 3, paddingTop: 1 }}>
          <Button 
            onClick={() => setShowInstallDialog(false)}
            size={isMobile ? 'large' : 'medium'}
          >
            Not Now
          </Button>
          <Button
            onClick={handleInstallClick}
            variant="contained"
            startIcon={installPrompt ? <InstallIcon /> : <DownloadIcon />}
            size={isMobile ? 'large' : 'medium'}
            sx={{ minWidth: isMobile ? 120 : 100 }}
          >
            {installPrompt ? 'Install' : 'Show Instructions'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Offline Notice */}
      <Snackbar
        open={showOfflineNotice}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="warning"
          action={
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={() => setShowOfflineNotice(false)}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          }
          icon={<CloudOffIcon />}
        >
          You're offline. Limited functionality available.
        </Alert>
      </Snackbar>
    </>
  );
};

export default PWAInstallPrompt;