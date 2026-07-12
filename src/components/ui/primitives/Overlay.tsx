import { motion } from 'motion/react';
import { cn } from '../../../lib/utils';
import { easing } from '../../../styles/tokens/motion';

export interface OverlayProps {
  onClick: () => void;
  className?: string;
}

/**
 * Shared full-screen backdrop used behind slide-in drawers/modals.
 * Callers control z-index and color via className so this can serve both
 * light (CartDrawer) and dark (Navbar mobile menu) contexts.
 */
export const Overlay = ({ onClick, className }: OverlayProps) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.4, ease: easing.cinematic }}
    onClick={onClick}
    className={cn('fixed inset-0 backdrop-blur-sm', className)}
    aria-hidden="true"
  />
);
