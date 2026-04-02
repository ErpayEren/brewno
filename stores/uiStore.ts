import { create } from 'zustand';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  subtitle?: string;
}

interface UIState {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],

  showToast: (toast) => {
    const id = Date.now().toString();
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    // Auto-dismiss after 3s
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },

  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
