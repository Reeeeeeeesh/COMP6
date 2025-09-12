import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback, 
  useRef,
  Children,
  cloneElement,
  isValidElement
} from 'react';
import {
  Box,
  Button,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Slider,
  Card,
  CardContent,
  Tooltip,
  Fab,
  useTheme,
  useMediaQuery,
  Alert,
  Snackbar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip
} from '@mui/material';
import {
  Accessibility as AccessibilityIcon,
  TextFields as TextSizeIcon,
  Contrast as ContrastIcon,
  VolumeUp as SoundIcon,
  Mouse as MouseIcon,
  Keyboard as KeyboardIcon,
  Visibility as VisibilityIcon,
  Psychology as CognitiveIcon,
  Speed as MotionIcon,
  Close as CloseIcon,
  Settings as SettingsIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Highlight as HighlightIcon,
  RecordVoiceOver as VoiceIcon
} from '@mui/icons-material';

interface AccessibilitySettings {
  fontSize: number; // Scale factor: 1 = normal, 1.5 = 150%, 2 = 200%
  highContrast: boolean;
  reducedMotion: boolean;
  screenReaderOptimized: boolean;
  keyboardNavigation: boolean;
  focusIndicators: boolean;
  colorBlindFriendly: boolean;
  dyslexiaFriendly: boolean;
  cognitiveAssist: boolean;
  soundFeedback: boolean;
  voiceNavigation: boolean;
}

interface FocusManager {
  trapFocus: (container: HTMLElement) => () => void;
  setFocusRing: (enabled: boolean) => void;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  skipToContent: () => void;
  navigateByHeading: (direction: 'next' | 'previous') => void;
  navigateByLandmark: (direction: 'next' | 'previous') => void;
}

interface AccessibilityContextType extends FocusManager {
  settings: AccessibilitySettings;
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
  isHighContrast: boolean;
  scaledFontSize: (baseSize: number) => number;
  getAccessibleProps: (element: string, options?: any) => any;
  startVoiceNavigation: () => void;
  stopVoiceNavigation: () => void;
  isVoiceNavigating: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

interface AccessibilityEnhancerProps {
  children: React.ReactNode;
  defaultSettings?: Partial<AccessibilitySettings>;
  showFloatingButton?: boolean;
}

export const AccessibilityEnhancer: React.FC<AccessibilityEnhancerProps> = ({
  children,
  defaultSettings = {},
  showFloatingButton = true
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const prefersHighContrast = useMediaQuery('(prefers-contrast: high)');

  const [settings, setSettings] = useState<AccessibilitySettings>({
    fontSize: 1,
    highContrast: prefersHighContrast,
    reducedMotion: prefersReducedMotion,
    screenReaderOptimized: false,
    keyboardNavigation: true,
    focusIndicators: true,
    colorBlindFriendly: false,
    dyslexiaFriendly: false,
    cognitiveAssist: false,
    soundFeedback: false,
    voiceNavigation: false,
    ...defaultSettings
  });

  const [panelOpen, setPanelOpen] = useState(false);
  const [isVoiceNavigating, setIsVoiceNavigating] = useState(false);
  const [voiceCommands, setVoiceCommands] = useState<string[]>([]);
  
  const screenReaderRef = useRef<HTMLDivElement>(null);
  const skipLinkRef = useRef<HTMLButtonElement>(null);
  const focusableElements = useRef<HTMLElement[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const currentFocusIndex = useRef(0);

  // Load saved settings
  useEffect(() => {
    const savedSettings = localStorage.getItem('accessibility-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.warn('Failed to load accessibility settings:', error);
      }
    }
  }, []);

  // Apply system preferences
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      reducedMotion: prefersReducedMotion,
      highContrast: prefersHighContrast
    }));
  }, [prefersReducedMotion, prefersHighContrast]);

  // Apply global accessibility styles
  useEffect(() => {
    const root = document.documentElement;
    
    // Font size scaling
    root.style.setProperty('--accessibility-font-scale', settings.fontSize.toString());
    
    // High contrast mode
    if (settings.highContrast) {
      root.classList.add('accessibility-high-contrast');
    } else {
      root.classList.remove('accessibility-high-contrast');
    }
    
    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add('accessibility-reduced-motion');
    } else {
      root.classList.remove('accessibility-reduced-motion');
    }
    
    // Focus indicators
    if (settings.focusIndicators) {
      root.classList.add('accessibility-focus-indicators');
    } else {
      root.classList.remove('accessibility-focus-indicators');
    }
    
    // Dyslexia friendly
    if (settings.dyslexiaFriendly) {
      root.classList.add('accessibility-dyslexia-friendly');
      root.style.setProperty('--accessibility-font-family', 'OpenDyslexic, Arial, sans-serif');
    } else {
      root.classList.remove('accessibility-dyslexia-friendly');
      root.style.removeProperty('--accessibility-font-family');
    }

    // Color blind friendly
    if (settings.colorBlindFriendly) {
      root.classList.add('accessibility-colorblind-friendly');
    } else {
      root.classList.remove('accessibility-colorblind-friendly');
    }

    return () => {
      // Cleanup on unmount
      root.classList.remove(
        'accessibility-high-contrast',
        'accessibility-reduced-motion',
        'accessibility-focus-indicators',
        'accessibility-dyslexia-friendly',
        'accessibility-colorblind-friendly'
      );
    };
  }, [settings]);

  const updateSettings = useCallback((newSettings: Partial<AccessibilitySettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('accessibility-settings', JSON.stringify(updated));
  }, [settings]);

  const trapFocus = useCallback((container: HTMLElement): (() => void) => {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    const focusableEls = Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
    const firstFocusableEl = focusableEls[0];
    const lastFocusableEl = focusableEls[focusableEls.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstFocusableEl) {
          e.preventDefault();
          lastFocusableEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastFocusableEl) {
          e.preventDefault();
          firstFocusableEl.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstFocusableEl?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, []);

  const setFocusRing = useCallback((enabled: boolean) => {
    updateSettings({ focusIndicators: enabled });
  }, [updateSettings]);

  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (screenReaderRef.current) {
      screenReaderRef.current.setAttribute('aria-live', priority);
      screenReaderRef.current.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        if (screenReaderRef.current) {
          screenReaderRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  const skipToContent = useCallback(() => {
    const mainContent = document.querySelector('main') || 
                       document.querySelector('[role="main"]') ||
                       document.querySelector('#main-content');
    
    if (mainContent) {
      (mainContent as HTMLElement).focus();
      announceToScreenReader('Skipped to main content');
    }
  }, [announceToScreenReader]);

  const navigateByHeading = useCallback((direction: 'next' | 'previous') => {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')) as HTMLElement[];
    const currentIndex = headings.findIndex(h => h === document.activeElement);
    
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    if (nextIndex >= 0 && nextIndex < headings.length) {
      headings[nextIndex].setAttribute('tabindex', '-1');
      headings[nextIndex].focus();
      announceToScreenReader(`Heading ${headings[nextIndex].tagName.toLowerCase()}: ${headings[nextIndex].textContent}`);
    }
  }, [announceToScreenReader]);

  const navigateByLandmark = useCallback((direction: 'next' | 'previous') => {
    const landmarks = Array.from(document.querySelectorAll('[role], main, nav, header, footer, aside, section')) as HTMLElement[];
    const currentIndex = landmarks.findIndex(l => l === document.activeElement);
    
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    if (nextIndex >= 0 && nextIndex < landmarks.length) {
      landmarks[nextIndex].setAttribute('tabindex', '-1');
      landmarks[nextIndex].focus();
      const role = landmarks[nextIndex].getAttribute('role') || landmarks[nextIndex].tagName.toLowerCase();
      announceToScreenReader(`Landmark: ${role}`);
    }
  }, [announceToScreenReader]);

  const startVoiceNavigation = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      announceToScreenReader('Voice navigation not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const command = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      setVoiceCommands(prev => [...prev.slice(-9), command]); // Keep last 10 commands
      
      handleVoiceCommand(command);
    };

    recognition.onerror = (event) => {
      console.error('Voice recognition error:', event.error);
      announceToScreenReader('Voice recognition error occurred');
    };

    recognition.onend = () => {
      if (isVoiceNavigating) {
        recognition.start(); // Restart if still navigating
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsVoiceNavigating(true);
    announceToScreenReader('Voice navigation started. Say commands like "click button", "go to main", or "read page"');
  }, [isVoiceNavigating, announceToScreenReader]);

  const stopVoiceNavigation = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsVoiceNavigating(false);
    announceToScreenReader('Voice navigation stopped');
  }, [announceToScreenReader]);

  const handleVoiceCommand = useCallback((command: string) => {
    // Button clicks
    if (command.includes('click') || command.includes('press')) {
      const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
      const targetButton = buttons.find(btn => 
        btn.textContent?.toLowerCase().includes(command.replace(/click|press/g, '').trim())
      );
      if (targetButton) {
        targetButton.click();
        announceToScreenReader(`Clicked ${targetButton.textContent}`);
        return;
      }
    }

    // Navigation commands
    if (command.includes('go to main') || command.includes('main content')) {
      skipToContent();
      return;
    }

    if (command.includes('next heading')) {
      navigateByHeading('next');
      return;
    }

    if (command.includes('previous heading')) {
      navigateByHeading('previous');
      return;
    }

    // Read content
    if (command.includes('read page') || command.includes('read content')) {
      const mainContent = document.querySelector('main') || document.body;
      const text = mainContent.textContent || '';
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text.substring(0, 500));
        speechSynthesis.speak(utterance);
      }
      return;
    }

    announceToScreenReader(`Command not recognized: ${command}`);
  }, [skipToContent, navigateByHeading, announceToScreenReader]);

  const scaledFontSize = useCallback((baseSize: number): number => {
    return baseSize * settings.fontSize;
  }, [settings.fontSize]);

  const getAccessibleProps = useCallback((element: string, options: any = {}) => {
    const props: any = {};

    // Common accessibility props
    if (settings.screenReaderOptimized) {
      props['aria-describedby'] = options.describedBy;
      props['aria-label'] = options.label;
    }

    // Element-specific props
    switch (element) {
      case 'button':
        props.role = 'button';
        props.tabIndex = options.disabled ? -1 : 0;
        break;
      case 'link':
        props.role = 'link';
        if (options.external) {
          props['aria-label'] = `${options.label} (opens in new window)`;
        }
        break;
      case 'form':
        props.noValidate = settings.cognitiveAssist;
        break;
    }

    return props;
  }, [settings]);

  const contextValue: AccessibilityContextType = {
    settings,
    updateSettings,
    isHighContrast: settings.highContrast,
    scaledFontSize,
    getAccessibleProps,
    trapFocus,
    setFocusRing,
    announceToScreenReader,
    skipToContent,
    navigateByHeading,
    navigateByLandmark,
    startVoiceNavigation,
    stopVoiceNavigation,
    isVoiceNavigating
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {/* Skip to content link */}
      <Button
        ref={skipLinkRef}
        onClick={skipToContent}
        sx={{
          position: 'absolute',
          left: '-9999px',
          zIndex: 9999,
          '&:focus': {
            left: '50%',
            top: 16,
            transform: 'translateX(-50%)',
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText
          }
        }}
      >
        Skip to main content
      </Button>

      {/* Screen reader announcements */}
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

      {/* Main content */}
      <Box
        sx={{
          fontSize: settings.fontSize !== 1 ? `${settings.fontSize * 100}%` : 'inherit',
          fontFamily: settings.dyslexiaFriendly ? 'var(--accessibility-font-family)' : 'inherit'
        }}
      >
        {children}
      </Box>

      {/* Floating accessibility button */}
      {showFloatingButton && (
        <Fab
          color="primary"
          aria-label="Accessibility settings"
          onClick={() => setPanelOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            zIndex: theme.zIndex.speedDial,
            backgroundColor: settings.highContrast ? '#000' : theme.palette.primary.main,
            '&:hover': {
              backgroundColor: settings.highContrast ? '#333' : theme.palette.primary.dark
            }
          }}
        >
          <AccessibilityIcon />
        </Fab>
      )}

      {/* Voice navigation status */}
      {isVoiceNavigating && (
        <Card
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: theme.zIndex.modal,
            minWidth: 200,
            backgroundColor: theme.palette.info.main,
            color: theme.palette.info.contrastText
          }}
        >
          <CardContent sx={{ padding: 2, '&:last-child': { paddingBottom: 2 } }}>
            <Box display="flex" alignItems="center" gap={1}>
              <VoiceIcon />
              <Typography variant="body2">
                Voice Navigation Active
              </Typography>
              <IconButton
                size="small"
                onClick={stopVoiceNavigation}
                sx={{ color: 'inherit', marginLeft: 'auto' }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            {voiceCommands.length > 0 && (
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Last: "{voiceCommands[voiceCommands.length - 1]}"
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Accessibility Settings Panel */}
      <Dialog
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <AccessibilityIcon />
            <Typography variant="h6">Accessibility Settings</Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <List>
            {/* Font Size */}
            <ListItem>
              <ListItemIcon>
                <TextSizeIcon />
              </ListItemIcon>
              <ListItemText
                primary="Font Size"
                secondary={`${Math.round(settings.fontSize * 100)}%`}
              />
              <Box width={100}>
                <Slider
                  value={settings.fontSize}
                  onChange={(_, value) => updateSettings({ fontSize: value as number })}
                  min={0.8}
                  max={2}
                  step={0.1}
                  marks={[
                    { value: 1, label: '100%' },
                    { value: 1.5, label: '150%' },
                    { value: 2, label: '200%' }
                  ]}
                />
              </Box>
            </ListItem>

            <Divider />

            {/* High Contrast */}
            <ListItem>
              <ListItemIcon>
                <ContrastIcon />
              </ListItemIcon>
              <ListItemText
                primary="High Contrast"
                secondary="Improve color contrast for better visibility"
              />
              <Switch
                checked={settings.highContrast}
                onChange={(e) => updateSettings({ highContrast: e.target.checked })}
              />
            </ListItem>

            {/* Reduced Motion */}
            <ListItem>
              <ListItemIcon>
                <MotionIcon />
              </ListItemIcon>
              <ListItemText
                primary="Reduced Motion"
                secondary="Minimize animations and transitions"
              />
              <Switch
                checked={settings.reducedMotion}
                onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
              />
            </ListItem>

            {/* Screen Reader Optimization */}
            <ListItem>
              <ListItemIcon>
                <VoiceIcon />
              </ListItemIcon>
              <ListItemText
                primary="Screen Reader Optimization"
                secondary="Enhanced support for assistive technologies"
              />
              <Switch
                checked={settings.screenReaderOptimized}
                onChange={(e) => updateSettings({ screenReaderOptimized: e.target.checked })}
              />
            </ListItem>

            {/* Keyboard Navigation */}
            <ListItem>
              <ListItemIcon>
                <KeyboardIcon />
              </ListItemIcon>
              <ListItemText
                primary="Enhanced Keyboard Navigation"
                secondary="Improved keyboard shortcuts and focus management"
              />
              <Switch
                checked={settings.keyboardNavigation}
                onChange={(e) => updateSettings({ keyboardNavigation: e.target.checked })}
              />
            </ListItem>

            {/* Focus Indicators */}
            <ListItem>
              <ListItemIcon>
                <HighlightIcon />
              </ListItemIcon>
              <ListItemText
                primary="Visible Focus Indicators"
                secondary="Clear visual indicators for focused elements"
              />
              <Switch
                checked={settings.focusIndicators}
                onChange={(e) => updateSettings({ focusIndicators: e.target.checked })}
              />
            </ListItem>

            {/* Color Blind Friendly */}
            <ListItem>
              <ListItemIcon>
                <VisibilityIcon />
              </ListItemIcon>
              <ListItemText
                primary="Color Blind Friendly"
                secondary="Alternative visual indicators beyond color"
              />
              <Switch
                checked={settings.colorBlindFriendly}
                onChange={(e) => updateSettings({ colorBlindFriendly: e.target.checked })}
              />
            </ListItem>

            {/* Dyslexia Friendly */}
            <ListItem>
              <ListItemIcon>
                <CognitiveIcon />
              </ListItemIcon>
              <ListItemText
                primary="Dyslexia Friendly"
                secondary="Use dyslexia-friendly fonts and spacing"
              />
              <Switch
                checked={settings.dyslexiaFriendly}
                onChange={(e) => updateSettings({ dyslexiaFriendly: e.target.checked })}
              />
            </ListItem>

            <Divider />

            {/* Voice Navigation */}
            <ListItem>
              <ListItemIcon>
                <VoiceIcon />
              </ListItemIcon>
              <ListItemText
                primary="Voice Navigation"
                secondary={isVoiceNavigating ? "Currently active" : "Control with voice commands"}
              />
              <Button
                variant={isVoiceNavigating ? "outlined" : "contained"}
                size="small"
                onClick={isVoiceNavigating ? stopVoiceNavigation : startVoiceNavigation}
              >
                {isVoiceNavigating ? 'Stop' : 'Start'}
              </Button>
            </ListItem>
          </List>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setPanelOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Global CSS for accessibility */}
      <style>{`
        .accessibility-high-contrast {
          filter: contrast(150%);
        }
        
        .accessibility-high-contrast button {
          border: 2px solid currentColor !important;
        }
        
        .accessibility-reduced-motion * {
          animation-duration: 0.001s !important;
          animation-delay: 0s !important;
          transition-duration: 0.001s !important;
          transition-delay: 0s !important;
        }
        
        .accessibility-focus-indicators *:focus {
          outline: 3px solid #4A90E2 !important;
          outline-offset: 2px !important;
        }
        
        .accessibility-dyslexia-friendly {
          font-family: var(--accessibility-font-family, 'Arial', sans-serif) !important;
          letter-spacing: 0.05em !important;
          line-height: 1.6 !important;
        }
        
        .accessibility-colorblind-friendly .MuiChip-root {
          border: 1px solid currentColor !important;
        }
        
        .accessibility-colorblind-friendly [role="alert"] {
          border-left: 4px solid currentColor !important;
        }
        
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.001s !important;
            transition-duration: 0.001s !important;
          }
        }
        
        @media (prefers-contrast: high) {
          * {
            filter: contrast(120%);
          }
        }
      `}</style>
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityEnhancer');
  }
  return context;
};

// Higher-order component for adding accessibility props
export const withAccessibility = <P extends object>(
  Component: React.ComponentType<P>,
  options: { role?: string; label?: string } = {}
) => {
  const AccessibleComponent = React.forwardRef<any, P>((props, ref) => {
    const { getAccessibleProps } = useAccessibility();
    const accessibleProps = getAccessibleProps(options.role || 'div', options);
    
    return <Component {...props} {...accessibleProps} ref={ref} />;
  });

  AccessibleComponent.displayName = `withAccessibility(${Component.displayName || Component.name})`;
  return AccessibleComponent;
};

export default AccessibilityEnhancer;