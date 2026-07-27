// Adapted from Kokonut UI's shimmer-text (https://kokonutui.com/docs/texts/shimmer-text)
// for the Dotfumes brand: serif italic type, gold sweep instead of neutral grey,
// and a static gold fallback under prefers-reduced-motion.
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../lib/utils';

interface ShimmerTextProps {
  text: string;
  className?: string;
}

export const ShimmerText = ({ text, className }: ShimmerTextProps) => {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <span className={cn('font-serif italic text-brand-gold', className)}>{text}</span>;
  }

  return (
    <motion.span
      aria-label={text}
      animate={{ backgroundPosition: ['200% center', '-200% center'] }}
      transition={{ duration: 3, ease: 'linear', repeat: Infinity }}
      className={cn(
        'inline-block bg-[length:200%_100%] bg-gradient-to-r from-brand-gold via-accent-gold-strong to-brand-gold bg-clip-text font-serif italic text-transparent',
        className,
      )}
    >
      {text}
    </motion.span>
  );
};

export default ShimmerText;
