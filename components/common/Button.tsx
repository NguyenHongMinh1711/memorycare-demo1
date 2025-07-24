import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  isLoading = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'font-semibold rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all duration-200 ease-in-out flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none shadow-sm hover:shadow-md';

  const variantStyles = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500',
    secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300 focus-visible:ring-slate-400 border border-slate-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500',
    ghost: 'bg-transparent text-indigo-600 hover:bg-indigo-100 focus-visible:ring-indigo-500 shadow-none',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
  };

  const spinnerOnly = isLoading && !children;

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && (
        <svg className={`animate-spin h-5 w-5 text-current ${!spinnerOnly ? '-ml-1 mr-3' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {!isLoading && leftIcon}
      <span className={`${leftIcon && !isLoading ? 'ml-2' : ''} ${rightIcon && !isLoading ? 'mr-2' : ''}`}>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};

export default Button;