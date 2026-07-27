// Internal reference for Modal + Overlay (src/components/ui/primitives/{Modal,Overlay}.tsx).
// Not routed.
import { useRef, useState } from 'react';
import { Modal } from '../../components/ui/primitives/Modal';
import { Button } from '../../components/ui/primitives/Button';

export const ModalDocs = () => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="space-y-10 bg-brand-white p-10 text-brand-black">
      <section>
        <h2 className="mb-4 text-body font-bold uppercase tracking-widest">Usage</h2>
        <p className="mb-3 max-w-2xl text-label text-on-light-secondary">
          Modal owns the shell (backdrop via Overlay, slide-in panel, focus-trap, Escape-to-close,
          body scroll lock, ARIA dialog role). It does not own visual theme — callers pass
          overlayClassName/dialogClassName so the same shell serves CartDrawer's light panel and
          Navbar's dark mobile-menu panel. There is no separate "custom overlay" path; every
          drawer/dialog in the app must go through this component.
        </p>
        <Button ref={triggerRef} variant="primary" onClick={() => setIsOpen(true)}>
          Open example drawer
        </Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          ariaLabel="Example drawer"
          triggerRef={triggerRef}
          overlayClassName="z-100 bg-surface-overlay-muted"
          dialogClassName="z-101 h-full w-full max-w-md bg-brand-white p-8"
        >
          <p className="text-body">Drawer content.</p>
          <Button variant="outline" onClick={() => setIsOpen(false)} className="mt-6">
            Close
          </Button>
        </Modal>
      </section>

      <section>
        <h2 className="mb-4 text-body font-bold uppercase tracking-widest">Edge cases covered</h2>
        <ul className="list-disc space-y-1 pl-4 text-label text-on-light-secondary">
          <li>Escape key closes and returns focus to triggerRef.</li>
          <li>Tab/Shift+Tab wraps within the dialog's focusable elements.</li>
          <li>Body scroll is locked while open, restored on close.</li>
          <li>Backdrop click closes via Overlay's onClick.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-body font-bold uppercase tracking-widest">Reference</h2>
        <pre className="overflow-x-auto bg-surface-overlay-subtle p-4 text-label">
          {`<Modal
  isOpen={isCartOpen}
  onClose={closeCart}
  ariaLabel="Shopping cart"
  triggerRef={cartTriggerRef}
  overlayClassName="z-120 bg-surface-overlay-muted"
  dialogClassName="z-121 h-full w-full max-w-md bg-brand-white"
>
  {/* drawer content */}
</Modal>`}
        </pre>
      </section>
    </div>
  );
};
