import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'neutral';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastMessage {
  id: number;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
  durationMs: number;
}

interface PushToastOptions {
  action?: ToastAction;
  durationMs?: number;
}

interface ToastState {
  toasts: ToastMessage[];
  pushToast: (message: string, tone?: ToastTone, options?: PushToastOptions) => void;
  dismissToast: (id: number) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  pushToast: (message, tone = 'neutral', options) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const durationMs = options?.durationMs ?? (tone === 'error' || message.length > 80 ? 6000 : 3600);
    const toast: ToastMessage = {
      id,
      message,
      tone,
      durationMs,
      ...(options?.action ? { action: options.action } : {}),
    };
    set((state) => ({
      toasts: [...state.toasts, toast].slice(-3),
    }));

    window.setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== id),
      }));
    }, durationMs);
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));
