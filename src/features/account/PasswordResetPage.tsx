import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { ArrowRight } from "lucide-react";
import { auth } from "../../firebase";

type ResetState = "checking" | "ready" | "invalid" | "complete";

export function PasswordResetPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get("mode");
  const code = searchParams.get("oobCode");
  const completed = searchParams.get("concluido") === "1";
  const [state, setState] = useState<ResetState>(completed ? "complete" : "checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (completed) {
      setState("complete");
      return;
    }
    if (mode !== "resetPassword" || !code) {
      setState("invalid");
      return;
    }

    let active = true;
    setState("checking");
    verifyPasswordResetCode(auth, code)
      .then((accountEmail) => {
        if (!active) return;
        setEmail(accountEmail);
        setState("ready");
      })
      .catch(() => {
        if (active) setState("invalid");
      });
    return () => {
      active = false;
    };
  }, [code, completed, mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code) return;
    if (password !== confirmation) {
      setError("As senhas não correspondem.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await confirmPasswordReset(auth, code, password);
      navigate("/redefinir-senha?concluido=1", { replace: true });
    } catch (cause) {
      const code = (cause as { code?: string }).code;
      setError(
        code === "auth/weak-password"
          ? "A senha precisa ter pelo menos 6 caracteres."
          : code === "auth/expired-action-code" ||
              code === "auth/invalid-action-code"
            ? "Este link expirou ou já foi usado. Peça uma nova recuperação de senha."
            : "Não foi possível alterar a senha. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page narrow password-reset-page">
      <div className="eyebrow">SEGURANÇA DA CONTA</div>
      <h1>Redefinir senha</h1>
      {state === "checking" ? (
        <p>Conferindo o link de recuperação…</p>
      ) : state === "complete" ? (
        <section className="password-reset-card">
          <h2>Senha atualizada</h2>
          <p>Sua nova senha já está valendo. Você pode entrar na sua conta.</p>
          <Link className="button" to="/conta">
            Ir para o login <ArrowRight size={18} />
          </Link>
        </section>
      ) : state === "invalid" ? (
        <section className="password-reset-card">
          <h2>Link inválido ou expirado</h2>
          <p>
            Peça uma nova recuperação de senha e abra o link mais recente.
          </p>
          <Link className="button" to="/conta?reset=1">
            Voltar para minha conta <ArrowRight size={18} />
          </Link>
        </section>
      ) : (
        <section className="password-reset-card">
          <p>Escolha uma nova senha para {email}.</p>
          <form className="account-edit-form" onSubmit={submit}>
            <label>
              Nova senha
              <input
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <label>
              Confirme a nova senha
              <input
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                required
              />
            </label>
            {error && (
              <p className="password-reset-error" role="alert">
                {error}
              </p>
            )}
            <button className="button" disabled={busy}>
              {busy ? "Salvando…" : "Salvar nova senha"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
