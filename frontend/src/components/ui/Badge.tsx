import { type HTMLAttributes, forwardRef } from 'react';

type BadgeVariant = 'default' | 'accent' | 'danger' | 'safe';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-bg-surface text-text-secondary border-border',
  accent:  'bg-accent-muted text-accent border-accent/30',
  danger:  'bg-danger-muted text-danger border-danger/30',
  safe:    'bg-safe-muted text-safe border-safe/30',
};

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', className = '', children, ...rest }, ref) => {
    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center gap-1
          px-2.5 py-0.5 text-xs font-medium
          border rounded-[var(--radius-full)]
          ${variantStyles[variant]}
          ${className}
        `}
        {...rest}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
export default Badge;
