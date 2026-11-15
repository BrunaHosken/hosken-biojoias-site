import { useContext, useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { signOut } from "firebase/auth";
import { LogOut, Menu, ShoppingBag, UserRound, X } from "lucide-react";
import { BasketContext, SessionContext } from "../app/contexts";
import { auth } from "../firebase";
import {
  AdminHeaderNotificationBell,
  CustomerHeaderNotificationBell,
} from "../features/notifications/NotificationCenter";

const navigation = [
  ["/loja", "Loja"],
  ["/novidades", "Novidades"],
  ["/eventos", "Eventos"],
  ["/onde-encontrar", "Onde encontrar"],
  ["/sobre", "Nossa história"],
  ["/contato", "Contato"],
];

export function SiteHeader() {
  const session = useContext(SessionContext);
  const basket = useContext(BasketContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const itemCount = Object.values(basket.items).reduce(
    (total, quantity) => total + quantity,
    0,
  );

  useEffect(() => {
    const updateHeaderSize = () =>
      setCompact((isCompact) =>
        isCompact ? window.scrollY > 4 : window.scrollY > 72,
      );
    updateHeaderSize();
    window.addEventListener("scroll", updateHeaderSize, { passive: true });
    return () => window.removeEventListener("scroll", updateHeaderSize);
  }, []);

  return (
    <header className={`site-header ${compact ? "header-compact" : ""}`}>
      <Link to="/" className="wordmark">
        <span>HOSKEN BIOJOIAS</span>
        <small>FEITO À MÃO</small>
      </Link>
      <nav
        className={menuOpen ? "open" : ""}
        onClick={() => setMenuOpen(false)}
      >
        {navigation.map(([path, label]) => (
          <NavLink key={path} to={path}>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="header-actions">
        <Link
          to="/conta"
          className="account-link"
          aria-label={session.user ? "Minha conta" : "Entrar ou criar conta"}
          title={session.user ? "Minha conta" : "Entrar ou criar conta"}
        >
          <UserRound className="account-icon" aria-hidden="true" />
          <span>{session.user ? "Minha conta" : "Entrar"}</span>
        </Link>
        {session.admin && <AdminHeaderNotificationBell />}
        {session.user && !session.admin && (
          <CustomerHeaderNotificationBell uid={session.user.uid} />
        )}
        {!session.admin && (
          <Link
            to="/carrinho"
            className="bag"
            aria-label={`Carrinho com ${itemCount} itens`}
          >
            <ShoppingBag size={21} />
            <span>{itemCount}</span>
          </Link>
        )}
        {session.user && (
          <button
            className="header-logout"
            type="button"
            aria-label="Sair da conta"
            title="Sair da conta"
            onClick={() => void signOut(auth)}
          >
            <LogOut size={17} />
            <span>Sair</span>
          </button>
        )}
        <button
          className="icon mobile-menu"
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
