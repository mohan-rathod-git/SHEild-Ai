import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';

type IconButtonVariant = 'default' | 'danger';
type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  label: string; // required for a11y
}

const variantStyles: Record<IconButtonVariant, string> = {
  default:
    'text-text-secondary hover:text-text-primary hover:bg-bg-surface border-transparent hover:border-border',
  danger:
    'text-danger hover:text-danger-hover hover:bg-danger-muted border-transparent hover:border-danger/30',
};

const sizeStyles: Record<IconButtonSize, string> = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
};

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, variant = 'default', size = 'md', label, className = '', ...rest }, ref) => {
    return (
      <button
        ref={ref}
        aria-label={label}
        className={`
          inline-flex items-center justify-center
          rounded-[var(--radius-md)] border
          transition-all duration-200
          focus-ring cursor-pointer
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...rest}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
export default IconButton;
