import React, { useState } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface AnimatedButtonProps {
  children: React.ReactNode;
  onClick?: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

const variantClasses = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700',
  secondary: 'bg-gray-600 hover:bg-gray-700 text-white border-gray-600 hover:border-gray-700',
  success: 'bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700',
  danger: 'bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700',
  outline: 'bg-transparent hover:bg-blue-50 text-blue-600 border-blue-600 hover:border-blue-700'
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg'
};

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  className = '',
  type = 'button'
}) => {
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = async () => {
    if (disabled || loading) return;
    
    setIsClicked(true);
    
    if (onClick) {
      await onClick();
    }
    
    setTimeout(() => setIsClicked(false), 150);
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={isDisabled}
      className={`
        relative inline-flex items-center justify-center
        font-medium border rounded-lg
        transition-all duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        transform hover:scale-[1.02] active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${isClicked ? 'animate-pulse' : ''}
        ${className}
      `}
    >
      {loading && (
        <LoadingSpinner 
          size="sm" 
          color={variant === 'outline' ? 'blue' : 'white'} 
          className="mr-2" 
        />
      )}
      {!loading && icon && (
        <span className="mr-2">{icon}</span>
      )}
      <span className={loading ? 'opacity-75' : ''}>{children}</span>
    </button>
  );
};

export const FloatingButton: React.FC<AnimatedButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        fixed bottom-6 right-6 z-50
        w-14 h-14 rounded-full
        shadow-lg hover:shadow-xl
        transition-all duration-300 ease-out
        transform hover:scale-110 active:scale-95
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {loading ? (
        <LoadingSpinner size="sm" color="white" />
      ) : (
        <span className={`transition-transform duration-200 ${isHovered ? 'scale-110' : ''}`}>
          {icon || children}
        </span>
      )}
    </button>
  );
};