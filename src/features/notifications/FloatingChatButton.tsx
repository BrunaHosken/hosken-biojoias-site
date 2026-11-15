import { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { SessionContext } from "../../app/contexts";

export function FloatingChatButton() {
  const session = useContext(SessionContext);
  const location = useLocation();
  if (location.pathname === "/chat" || location.pathname === "/admin")
    return null;
  return (
    <Link
      to={session.admin ? "/admin?tab=chat" : "/chat"}
      className="chat-fab"
      aria-label={session.admin ? "Abrir atendimentos" : "Falar com o ateliê"}
      title={session.admin ? "Abrir atendimentos" : "Falar com o ateliê"}
    >
      <MessageCircle size={24} />
    </Link>
  );
}
