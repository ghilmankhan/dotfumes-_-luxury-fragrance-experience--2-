import { ReactNode, RefObject, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../../lib/utils';
import { Overlay } from './Overlay';
import { easing } from '../../../styles/tokens/motion';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  ariaLabel: string;
  id?: string;
  /** Extra classes for the backdrop (color, z-index, responsive visibility). */
  overlayClassName: string;
  /** Extra classes for the dialog panel (width, color theme, z-index, responsive visibility). */
  dialogClassName: string;
  /** Slide-in transition duration in seconds. */
  transitionDuration?: number;
  /** Optional ref to the element that opened the modal, focused again on Escape close. */
  triggerRef?: RefObject<HTMLElement | null>;
}

const focusableSelector =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Shared right-side drawer/modal shell: backdrop + dialog panel with
 * focus-trap, Escape-to-close, click-outside-to-close, and body scroll lock.
 * Extracted from the previously duplicated CartDrawer / Navbar mobile menu logic.
 */
export const Modal = ({
  isOpen,
  onClose,
  children,
  ariaLabel,
  id,
  overlayClassName,
  dialogClassName,
  transitionDuration = 0.55,
  triggerRef,
}: ModalProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
    );
    focusable[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        triggerRef?.current?.focus();
        return;
      }

      if (event.key !== 'Tab' || focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <Overlay onClick={onClose} className={overlayClassName} />
          <motion.div
            id={id}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: transitionDuration, ease: easing.cinematic }}
            className={cn('fixed right-0 top-0', dialogClassName)}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
