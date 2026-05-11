import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'neutral';

export interface ToastMessage {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: ToastMessage[];
  pushToast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: number) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  pushToast: (message, tone = 'neutral') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    set((state) => ({
      toasts: [...state.toasts, { id, message, tone }].slice(-3),
    }));

    window.setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== id),
      }));
    }, 3600);
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));
