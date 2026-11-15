import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { onIdTokenChanged } from "firebase/auth";
import {
  BasketContext,
  SessionContext,
  ToastContext,
  type Session,
  type ToastKind,
  type ToastMessage,
} from "./app/contexts";
import { auth, localMode } from "./firebase";
import { ToastNotice } from "./components/Feedback";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import {
  Home,
  Shop,
  ProductPage,
  ContentPage,
  PoliciesPage,
  About,
} from "./features/storefront/Pages";
import { Contact } from "./features/storefront/Contact";
import { Account } from "./features/account/Account";
import { OrdersPage } from "./features/account/Orders";
import { Cart } from "./features/account/Cart";
import { CustomerChat } from "./features/chat/CustomerChat";
import { Admin } from "./features/admin/AdminPanel";
import {
  AdminNotificationBridge,
  CustomerNotificationBridge,
  FloatingChatButton,
} from "./features/notifications/NotificationCenter";

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

export default function App() {
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
        <BasketContext.Provider value={{ items, change }}>
          {localMode && (
            <div className="local-banner">
              ATELIÊ EM CONSTRUÇÃO{" "}
              <span>
                Ambiente local · produtos e valores de exemplo · compras
                desativadas
              </span>
            </div>
          )}
          {toast && (
            <ToastNotice toast={toast} onDismiss={() => setToast(null)} />
          )}
          <SiteHeader />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/loja" element={<Shop />} />
              <Route path="/produto/:id" element={<ProductPage />} />
              <Route
                path="/novidades"
                element={
                  <ContentPage
                    name="news"
                    title="Novidades do ateliê"
                    subtitle="Novas ideias, flores e caminhos."
                  />
                }
              />
              <Route
                path="/eventos"
                element={
                  <ContentPage
                    name="events"
                    title="Vamos nos encontrar?"
                    subtitle="Acompanhe os próximos encontros e feiras."
                  />
                }
              />
              <Route
                path="/onde-encontrar"
                element={
                  <ContentPage
                    name="partnerStores"
                    title="Hosken Biojoias perto de você"
                    subtitle="Conheça nossos pontos de encontro e lojas parceiras."
                  />
                }
              />
              <Route path="/sobre" element={<About />} />
              <Route path="/contato" element={<Contact />} />
              <Route path="/politicas" element={<PoliciesPage />} />
              <Route path="/conta" element={<Account />} />
              <Route path="/pedidos" element={<OrdersPage />} />
              <Route path="/chat" element={<CustomerChat />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/carrinho" element={<Cart />} />
              <Route
                path="*"
                element={
                  <div className="page">
                    <h1>Página não encontrada</h1>
                    <Link to="/loja">Voltar à loja</Link>
                  </div>
                }
              />
            </Routes>
          </main>
          {session.admin && <AdminNotificationBridge />}
          {session.user && !session.admin && (
            <CustomerNotificationBridge uid={session.user.uid} />
          )}
          <FloatingChatButton />
          <SiteFooter />
        </BasketContext.Provider>
      </SessionContext.Provider>
    </ToastContext.Provider>
  );
}
