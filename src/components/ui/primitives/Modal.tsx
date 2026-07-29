import { ReactNode, RefObject, useEffect, useId, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn } from '../../../lib/utils';
import { Overlay } from './Overlay';
import { easing } from '../../../styles/tokens/motion';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  ariaLabel: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  id?: string;
  /** Extra classes for the backdrop (color, z-index, responsive visibility). */
  overlayClassName: string;
  /** Extra classes for the dialog panel (width, color theme, z-index, responsive visibility). */
  dialogClassName: string;
  /** Slide-in transition duration in seconds. */
  transitionDuration?: number;
  /** Optional ref to the element that opened the modal. */
  triggerRef?: RefObject<HTMLElement | null>;
}

const focusableSelector =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  ariaLabelledBy,
  ariaDescribedBy,
  id,
  overlayClassName,
  dialogClassName,
  transitionDuration = 0.55,
  triggerRef,
}: ModalProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const generatedId = useId();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const restoreTarget =
      triggerRef?.current ??
      (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const getFocusableElements = () =>
      Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []).filter(
        (element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true',
      );

    const focusable = getFocusableElements();
    (focusable[0] ?? dialogRef.current)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const currentFocusable = getFocusableElements();
      if (currentFocusable.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = currentFocusable[0];
      const last = currentFocusable[currentFocusable.length - 1];

      if (
        event.shiftKey &&
        (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!dialogRef.current?.contains(event.target as Node)) {
        (getFocusableElements()[0] ?? dialogRef.current)?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
      if (restoreTarget?.isConnected) {
        restoreTarget.focus();
      }
    };
  }, [isOpen, triggerRef]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <Overlay onClick={() => onCloseRef.current()} className={overlayClassName} />
          <motion.div
            id={id ?? `modal-${generatedId}`}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabelledBy ? undefined : ariaLabel}
            aria-labelledby={ariaLabelledBy}
            aria-describedby={ariaDescribedBy}
            tabIndex={-1}
            initial={reduceMotion ? false : { x: '100%' }}
            animate={{ x: 0 }}
            exit={reduceMotion ? {} : { x: '100%' }}
            transition={{
              duration: reduceMotion ? 0 : transitionDuration,
              ease: easing.cinematic,
            }}
            className={cn(
              'fixed right-0 top-0 motion-reduce:transform-none motion-reduce:transition-none',
              dialogClassName,
            )}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
