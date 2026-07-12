import { AnimatePresence } from 'motion/react';
import { useToastStore } from '../store/useToastStore';
import { cn } from '../lib/utils';
import { useCartStore } from '../store/useCartStore';
import { Toast } from './ui/feedback/Toast';

export const ToastViewport = () => {
  const { toasts, dismissToast } = useToastStore();
  const isCartOpen = useCartStore((state) => state.isOpen);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'pointer-events-none fixed z-[140] flex flex-col gap-3',
        isCartOpen
          ? 'left-4 right-4 top-[calc(0.75rem+env(safe-area-inset-top))] sm:left-5 sm:right-auto sm:w-full sm:max-w-sm'
          : 'left-4 right-4 top-[calc(0.75rem+env(safe-area-inset-top))] sm:left-auto sm:right-5 sm:top-auto sm:bottom-[calc(1.25rem+env(safe-area-inset-bottom))] sm:w-[calc(100%-2.5rem)] sm:max-w-sm',
      )}
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            tone={toast.tone}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
