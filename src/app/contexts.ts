import { createContext, useContext } from "react";
import type { User } from "firebase/auth";

export type Session = { user: User | null; admin: boolean; ready: boolean };
export const SessionContext = createContext<Session>({
  user: null,
  admin: false,
  ready: false,
});

export type ToastKind = "success" | "error" | "warning" | "info";
export type ToastMessage = { id: number; message: string; kind: ToastKind };
export const ToastContext = createContext<
  (message: string, kind?: ToastKind) => void
>(() => {});
export function useToast() {
  return useContext(ToastContext);
}

export type Basket = {
  items: Record<string, number>;
  change: (id: string, delta: number) => void;
};
export const BasketContext = createContext<Basket>({
  items: {},
  change: () => {},
});
