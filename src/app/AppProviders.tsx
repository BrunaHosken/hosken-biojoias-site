import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { onIdTokenChanged } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import {
  BasketContext,
  LegalContext,
  SessionContext,
  ToastContext,
  ThemeContext,
  type Theme,
  type Session,
  type ToastKind,
  type ToastMessage,
  type LegalDocument,
} from "./contexts";
import { auth, db, localMode } from "../firebase";
import { ToastNotice } from "../components/Feedback";
import { normalizeBasketItems } from "../data/basket";
import { createLegalVersion } from "../data/legalVersion";

const publicPreview = import.meta.env.VITE_PUBLIC_PREVIEW === "true";
const guestThemeStorageKey = "hosken-theme-guest";

function readGuestTheme(): Theme {
  try {
    return localStorage.getItem(guestThemeStorageKey) === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

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
  const [theme, setTheme] = useState<Theme>(readGuestTheme);
  const [themeReady, setThemeReady] = useState(false);
  const [legalDocuments, setLegalDocuments] = useState<LegalDocument[]>([]);
  const [legalVersion, setLegalVersion] = useState("");
  const [legalReady, setLegalReady] = useState(false);
  const [legalError, setLegalError] = useState(false);
  const [acceptedLegalVersion, setAcceptedLegalVersion] = useState("");
  const [profileReady, setProfileReady] = useState(false);
  const [registrationInProgress, setRegistrationInProgress] = useState(false);
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
    if (!session.ready) {
      setThemeReady(false);
      return;
    }
    const uid = session.user?.uid;
    if (!uid) {
      setTheme(readGuestTheme());
      setThemeReady(true);
      setAcceptedLegalVersion("");
      setProfileReady(true);
      return;
    }
    setTheme("light");
    setAcceptedLegalVersion("");
    setProfileReady(false);
    document.documentElement.dataset.theme = "light";
    setThemeReady(false);
    return onSnapshot(
      doc(db, "users", uid),
      (snapshot) => {
        const profile = snapshot.data();
        setTheme(profile?.theme === "dark" ? "dark" : "light");
        setAcceptedLegalVersion(
          typeof profile?.acceptedLegalVersion === "string"
            ? profile.acceptedLegalVersion
            : "",
        );
        setThemeReady(true);
        setProfileReady(true);
      },
      () => {
        setTheme("light");
        setThemeReady(true);
        setProfileReady(true);
      },
    );
  }, [session.ready, session.user?.uid]);

  useEffect(() => {
    let active = true;
    let calculation = 0;
    setLegalReady(false);
    setLegalError(false);
    const unsubscribe = onSnapshot(
      query(collection(db, "policies"), where("status", "==", "published")),
      (snapshot) => {
        calculation += 1;
        const currentCalculation = calculation;
        setLegalReady(false);
        const documents = snapshot.docs.map((item) => ({
          id: item.id,
          title: String(item.data().title || ""),
          body: String(item.data().body || ""),
          policyType: String(item.data().policyType || "general"),
        }));
        setLegalDocuments(documents);
        void createLegalVersion(documents)
          .then((version) => {
            if (!active || currentCalculation !== calculation) return;
            setLegalVersion(version);
            setLegalError(false);
            setLegalReady(true);
          })
          .catch(() => {
            if (!active || currentCalculation !== calculation) return;
            setLegalVersion("");
            setLegalError(true);
            setLegalReady(true);
          });
      },
      () => {
        if (!active) return;
        setLegalDocuments([]);
        setLegalVersion("");
        setLegalError(true);
        setLegalReady(true);
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const chooseTheme = useCallback(
    async (nextTheme: Theme) => {
      const user = session.user;
      if (!user) {
        setTheme(nextTheme);
        try {
          localStorage.setItem(guestThemeStorageKey, nextTheme);
        } catch {
          notify("A preferência ficará salva somente nesta aba.", "warning");
        }
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

  const acceptCurrentVersion = useCallback(async () => {
    const user = session.user;
    if (!user || !legalVersion) return;
    await setDoc(
      doc(db, "users", user.uid),
      {
        acceptedLegalVersion: legalVersion,
        acceptedLegalAt: serverTimestamp(),
      },
      { merge: true },
    );
    setAcceptedLegalVersion(legalVersion);
  }, [legalVersion, session.user]);

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
          <LegalContext.Provider
            value={{
              documents: legalDocuments,
              version: legalVersion,
              ready: legalReady,
              error: legalError,
              acceptedVersion: acceptedLegalVersion,
              profileReady,
              registrationInProgress,
              beginRegistration: () => setRegistrationInProgress(true),
              endRegistration: () => setRegistrationInProgress(false),
              acceptCurrentVersion,
            }}
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
          </LegalContext.Provider>
        </ThemeContext.Provider>
      </SessionContext.Provider>
    </ToastContext.Provider>
  );
}
