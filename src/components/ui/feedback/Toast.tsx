import { motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../primitives/Button';
import type { ToastAction, ToastTone } from '../../../store/useToastStore';
import { easing, duration } from '../../../styles/tokens/motion';

export interface ToastProps {
  message: string;
  tone: ToastTone;
  action?: ToastAction;
  durationMs?: number;
  onDismiss: () => void;
}

/** Single toast card, extracted from ToastViewport's inline render. */
export const Toast = ({ message, tone, action, durationMs, onDismiss }: ToastProps) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? {} : { opacity: 0, y: 10, scale: 0.98 }}
      transition={{ duration: reduceMotion ? 0 : duration.base, ease: easing.cinematic }}
      className={cn(
        'relative flex items-start justify-between gap-6 overflow-hidden border bg-brand-black px-4 py-4 text-brand-white shadow-lg backdrop-blur-xl',
        tone === 'success' && 'border-accent-muted',
        tone === 'error' && 'border-status-error',
        tone === 'neutral' && 'border-on-dark-subtle',
        'pointer-events-auto',
      )}
    >
      <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-small uppercase leading-6 tracking-wide text-on-dark-secondary">
          {message}
        </p>
        {action ? (
          <Button
            variant="ghost"
            onClick={() => {
              action.onClick();
              onDismiss();
            }}
            className="p-0 normal-case tracking-normal text-brand-gold underline underline-offset-2 hover:text-brand-white"
          >
            {action.label}
          </Button>
        ) : null}
      </div>
      <Button
        variant="ghost"
        onClick={onDismiss}
        className="-mx-4 -mb-4 -mt-3 min-h-11 min-w-11 p-0 normal-case tracking-normal text-on-dark-muted hover:text-brand-white"
        aria-label="Dismiss notification"
      >
        <X size={14} strokeWidth={1.4} />
      </Button>
      {durationMs && !reduceMotion ? (
        <motion.div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px origin-left bg-brand-gold"
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: durationMs / 1000, ease: 'linear' }}
        />
      ) : null}
    </motion.div>
  );
};
