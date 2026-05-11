import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useToastStore } from '../store/useToastStore';
import { cn } from '../lib/utils';

export const ToastViewport = () => {
  const { toasts, dismissToast } = useToastStore();

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-5 right-5 z-[140] flex w-[calc(100%-2.5rem)] max-w-sm flex-col gap-3"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'flex items-start justify-between gap-5 border bg-brand-black px-5 py-4 text-white shadow-2xl backdrop-blur-xl',
              toast.tone === 'success' && 'border-brand-gold/35',
              toast.tone === 'error' && 'border-red-400/40',
              toast.tone === 'neutral' && 'border-white/10',
            )}
          >
            <p className="text-[11px] uppercase leading-6 tracking-[0.24em] text-white/78">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="mt-0.5 text-white/45 transition-colors hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-gold"
              aria-label="Dismiss notification"
            >
              <X size={14} strokeWidth={1.4} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
