import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { onIdTokenChanged } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import {
  BasketContext,
  SessionContext,
  ToastContext,
  ThemeContext,
  type Theme,
  type Session,
  type ToastKind,
  type ToastMessage,
} from "./contexts";
import { auth, db, localMode } from "../firebase";
import { ToastNotice } from "../components/Feedback";
import { normalizeBasketItems } from "../data/basket";

const publicPreview = import.meta.env.VITE_PUBLIC_PREVIEW === "true";

function readBasket(): Record<string, number> {
  try {
    const value = JSON.parse(localStorage.getItem("hosken-cart") || "{}");
    const validItems = Object.fromEntries(
      Object.entries(value).filter(
        ([, quantity]) =>
          Number.isInteger(quantity) &&
          Number(quantity) > 0 &&
          Number(quantity) <= 99,
      ),
    ) as Record<string, number>;
    return normalizeBasketItems(validItems);
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
  const [theme, setTheme] = useState<Theme>("light");
  const [themeReady, setThemeReady] = useState(false);
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
          if (!user) {
            setTheme("light");
            setThemeReady(true);
            document.documentElement.dataset.theme = "light";
          }
          setSession({
            user,
            admin: token?.claims.admin === true,
            ready: true,
          });
        } catch {
          setTheme("light");
          setThemeReady(true);
          document.documentElement.dataset.theme = "light";
          setSession({ user: null, admin: false, ready: true });
        }
      }),
    [],
  );

  useEffect(() => {
    const uid = session.user?.uid;
    if (!uid) {
      setTheme("light");
      setThemeReady(true);
      return;
    }
    setTheme("light");
    document.documentElement.dataset.theme = "light";
    setThemeReady(false);
    return onSnapshot(
      doc(db, "users", uid),
      (snapshot) => {
        setTheme(snapshot.data()?.theme === "dark" ? "dark" : "light");
        setThemeReady(true);
      },
      () => {
        setTheme("light");
        setThemeReady(true);
      },
    );
  }, [session.user?.uid]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const chooseTheme = useCallback(
    async (nextTheme: Theme) => {
      const user = session.user;
      if (!user) {
        setTheme("light");
        return;
      }
      const previousTheme = theme;
      setTheme(nextTheme);
      try {
        await setDoc(
          doc(db, "users", user.uid),
          { theme: nextTheme },
          { merge: true },
        );
      } catch {
        setTheme(previousTheme);
        notify("Não foi possível salvar a preferência de tema.", "error");
      }
    },
    [notify, session.user, theme],
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
        <ThemeContext.Provider
          value={{ theme, ready: themeReady, chooseTheme }}
        >
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
        </ThemeContext.Provider>
      </SessionContext.Provider>
    </ToastContext.Provider>
  );
}
