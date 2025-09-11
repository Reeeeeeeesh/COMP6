import { useTheme, useMediaQuery, Theme } from '@mui/material';
import { useEffect, useState } from 'react';

// Standard breakpoint definitions
export const breakpoints = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
  // Custom breakpoints for specific use cases
  mobile: 768,
  tablet: 1024,
  desktop: 1200,
  widescreen: 1440
} as const;

export type BreakpointKey = keyof typeof breakpoints;

// Device type detection
export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'widescreen';

export interface ResponsiveConfig {
  mobile?: any;
  tablet?: any;
  desktop?: any;
  widescreen?: any;
}

export interface ViewportInfo {
  width: number;
  height: number;
  deviceType: DeviceType;
  orientation: 'portrait' | 'landscape';
  aspectRatio: number;
  isTouchDevice: boolean;
  isRetina: boolean;
  availableHeight: number; // Height minus browser chrome
  safeAreaInsets: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface ResponsiveValue<T> {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  mobile?: T;
  tablet?: T;
  desktop?: T;
  widescreen?: T;
}

// Custom hook for viewport information
export const useViewportInfo = (): ViewportInfo => {
  const [viewportInfo, setViewportInfo] = useState<ViewportInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 1920,
        height: 1080,
        deviceType: 'desktop',
        orientation: 'landscape',
        aspectRatio: 16/9,
        isTouchDevice: false,
        isRetina: false,
        availableHeight: 1080,
        safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 }
      };
    }

    return calculateViewportInfo();
  });

  useEffect(() => {
    const updateViewportInfo = () => {
      setViewportInfo(calculateViewportInfo());
    };

    updateViewportInfo();
    window.addEventListener('resize', updateViewportInfo);
    window.addEventListener('orientationchange', updateViewportInfo);

    return () => {
      window.removeEventListener('resize', updateViewportInfo);
      window.removeEventListener('orientationchange', updateViewportInfo);
    };
  }, []);

  return viewportInfo;
};

const calculateViewportInfo = (): ViewportInfo => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const orientation = width > height ? 'landscape' : 'portrait';
  const aspectRatio = width / height;
  
  // Detect device type based on width and touch capability
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  let deviceType: DeviceType;
  
  if (width < breakpoints.mobile) {
    deviceType = 'mobile';
  } else if (width < breakpoints.desktop) {
    deviceType = 'tablet';
  } else if (width < breakpoints.widescreen) {
    deviceType = 'desktop';
  } else {
    deviceType = 'widescreen';
  }

  // Calculate safe area insets (for notched devices)
  const safeAreaInsets = {
    top: parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)') || '0'),
    right: parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-right)') || '0'),
    bottom: parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)') || '0'),
    left: parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-left)') || '0')
  };

  return {
    width,
    height,
    deviceType,
    orientation,
    aspectRatio,
    isTouchDevice,
    isRetina: window.devicePixelRatio > 1,
    availableHeight: height - safeAreaInsets.top - safeAreaInsets.bottom,
    safeAreaInsets
  };
};

// Custom hook for responsive values
export const useResponsiveValue = <T>(values: ResponsiveValue<T>, defaultValue: T): T => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.only('xs'));
  const isSm = useMediaQuery(theme.breakpoints.only('sm'));
  const isMd = useMediaQuery(theme.breakpoints.only('md'));
  const isLg = useMediaQuery(theme.breakpoints.only('lg'));
  const isXl = useMediaQuery(theme.breakpoints.up('xl'));
  
  const isMobile = useMediaQuery(`(max-width: ${breakpoints.mobile}px)`);
  const isTablet = useMediaQuery(`(min-width: ${breakpoints.mobile + 1}px) and (max-width: ${breakpoints.desktop}px)`);
  const isDesktop = useMediaQuery(`(min-width: ${breakpoints.desktop + 1}px) and (max-width: ${breakpoints.widescreen}px)`);
  const isWidescreen = useMediaQuery(`(min-width: ${breakpoints.widescreen + 1}px)`);

  // Priority: specific breakpoint > device type > default
  if (isXl && values.xl !== undefined) return values.xl;
  if (isLg && values.lg !== undefined) return values.lg;
  if (isMd && values.md !== undefined) return values.md;
  if (isSm && values.sm !== undefined) return values.sm;
  if (isXs && values.xs !== undefined) return values.xs;
  
  if (isWidescreen && values.widescreen !== undefined) return values.widescreen;
  if (isDesktop && values.desktop !== undefined) return values.desktop;
  if (isTablet && values.tablet !== undefined) return values.tablet;
  if (isMobile && values.mobile !== undefined) return values.mobile;

  return defaultValue;
};

// Utility to get responsive spacing
export const getResponsiveSpacing = (theme: Theme, config: ResponsiveConfig): any => {
  return {
    [theme.breakpoints.down('md')]: config.mobile,
    [theme.breakpoints.between('md', 'lg')]: config.tablet,
    [theme.breakpoints.up('lg')]: config.desktop || config.widescreen
  };
};

// Utility to get responsive typography
export const getResponsiveTypography = (
  theme: Theme,
  mobile: keyof Theme['typography'],
  tablet?: keyof Theme['typography'],
  desktop?: keyof Theme['typography']
): any => {
  return {
    [theme.breakpoints.down('md')]: theme.typography[mobile],
    [theme.breakpoints.between('md', 'lg')]: theme.typography[tablet || mobile],
    [theme.breakpoints.up('lg')]: theme.typography[desktop || tablet || mobile]
  };
};

// Utility to create responsive grid configurations
export const createResponsiveGrid = (
  mobile: number,
  tablet?: number,
  desktop?: number,
  widescreen?: number
) => ({
  xs: mobile,
  md: tablet || mobile,
  lg: desktop || tablet || mobile,
  xl: widescreen || desktop || tablet || mobile
});

// Utility for responsive container max widths
export const getResponsiveContainer = (theme: Theme) => ({
  maxWidth: {
    xs: '100%',
    sm: theme.breakpoints.values.sm,
    md: theme.breakpoints.values.md,
    lg: theme.breakpoints.values.lg,
    xl: theme.breakpoints.values.xl
  },
  margin: '0 auto',
  paddingLeft: {
    xs: theme.spacing(2),
    sm: theme.spacing(3),
    md: theme.spacing(4)
  },
  paddingRight: {
    xs: theme.spacing(2),
    sm: theme.spacing(3),
    md: theme.spacing(4)
  }
});

// Touch-friendly sizing utilities
export const getTouchFriendlySize = (isMobile: boolean, baseSize: number = 40): number => {
  return isMobile ? Math.max(baseSize, 44) : baseSize; // 44px minimum for iOS
};

export const getTouchFriendlySpacing = (isMobile: boolean, baseSpacing: number = 8): number => {
  return isMobile ? Math.max(baseSpacing, 16) : baseSpacing;
};

// Responsive image utilities
export const getResponsiveImageSizes = (breakpoints: { [key: string]: string }) => {
  return Object.entries(breakpoints)
    .map(([breakpoint, size]) => `(max-width: ${breakpoint}px) ${size}`)
    .join(', ');
};

// Text scaling utilities
export const getResponsiveFontSize = (
  baseSize: number,
  scaleFactor: number = 0.875
): ResponsiveValue<string> => ({
  mobile: `${baseSize * scaleFactor}px`,
  tablet: `${baseSize}px`,
  desktop: `${baseSize}px`,
  widescreen: `${baseSize * 1.125}px`
});

// Layout utilities
export const getResponsiveLayout = (isMobile: boolean, isTablet: boolean) => ({
  flexDirection: isMobile ? 'column' : 'row',
  gap: isMobile ? 2 : isTablet ? 3 : 4,
  padding: isMobile ? 1 : isTablet ? 2 : 3
});

// Animation duration utilities (slower on mobile for better UX)
export const getResponsiveAnimationDuration = (baseDuration: number = 300): ResponsiveValue<number> => ({
  mobile: baseDuration * 1.2,
  tablet: baseDuration,
  desktop: baseDuration,
  widescreen: baseDuration * 0.8
});

// Responsive modal/dialog utilities
export const getResponsiveDialog = (isMobile: boolean) => ({
  fullScreen: isMobile,
  maxWidth: isMobile ? false : 'md',
  fullWidth: true,
  margin: isMobile ? 0 : 2,
  borderRadius: isMobile ? 0 : 2
});

// Form field sizing utilities
export const getResponsiveFormField = (isMobile: boolean, isTablet: boolean) => ({
  size: isMobile ? 'medium' : 'small',
  fullWidth: isMobile || isTablet,
  margin: isMobile ? 'normal' : 'dense',
  inputProps: {
    style: {
      fontSize: isMobile ? '16px' : '14px', // Prevents zoom on iOS
      minHeight: isMobile ? '44px' : 'auto'
    }
  }
});

// Table/data display utilities
export const getResponsiveTable = (isMobile: boolean) => ({
  stickyHeader: !isMobile,
  size: isMobile ? 'medium' : 'small',
  padding: isMobile ? 'normal' : 'checkbox'
});

// Card layout utilities
export const getResponsiveCard = (isMobile: boolean, isTablet: boolean) => ({
  elevation: isMobile ? 1 : 2,
  sx: {
    margin: isMobile ? 1 : 2,
    borderRadius: isMobile ? 2 : 3,
    '& .MuiCardContent-root': {
      padding: isMobile ? 2 : isTablet ? 2.5 : 3,
      '&:last-child': {
        paddingBottom: isMobile ? 2 : isTablet ? 2.5 : 3
      }
    },
    '& .MuiCardActions-root': {
      padding: isMobile ? 1 : 2,
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? 1 : 0.5
    }
  }
});

// Navigation utilities
export const getResponsiveNavigation = (isMobile: boolean) => ({
  variant: isMobile ? 'temporary' : 'permanent',
  anchor: 'left',
  elevation: isMobile ? 16 : 1,
  sx: {
    '& .MuiDrawer-paper': {
      width: isMobile ? '280px' : '240px',
      boxSizing: 'border-box'
    }
  }
});

// Fab positioning utilities
export const getResponsiveFab = (isMobile: boolean) => ({
  sx: {
    position: 'fixed',
    bottom: isMobile ? 16 : 24,
    right: isMobile ? 16 : 24,
    zIndex: 1050
  },
  size: isMobile ? 'large' : 'medium'
});

// Content density utilities
export const getContentDensity = (deviceType: DeviceType): 'compact' | 'comfortable' | 'spacious' => {
  switch (deviceType) {
    case 'mobile': return 'compact';
    case 'tablet': return 'comfortable';
    case 'desktop': return 'comfortable';
    case 'widescreen': return 'spacious';
    default: return 'comfortable';
  }
};

// Safe area utilities for notched devices
export const getSafeAreaPadding = (safeAreaInsets: ViewportInfo['safeAreaInsets']) => ({
  paddingTop: `max(16px, ${safeAreaInsets.top}px)`,
  paddingRight: `max(16px, ${safeAreaInsets.right}px)`,
  paddingBottom: `max(16px, ${safeAreaInsets.bottom}px)`,
  paddingLeft: `max(16px, ${safeAreaInsets.left}px)`
});

// Responsive grid system
export const createFluidGrid = (columns: number, gap: number = 16) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(${Math.floor(300 / columns)}px, 1fr))`,
  gap: `${gap}px`,
  '@media (max-width: 600px)': {
    gridTemplateColumns: '1fr'
  }
});

// Performance utilities
export const shouldUseReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const getOptimalImageFormat = (): 'webp' | 'avif' | 'jpg' => {
  if ('createImageBitmap' in window) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx?.drawImage) {
      // Check for AVIF support
      const avifCanvas = document.createElement('canvas');
      avifCanvas.toBlob = avifCanvas.toBlob || (() => {});
      try {
        avifCanvas.toBlob(() => {}, 'image/avif');
        return 'avif';
      } catch {
        // Check for WebP support
        try {
          avifCanvas.toBlob(() => {}, 'image/webp');
          return 'webp';
        } catch {
          return 'jpg';
        }
      }
    }
  }
  return 'jpg';
};

// Theme customization based on device
export const getDeviceSpecificTheme = (theme: Theme, deviceType: DeviceType) => {
  const baseSpacing = deviceType === 'mobile' ? 8 : 12;
  
  return {
    ...theme,
    spacing: (factor: number) => `${baseSpacing * factor}px`,
    components: {
      ...theme.components,
      MuiButton: {
        ...theme.components?.MuiButton,
        styleOverrides: {
          ...theme.components?.MuiButton?.styleOverrides,
          root: {
            minHeight: deviceType === 'mobile' ? '44px' : '36px',
            fontSize: deviceType === 'mobile' ? '16px' : '14px'
          }
        }
      },
      MuiTextField: {
        ...theme.components?.MuiTextField,
        styleOverrides: {
          ...theme.components?.MuiTextField?.styleOverrides,
          root: {
            '& .MuiInputBase-root': {
              minHeight: deviceType === 'mobile' ? '48px' : '40px',
              fontSize: deviceType === 'mobile' ? '16px' : '14px'
            }
          }
        }
      }
    }
  };
};

export default {
  breakpoints,
  useViewportInfo,
  useResponsiveValue,
  getResponsiveSpacing,
  getResponsiveTypography,
  createResponsiveGrid,
  getResponsiveContainer,
  getTouchFriendlySize,
  getTouchFriendlySpacing,
  getResponsiveFontSize,
  getResponsiveLayout,
  getResponsiveAnimationDuration,
  getResponsiveDialog,
  getResponsiveFormField,
  getResponsiveTable,
  getResponsiveCard,
  getResponsiveNavigation,
  getResponsiveFab,
  getContentDensity,
  getSafeAreaPadding,
  createFluidGrid,
  shouldUseReducedMotion,
  getOptimalImageFormat,
  getDeviceSpecificTheme
};