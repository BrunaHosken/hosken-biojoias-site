import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { onIdTokenChanged, signOut } from "firebase/auth";
import { LogOut, Menu, ShoppingBag, X } from "lucide-react";
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
  AdminHeaderNotificationBell,
  CustomerHeaderNotificationBell,
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
  const [menu, setMenu] = useState(false);
  const [compactHeader, setCompactHeader] = useState(false);
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
  useEffect(() => {
    const updateHeaderSize = () =>
      setCompactHeader((isCompact) =>
        isCompact ? window.scrollY > 4 : window.scrollY > 72,
      );
    updateHeaderSize();
    window.addEventListener("scroll", updateHeaderSize, { passive: true });
    return () => window.removeEventListener("scroll", updateHeaderSize);
  }, []);
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
          <header
            className={`site-header ${compactHeader ? "header-compact" : ""}`}
          >
            <Link to="/" className="wordmark">
              <span>HOSKEN BIOJOIAS</span>
              <small>FEITO À MÃO</small>
            </Link>
            <button
              className="icon mobile-menu"
              aria-label="Abrir menu"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
            <nav className={menu ? "open" : ""} onClick={() => setMenu(false)}>
              {[
                ["/loja", "Loja"],
                ["/novidades", "Novidades"],
                ["/eventos", "Eventos"],
                ["/onde-encontrar", "Onde encontrar"],
                ["/sobre", "Nossa história"],
                ["/contato", "Contato"],
              ].map(([path, label]) => (
                <NavLink key={path} to={path}>
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="header-actions">
              <Link to="/conta">{session.user ? "Minha conta" : "Entrar"}</Link>
              {session.admin && <AdminHeaderNotificationBell />}
              {session.user && !session.admin && (
                <CustomerHeaderNotificationBell uid={session.user.uid} />
              )}
              {session.user && (
                <button
                  className="header-logout"
                  type="button"
                  aria-label="Sair da conta"
                  title="Sair da conta"
                  onClick={() => signOut(auth)}
                >
                  <LogOut size={17} />
                  <span>Sair</span>
                </button>
              )}
              <Link
                to="/carrinho"
                className="bag"
                aria-label={`Carrinho com ${Object.values(items).reduce((a, b) => a + b, 0)} itens`}
              >
                <ShoppingBag size={21} />
                <span>{Object.values(items).reduce((a, b) => a + b, 0)}</span>
              </Link>
            </div>
          </header>
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
          <footer>
            <div className="wordmark">
              <span>HOSKEN BIOJOIAS</span>
              <small>NATUREZA QUE ACOMPANHA VOCÊ.</small>
            </div>
            <p>Flores naturais. Histórias únicas. Feito à mão.</p>
            <div>
              <a
                href="https://www.instagram.com/hosken.biojoias/"
                target="_blank"
                rel="noreferrer"
              >
                Instagram ↗
              </a>
              <a
                href="https://wa.me/5522992339779"
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp ↗
              </a>
              <a href="mailto:nil2martins@gmail.com">E-mail</a>
              <Link to="/contato">Contato</Link>
              <Link to="/politicas">Políticas da loja</Link>
              {session.admin && <Link to="/admin">Administrar</Link>}
            </div>
            <small>© {new Date().getFullYear()} Hosken Biojoias</small>
          </footer>
        </BasketContext.Provider>
      </SessionContext.Provider>
    </ToastContext.Provider>
  );
}
