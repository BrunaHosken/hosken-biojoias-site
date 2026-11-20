import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { onIdTokenChanged } from "firebase/auth";
import {
  BasketContext,
  SessionContext,
  ToastContext,
  type Session,
  type ToastKind,
  type ToastMessage,
} from "./contexts";
import { auth, localMode } from "../firebase";
import { ToastNotice } from "../components/Feedback";

const publicPreview = import.meta.env.VITE_PUBLIC_PREVIEW === "true";

function readBasket(): Record<string, number> {
  try {
    const value = JSON.parse(localStorage.getItem("hosken-cart") || "{}");
    return Object.fromEntries(
      Object.entries(value).filter(
        ([, quantity]) =>
          Number.isInteger(quantity) &&
          Number(quantity) > 0 &&
          Number(quantity) <= 99,
      ),
    ) as Record<string, number>;
  } catch {
    return {};
  }
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({
    user: null,
    admin: false,
    ready: false,
  });
  const [items, setItems] = useState(readBasket);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastId = useRef(0);

  const notify = useCallback((message: string, kind: ToastKind = "success") => {
    toastId.current += 1;
    setToast({ id: toastId.current, message, kind });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(
    () =>
      onIdTokenChanged(auth, async (user) => {
        try {
          const token = await user?.getIdTokenResult();
          setSession({
            user,
            admin: token?.claims.admin === true,
            ready: true,
          });
        } catch {
          setSession({ user: null, admin: false, ready: true });
        }
      }),
    [],
  );

  useEffect(() => {
    try {
      localStorage.setItem("hosken-cart", JSON.stringify(items));
    } catch {
      /* O carrinho continua funcionando em memória. */
    }
  }, [items]);

  const change = (id: string, delta: number) =>
    setItems((previous) => {
      const next = { ...previous };
      next[id] = Math.min(99, Math.max(0, (next[id] || 0) + delta));
      if (!next[id]) delete next[id];
      return next;
    });

  return (
    <ToastContext.Provider value={notify}>
      <SessionContext.Provider value={session}>
        <BasketContext.Provider
          value={{ items, change, clear: () => setItems({}) }}
        >
          {(localMode || publicPreview) && (
            <div className="local-banner">
              {publicPreview ? "PRÉVIA DO ATELIÊ" : "ATELIÊ EM CONSTRUÇÃO"}{" "}
              <span>
                {publicPreview
                  ? "Versão de demonstração · dados ilustrativos · compras desativadas"
                  : "Ambiente local · produtos e valores de exemplo · compras simuladas no emulador"}
              </span>
            </div>
          )}
          {toast && (
            <ToastNotice toast={toast} onDismiss={() => setToast(null)} />
          )}
          {children}
        </BasketContext.Provider>
      </SessionContext.Provider>
    </ToastContext.Provider>
  );
}
