import { Link } from "react-router-dom";
import { useContext } from "react";
import { SessionContext } from "../app/contexts";

export function SiteFooter() {
  const { admin } = useContext(SessionContext);

  return (
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
        <a href="https://wa.me/5522992339779" target="_blank" rel="noreferrer">
          WhatsApp ↗
        </a>
        <a href="mailto:hoskenbiojoias2026@gmail.com">E-mail ↗</a>
        <Link to="/duvidas">Perguntas frequentes</Link>
        <Link to="/politicas">Políticas da loja</Link>
        {admin && <Link to="/admin">Administrar</Link>}
      </div>
      <small>© {new Date().getFullYear()} Hosken Biojoias</small>
    </footer>
  );
}
