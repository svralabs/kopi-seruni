export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

type Listener = (toast: ToastItem) => void;
const listeners = new Set<Listener>();

export const toast = {
  success(message: string) {
    emit({ id: Math.random().toString(36).slice(2), message, type: 'success' });
  },
  error(message: string) {
    emit({ id: Math.random().toString(36).slice(2), message, type: 'error' });
  },
  warning(message: string) {
    emit({ id: Math.random().toString(36).slice(2), message, type: 'warning' });
  },
  info(message: string) {
    emit({ id: Math.random().toString(36).slice(2), message, type: 'info' });
  },
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};

function emit(item: ToastItem) {
  listeners.forEach((fn) => fn(item));
}
