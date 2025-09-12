import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Fade,
  Slide,
  Grow,
  Zoom,
  Collapse,
  Typography,
  CircularProgress,
  LinearProgress,
  Skeleton,
  Snackbar,
  Alert,
  Backdrop,
  useTheme,
  useMediaQuery,
  Chip,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Psychology as PsychologyIcon,
  Speed as SpeedIcon,
  Accessibility as AccessibilityIcon,
  Animation as AnimationIcon,
  TouchApp as TouchIcon,
  Visibility as VisibilityIcon,
  VolumeUp as SoundIcon
} from '@mui/material/icons';
import { keyframes } from '@emotion/react';

interface UXPreferences {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  soundEnabled: boolean;
  hapticFeedback: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';
  transitionStyle: 'smooth' | 'bouncy' | 'sharp';
}

interface LoadingState {
  isLoading: boolean;
  progress?: number;
  message?: string;
  type?: 'determinate' | 'indeterminate';
}

interface NotificationState {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  actions?: Array<{ label: string; action: () => void; }>;
}

interface MicroInteraction {
  trigger: 'hover' | 'click' | 'focus' | 'visible';
  animation: 'pulse' | 'bounce' | 'shake' | 'glow' | 'scale' | 'rotate';
  duration?: number;
  delay?: number;
}

interface UXContextType {
  preferences: UXPreferences;
  updatePreferences: (preferences: Partial<UXPreferences>) => void;
  showLoading: (state: LoadingState) => void;
  hideLoading: () => void;
  showNotification: (notification: Omit<NotificationState, 'id'>) => void;
  hideNotification: (id: string) => void;
  triggerHaptic: (pattern?: 'light' | 'medium' | 'heavy') => void;
  playSound: (type?: 'success' | 'error' | 'click' | 'notification') => void;
  announceToScreenReader: (message: string) => void;
  addMicroInteraction: (element: HTMLElement, interaction: MicroInteraction) => () => void;
  isReducedMotion: boolean;
  animationDuration: number;
}

const UXContext = createContext<UXContextType | undefined>(undefined);

// Custom animations
const pulseAnimation = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
`;

const bounceAnimation = keyframes`
  0%, 20%, 53%, 80%, 100% { transform: translateY(0); }
  40%, 43% { transform: translateY(-8px); }
  70% { transform: translateY(-4px); }
  90% { transform: translateY(-2px); }
`;

const shakeAnimation = keyframes`
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
  20%, 40%, 60%, 80% { transform: translateX(2px); }
`;

const glowAnimation = keyframes`
  0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.5); }
  50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.8), 0 0 30px rgba(59, 130, 246, 0.6); }
`;

const scaleAnimation = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
`;

const rotateAnimation = keyframes`
  0% { transform: rotate(0deg); }
  25% { transform: rotate(3deg); }
  75% { transform: rotate(-3deg); }
  100% { transform: rotate(0deg); }
`;

// Gradient background animation for loading states
const gradientAnimation = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

interface UXEnhancementProviderProps {
  children: React.ReactNode;
  defaultPreferences?: Partial<UXPreferences>;
}

export const UXEnhancementProvider: React.FC<UXEnhancementProviderProps> = ({
  children,
  defaultPreferences = {}
}) => {
  const theme = useTheme();
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const prefersHighContrast = useMediaQuery('(prefers-contrast: high)');

  const [preferences, setPreferences] = useState<UXPreferences>({
    reducedMotion: prefersReducedMotion,
    highContrast: prefersHighContrast,
    largeText: false,
    soundEnabled: true,
    hapticFeedback: true,
    animationSpeed: 'normal',
    transitionStyle: 'smooth',
    ...defaultPreferences
  });

  const [loadingState, setLoadingState] = useState<LoadingState | null>(null);
  const [notifications, setNotifications] = useState<NotificationState[]>([]);
  const [microInteractions] = useState(new Map<HTMLElement, MicroInteraction>());

  const audioContextRef = useRef<AudioContext | null>(null);
  const screenReaderRef = useRef<HTMLDivElement>(null);

  // Initialize audio context for sounds
  useEffect(() => {
    if (preferences.soundEnabled && !audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn('Audio context not supported:', error);
      }
    }
  }, [preferences.soundEnabled]);

  // Update preferences based on system preferences
  useEffect(() => {
    setPreferences(prev => ({
      ...prev,
      reducedMotion: prefersReducedMotion,
      highContrast: prefersHighContrast
    }));
  }, [prefersReducedMotion, prefersHighContrast]);

  const updatePreferences = useCallback((newPreferences: Partial<UXPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }));
    
    // Store preferences in localStorage
    localStorage.setItem('ux-preferences', JSON.stringify({ ...preferences, ...newPreferences }));
  }, [preferences]);

  const showLoading = useCallback((state: LoadingState) => {
    setLoadingState(state);
    announceToScreenReader(`Loading: ${state.message || 'Please wait'}`);
  }, []);

  const hideLoading = useCallback(() => {
    setLoadingState(null);
    announceToScreenReader('Loading complete');
  }, []);

  const showNotification = useCallback((notification: Omit<NotificationState, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    const newNotification: NotificationState = {
      id,
      duration: 6000,
      ...notification
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-hide non-persistent notifications
    if (!notification.persistent && newNotification.duration) {
      setTimeout(() => {
        hideNotification(id);
      }, newNotification.duration);
    }

    // Announce to screen reader
    announceToScreenReader(`${notification.type}: ${notification.message}`);

    // Play sound if enabled
    if (preferences.soundEnabled) {
      playSound(notification.type === 'success' ? 'success' : 
                 notification.type === 'error' ? 'error' : 'notification');
    }

    // Trigger haptic feedback
    if (preferences.hapticFeedback && notification.type === 'error') {
      triggerHaptic('medium');
    }
  }, [preferences.soundEnabled, preferences.hapticFeedback]);

  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const triggerHaptic = useCallback((pattern: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!preferences.hapticFeedback) return;

    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      };
      navigator.vibrate(patterns[pattern]);
    }
  }, [preferences.hapticFeedback]);

  const playSound = useCallback((type: 'success' | 'error' | 'click' | 'notification' = 'click') => {
    if (!preferences.soundEnabled || !audioContextRef.current) return;

    try {
      const audioContext = audioContextRef.current;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different frequencies for different sound types
      const frequencies = {
        success: [523.25, 659.25, 783.99], // C, E, G
        error: [146.83, 123.47], // D, B (descending)
        click: [800],
        notification: [400, 600]
      };

      const freq = frequencies[type];
      let delay = 0;

      freq.forEach((frequency, index) => {
        setTimeout(() => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          
          osc.connect(gain);
          gain.connect(audioContext.destination);
          
          osc.frequency.setValueAtTime(frequency, audioContext.currentTime);
          osc.type = 'sine';
          
          gain.gain.setValueAtTime(0.1, audioContext.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          
          osc.start(audioContext.currentTime);
          osc.stop(audioContext.currentTime + 0.1);
        }, delay);
        
        delay += 100;
      });
    } catch (error) {
      console.warn('Sound playback failed:', error);
    }
  }, [preferences.soundEnabled]);

  const announceToScreenReader = useCallback((message: string) => {
    if (screenReaderRef.current) {
      screenReaderRef.current.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        if (screenReaderRef.current) {
          screenReaderRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  const addMicroInteraction = useCallback((element: HTMLElement, interaction: MicroInteraction): (() => void) => {
    microInteractions.set(element, interaction);

    const getAnimationCSS = (animation: string) => {
      const speeds = { slow: 800, normal: 400, fast: 200 };
      const duration = interaction.duration || speeds[preferences.animationSpeed];
      
      const animations = {
        pulse: `${pulseAnimation} ${duration}ms ease-in-out`,
        bounce: `${bounceAnimation} ${duration}ms ease-in-out`,
        shake: `${shakeAnimation} ${duration}ms ease-in-out`,
        glow: `${glowAnimation} ${duration}ms ease-in-out`,
        scale: `${scaleAnimation} ${duration}ms ease-in-out`,
        rotate: `${rotateAnimation} ${duration}ms ease-in-out`
      };

      return animations[animation as keyof typeof animations];
    };

    const handleInteraction = () => {
      if (preferences.reducedMotion) return;

      const animationCSS = getAnimationCSS(interaction.animation);
      element.style.animation = animationCSS;

      // Trigger haptic feedback for click interactions
      if (interaction.trigger === 'click' && preferences.hapticFeedback) {
        triggerHaptic('light');
      }

      // Play click sound
      if (interaction.trigger === 'click' && preferences.soundEnabled) {
        playSound('click');
      }

      // Clear animation after completion
      setTimeout(() => {
        element.style.animation = '';
      }, interaction.duration || 400);
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && interaction.trigger === 'visible') {
          handleInteraction();
        }
      });
    };

    let cleanup: (() => void) | null = null;

    switch (interaction.trigger) {
      case 'hover':
        element.addEventListener('mouseenter', handleInteraction);
        cleanup = () => element.removeEventListener('mouseenter', handleInteraction);
        break;
      case 'click':
        element.addEventListener('click', handleInteraction);
        cleanup = () => element.removeEventListener('click', handleInteraction);
        break;
      case 'focus':
        element.addEventListener('focus', handleInteraction);
        cleanup = () => element.removeEventListener('focus', handleInteraction);
        break;
      case 'visible':
        const observer = new IntersectionObserver(handleIntersection, {
          threshold: 0.5
        });
        observer.observe(element);
        cleanup = () => observer.disconnect();
        break;
    }

    return () => {
      microInteractions.delete(element);
      cleanup?.();
    };
  }, [preferences, triggerHaptic, playSound]);

  const animationDuration = preferences.reducedMotion ? 0 : 
    preferences.animationSpeed === 'slow' ? 800 :
    preferences.animationSpeed === 'fast' ? 200 : 400;

  const contextValue: UXContextType = {
    preferences,
    updatePreferences,
    showLoading,
    hideLoading,
    showNotification,
    hideNotification,
    triggerHaptic,
    playSound,
    announceToScreenReader,
    addMicroInteraction,
    isReducedMotion: preferences.reducedMotion,
    animationDuration
  };

  return (
    <UXContext.Provider value={contextValue}>
      {children}

      {/* Screen Reader Announcements */}
      <div
        ref={screenReaderRef}
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden'
        }}
      />

      {/* Global Loading Overlay */}
      {loadingState && (
        <Backdrop
          open
          sx={{ 
            zIndex: theme.zIndex.modal + 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)'
          }}
        >
          <Paper
            elevation={8}
            sx={{
              padding: 4,
              borderRadius: 2,
              textAlign: 'center',
              minWidth: 300,
              background: preferences.highContrast ? 
                theme.palette.background.paper : 
                `linear-gradient(145deg, ${theme.palette.background.paper}, ${theme.palette.background.default})`
            }}
          >
            {loadingState.type === 'determinate' && loadingState.progress !== undefined ? (
              <Box sx={{ width: '100%', marginBottom: 2 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={loadingState.progress}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
                    }
                  }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {Math.round(loadingState.progress)}%
                </Typography>
              </Box>
            ) : (
              <CircularProgress 
                size={48} 
                sx={{ 
                  marginBottom: 2,
                  color: theme.palette.primary.main
                }} 
              />
            )}
            
            {loadingState.message && (
              <Typography variant="h6" gutterBottom>
                {loadingState.message}
              </Typography>
            )}
            
            <Typography variant="body2" color="text.secondary">
              Please wait...
            </Typography>
          </Paper>
        </Backdrop>
      )}

      {/* Notification System */}
      <Box
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: theme.zIndex.snackbar,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          maxWidth: 400
        }}
      >
        {notifications.map((notification, index) => {
          const Icon = notification.type === 'success' ? SuccessIcon :
                      notification.type === 'error' ? ErrorIcon :
                      notification.type === 'warning' ? WarningIcon : InfoIcon;

          return (
            <Slide
              key={notification.id}
              direction="left"
              in={true}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <Alert
                severity={notification.type}
                icon={<Icon />}
                action={
                  <Box display="flex" gap={1}>
                    {notification.actions?.map((action, actionIndex) => (
                      <Chip
                        key={actionIndex}
                        label={action.label}
                        size="small"
                        clickable
                        onClick={action.action}
                        sx={{ 
                          height: 24,
                          fontSize: '0.75rem'
                        }}
                      />
                    ))}
                    {!notification.persistent && (
                      <IconButton
                        size="small"
                        onClick={() => hideNotification(notification.id)}
                        sx={{ padding: 0.5 }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                }
                sx={{
                  minWidth: 300,
                  '& .MuiAlert-message': {
                    paddingRight: 1
                  }
                }}
              >
                {notification.title && (
                  <Typography variant="subtitle2" gutterBottom>
                    {notification.title}
                  </Typography>
                )}
                <Typography variant="body2">
                  {notification.message}
                </Typography>
              </Alert>
            </Slide>
          );
        })}
      </Box>

      {/* UX Preferences Panel (for development/debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <Paper
          sx={{
            position: 'fixed',
            bottom: 16,
            left: 16,
            padding: 2,
            zIndex: theme.zIndex.speedDial,
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            borderRadius: 2,
            minWidth: 200
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            UX Debug Panel
          </Typography>
          <Box display="flex" flexDirection="column" gap={1}>
            <Chip
              icon={<AnimationIcon />}
              label={`Motion: ${preferences.reducedMotion ? 'Reduced' : 'Normal'}`}
              size="small"
            />
            <Chip
              icon={<SpeedIcon />}
              label={`Speed: ${preferences.animationSpeed}`}
              size="small"
            />
            <Chip
              icon={<AccessibilityIcon />}
              label={`Contrast: ${preferences.highContrast ? 'High' : 'Normal'}`}
              size="small"
            />
            <Chip
              icon={<SoundIcon />}
              label={`Sound: ${preferences.soundEnabled ? 'On' : 'Off'}`}
              size="small"
            />
          </Box>
        </Paper>
      )}
    </UXContext.Provider>
  );
};

export const useUX = (): UXContextType => {
  const context = useContext(UXContext);
  if (context === undefined) {
    throw new Error('useUX must be used within a UXEnhancementProvider');
  }
  return context;
};

export default UXEnhancementProvider;