import { type HTMLAttributes, forwardRef, useEffect, useRef, type ReactNode } from 'react';

interface ModalProps extends HTMLAttributes<HTMLDialogElement> {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

const Modal = forwardRef<HTMLDialogElement, ModalProps>(
  ({ open, onClose, title, children, className = '', ...rest }, ref) => {
    const dialogRef = useRef<HTMLDialogElement | null>(null);

    // Sync the open prop with the native <dialog> API
    useEffect(() => {
      const el = dialogRef.current;
      if (!el) return;
      if (open && !el.open) el.showModal();
      if (!open && el.open) el.close();
    }, [open]);

    return (
      <dialog
        ref={(node) => {
          dialogRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        onClose={onClose}
        className={`
          backdrop:bg-black/60 backdrop:backdrop-blur-sm
          bg-bg-raised text-text-primary
          border border-border rounded-[var(--radius-xl)]
          p-0 w-full max-w-lg
          shadow-2xl
          animate-fade-in
          ${className}
        `}
        {...rest}
      >
        {title && (
          <header className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary transition-colors cursor-pointer text-xl leading-none"
              aria-label="Close"
            >
              ✕
            </button>
          </header>
        )}
        <div className="px-6 py-5">{children}</div>
      </dialog>
    );
  }
);

Modal.displayName = 'Modal';
export default Modal;
