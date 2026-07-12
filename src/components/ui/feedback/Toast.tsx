import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../primitives/Button';
import type { ToastTone } from '../../../store/useToastStore';
import { easing, duration } from '../../../styles/tokens/motion';

export interface ToastProps {
  message: string;
  tone: ToastTone;
  onDismiss: () => void;
}

/** Single toast card, extracted from ToastViewport's inline render. */
export const Toast = ({ message, tone, onDismiss }: ToastProps) => (
  <motion.div
    initial={{ opacity: 0, y: 18, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 10, scale: 0.98 }}
    transition={{ duration: duration.base, ease: easing.cinematic }}
    className={cn(
      'flex items-start justify-between gap-5 border bg-brand-black px-5 py-4 text-white shadow-lg backdrop-blur-xl',
      tone === 'success' && 'border-brand-gold/35',
      tone === 'error' && 'border-red-400/40',
      tone === 'neutral' && 'border-white/10',
      'pointer-events-auto',
    )}
  >
    <p className="text-[11px] uppercase leading-6 tracking-[0.24em] text-white/78">{message}</p>
    <Button
      variant="ghost"
      onClick={onDismiss}
      className="mt-0.5 p-0 normal-case tracking-normal text-white/45 hover:text-white"
      aria-label="Dismiss notification"
    >
      <X size={14} strokeWidth={1.4} />
    </Button>
  </motion.div>
);
