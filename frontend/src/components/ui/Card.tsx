import { type HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds a subtle glow border — use sparingly */
  glow?: boolean;
  /** Removes all padding */
  flush?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ glow, flush, className = '', children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          bg-bg-raised border border-border
          rounded-[var(--radius-lg)]
          transition-all duration-200
          ${glow ? 'shadow-[0_0_30px_rgba(6,182,212,0.08)] border-accent/20' : ''}
          ${flush ? '' : 'p-5'}
          ${className}
        `}
        {...rest}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
export default Card;
