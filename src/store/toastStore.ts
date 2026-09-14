import { create } from "zustand";

export type ToastVariant = "success" | "info" | "error";

interface ToastState {
  message: string | null;
  variant: ToastVariant;
  show: (message: string, variant?: ToastVariant) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  variant: "info",
  show: (message, variant = "info") => set({ message, variant }),
  hide: () => set({ message: null }),
}));

export function showToast(message: string, variant: ToastVariant = "info") {
  useToastStore.getState().show(message, variant);
}
