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
  clear: () => void;
};
export const BasketContext = createContext<Basket>({
  items: {},
  change: () => {},
  clear: () => {},
});

export type Theme = "light" | "dark";
export type ThemeSettings = {
  theme: Theme;
  ready: boolean;
  chooseTheme: (theme: Theme) => Promise<void>;
};
export const ThemeContext = createContext<ThemeSettings>({
  theme: "light",
  ready: false,
  chooseTheme: async () => {},
});
