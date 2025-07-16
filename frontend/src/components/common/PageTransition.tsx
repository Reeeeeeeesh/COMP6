import React, { useEffect, useState } from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ 
  children, 
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`transition-all duration-500 ease-out ${
      isVisible 
        ? 'opacity-100 translate-y-0' 
        : 'opacity-0 translate-y-4'
    } ${className}`}>
      {children}
    </div>
  );
};

export const FadeTransition: React.FC<PageTransitionProps> = ({ 
  children, 
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`transition-opacity duration-300 ease-in-out ${
      isVisible ? 'opacity-100' : 'opacity-0'
    } ${className}`}>
      {children}
    </div>
  );
};

export const SlideTransition: React.FC<PageTransitionProps> = ({ 
  children, 
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`transition-all duration-400 ease-out ${
      isVisible 
        ? 'opacity-100 translate-x-0' 
        : 'opacity-0 translate-x-8'
    } ${className}`}>
      {children}
    </div>
  );
};