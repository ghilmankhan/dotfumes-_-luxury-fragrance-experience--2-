import { memo } from 'react';
import { AnimatePresence } from 'motion/react';
import { useToastStore } from '../store/useToastStore';
import type { ToastMessage } from '../store/useToastStore';
import { cn } from '../lib/utils';
import { useCartStore } from '../store/useCartStore';
import { Toast } from './ui/feedback/Toast';

const ToastItem = memo(({ id, message, tone, action, durationMs }: ToastMessage) => {
  const handleDismiss = () => useToastStore.getState().dismissToast(id);

  return (
    <Toast
      message={message}
      tone={tone}
      durationMs={durationMs}
      onDismiss={handleDismiss}
      {...(action ? { action } : {})}
    />
  );
});

ToastItem.displayName = 'ToastItem';

export const ToastViewport = () => {
  const toasts = useToastStore((state) => state.toasts);
  const isCartOpen = useCartStore((state) => state.isOpen);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'pointer-events-none fixed z-140 flex flex-col gap-3',
        isCartOpen
          ? 'toast-position toast-position-cart left-4 right-4 sm:left-5 sm:right-auto sm:w-full sm:max-w-sm'
          : 'toast-position left-4 right-4 sm:left-auto sm:right-5 sm:max-w-sm toast-mobile-width',
      )}
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} {...toast} />
        ))}
      </AnimatePresence>
    </div>
  );
};
