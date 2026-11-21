import { useContext, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  updateEmail,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { deleteField, doc, setDoc } from "firebase/firestore";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { SessionContext, useToast } from "../../app/contexts";
import { useCustomerProfile } from "../../data";
import { auth, db, localMode } from "../../firebase";
import { formatBrazilianMobile } from "./checkoutModel";

export function Account() {
  const session = useContext(SessionContext);
  const customerProfile = useCustomerProfile(session.user?.uid);
  const notify = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedReturnTo = searchParams.get("returnTo") || "";
  const returnTo =
    requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//")
      ? requestedReturnTo
      : "";
  const authActionInProgress = useRef(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [registrationPhone, setRegistrationPhone] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  useEffect(() => {
    if (
      session.ready &&
      session.user &&
      returnTo &&
      !authActionInProgress.current
    ) {
      navigate(returnTo, { replace: true });
    }
  }, [session.ready, session.user, returnTo, navigate]);
  useEffect(() => {
    setProfileName(session.user?.displayName || "");
    setProfileEmail(session.user?.email || "");
  }, [session.user]);
  useEffect(() => {
    setProfilePhone(formatBrazilianMobile(customerProfile.profile.phone || ""));
  }, [customerProfile.profile.phone]);
  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!session.user) return;
    setBusy(true);
    const name = profileName.trim();
    const email = profileEmail.trim();
    const phone = formatBrazilianMobile(profilePhone).replace(/\D/g, "");
    try {
      if (email !== session.user.email) await updateEmail(session.user, email);
      if (name !== session.user.displayName) {
        await updateProfile(session.user, { displayName: name });
      }
      await setDoc(
        doc(db, "users", session.user.uid),
        {
          displayName: name,
          phone: phone || deleteField(),
        },
        { merge: true },
      );
      notify("Seus dados foram atualizados.", "success");
      setEditingProfile(false);
    } catch (cause) {
      const code = (cause as { code?: string }).code;
      notify(
        code === "auth/requires-recent-login"
          ? "Por segurança, entre novamente para alterar o e-mail."
          : code === "auth/email-already-in-use"
            ? "Esse e-mail já está sendo usado por outra conta."
            : code === "auth/invalid-email"
              ? "Confira o formato do e-mail."
              : "Não foi possível atualizar os dados. Tente novamente.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }
  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!session.user?.email) return;
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const currentPassword = String(form.get("currentPassword"));
    const newPassword = String(form.get("newPassword"));
    const confirmPassword = String(form.get("confirmPassword"));
    if (newPassword !== confirmPassword) {
      notify("A confirmação não corresponde à nova senha.", "warning");
      setBusy(false);
      return;
    }
    try {
      const credential = EmailAuthProvider.credential(
        session.user.email,
        currentPassword,
      );
      await reauthenticateWithCredential(session.user, credential);
      await updatePassword(session.user, newPassword);
      notify("Sua senha foi alterada.", "success");
      setChangingPassword(false);
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (cause) {
      const code = (cause as { code?: string }).code;
      notify(
        code === "auth/wrong-password" || code === "auth/invalid-credential"
          ? "A senha atual está incorreta."
          : code === "auth/weak-password"
            ? "A nova senha precisa ter pelo menos 6 caracteres."
            : code === "auth/requires-recent-login"
              ? "Entre novamente antes de alterar sua senha."
              : "Não foi possível alterar a senha. Tente novamente.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    authActionInProgress.current = true;
    const f = new FormData(e.currentTarget);
    try {
      await signInWithEmailAndPassword(
        auth,
        String(f.get("email")),
        String(f.get("password")),
      );
      if (returnTo) navigate(returnTo, { replace: true });
    } catch {
      authActionInProgress.current = false;
      notify(
        "Não foi possível entrar. Confira os dados e se a autenticação está disponível.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }
  async function register(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const displayName = String(form.get("displayName")).trim();
    const phone = formatBrazilianMobile(registrationPhone).replace(/\D/g, "");
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        String(form.get("email")),
        String(form.get("password")),
      );
      await updateProfile(credential.user, { displayName });
      await setDoc(doc(db, "users", credential.user.uid), {
        displayName,
        ...(phone ? { phone } : {}),
        theme: "light",
      });
      notify("Sua conta foi criada.", "success");
      if (returnTo) navigate(returnTo, { replace: true });
    } catch (cause) {
      authActionInProgress.current = false;
      const code = (cause as { code?: string }).code;
      notify(
        code === "auth/email-already-in-use"
          ? "Já existe uma conta com esse e-mail. Entre ou use outro endereço."
          : code === "auth/weak-password"
            ? "Escolha uma senha com pelo menos 6 caracteres."
            : "Não foi possível criar a conta. Confira seus dados e tente novamente.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page narrow">
      <div className="eyebrow">SEU ESPAÇO NA HOSKEN BIOJOIAS</div>
      <h1>Minha conta</h1>
      {!session.ready ? (
        <p>Carregando sessão…</p>
      ) : session.user ? (
        <>
          <p>Olá, {session.user.displayName || session.user.email}.</p>
          {session.admin && (
            <Link className="button" to="/admin">
              Abrir administração <ArrowRight size={18} />
            </Link>
          )}
          <section className="account-settings">
            {!session.admin && (
              <div className="account-setting-card account-orders-link">
                <div>
                  <div className="eyebrow">ACOMPANHAMENTO</div>
                  <h2>Seus pedidos</h2>
                  <p className="muted">
                    Consulte o histórico e as atualizações dos seus pedidos.
                  </p>
                </div>
                <Link
                  className="account-orders-arrow"
                  to="/pedidos"
                  aria-label="Ver meus pedidos"
                  title="Ver meus pedidos"
                >
                  <ArrowRight size={24} />
                </Link>
              </div>
            )}
            <section className="account-setting-card">
              <header className="account-setting-header">
                <div>
                  <div className="eyebrow">SEUS DADOS</div>
                  <h2>Dados pessoais</h2>
                </div>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    if (editingProfile) {
                      setProfileName(session.user?.displayName || "");
                      setProfileEmail(session.user?.email || "");
                      setProfilePhone(
                        formatBrazilianMobile(
                          customerProfile.profile.phone || "",
                        ),
                      );
                    }
                    setEditingProfile((value) => !value);
                  }}
                >
                  {editingProfile ? "Cancelar" : "Editar dados"}
                </button>
              </header>
              {editingProfile ? (
                <form className="account-edit-form" onSubmit={saveProfile}>
                  <label>
                    Nome
                    <input
                      type="text"
                      autoComplete="name"
                      maxLength={100}
                      required
                      value={profileName}
                      onChange={(event) => setProfileName(event.target.value)}
                    />
                  </label>
                  <label>
                    E-mail
                    <input
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      required
                      value={profileEmail}
                      onChange={(event) => setProfileEmail(event.target.value)}
                    />
                  </label>
                  <label>
                    Celular
                    <input
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      maxLength={15}
                      pattern="\([0-9]{2}\) [0-9]{5}-[0-9]{4}"
                      title="Digite um celular com DDD, por exemplo (22) 99999-9999."
                      placeholder="(22) 99999-9999"
                      value={profilePhone}
                      onChange={(event) =>
                        setProfilePhone(
                          formatBrazilianMobile(event.target.value),
                        )
                      }
                    />
                  </label>
                  <button className="button" disabled={busy}>
                    {busy ? "Salvando…" : "Salvar dados"}
                  </button>
                </form>
              ) : (
                <dl className="account-data-list">
                  <div>
                    <dt>Nome</dt>
                    <dd>{session.user.displayName || "Não informado"}</dd>
                  </div>
                  <div>
                    <dt>E-mail</dt>
                    <dd>{session.user.email || "Não informado"}</dd>
                  </div>
                  <div>
                    <dt>Celular</dt>
                    <dd>{profilePhone || "Não informado"}</dd>
                  </div>
                </dl>
              )}
            </section>
            <section className="account-setting-card">
              <header className="account-setting-header">
                <div>
                  <div className="eyebrow">SEGURANÇA</div>
                  <h2>Senha</h2>
                </div>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    if (changingPassword) {
                      setShowCurrentPassword(false);
                      setShowNewPassword(false);
                      setShowConfirmPassword(false);
                    }
                    setChangingPassword((value) => !value);
                  }}
                >
                  {changingPassword ? "Cancelar" : "Alterar senha"}
                </button>
              </header>
              <p className="muted account-password-hint">
                Sua senha atual não é exibida. Você pode mostrar os campos
                enquanto digita.
              </p>
              {changingPassword && (
                <form className="account-edit-form" onSubmit={changePassword}>
                  <label>
                    Senha atual
                    <span className="password-field">
                      <input
                        name="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        autoComplete="current-password"
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        aria-label={
                          showCurrentPassword
                            ? "Ocultar senha atual"
                            : "Mostrar senha atual"
                        }
                        onClick={() =>
                          setShowCurrentPassword((value) => !value)
                        }
                      >
                        {showCurrentPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </span>
                  </label>
                  <label>
                    Nova senha
                    <span className="password-field">
                      <input
                        name="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        autoComplete="new-password"
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        aria-label={
                          showNewPassword
                            ? "Ocultar nova senha"
                            : "Mostrar nova senha"
                        }
                        onClick={() => setShowNewPassword((value) => !value)}
                      >
                        {showNewPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </span>
                  </label>
                  <label>
                    Confirme a nova senha
                    <span className="password-field">
                      <input
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        aria-label={
                          showConfirmPassword
                            ? "Ocultar confirmação"
                            : "Mostrar confirmação"
                        }
                        onClick={() =>
                          setShowConfirmPassword((value) => !value)
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </span>
                  </label>
                  <button className="button" disabled={busy}>
                    {busy ? "Atualizando…" : "Salvar nova senha"}
                  </button>
                </form>
              )}
            </section>
          </section>
        </>
      ) : (
        <>
          <p>
            {mode === "login"
              ? "Entre para acessar sua conta."
              : "Crie uma conta para acompanhar seus pedidos."}
          </p>
          <form onSubmit={mode === "login" ? login : register}>
            {mode === "register" && (
              <>
                <label>
                  Nome
                  <input
                    name="displayName"
                    type="text"
                    autoComplete="name"
                    maxLength={100}
                    required
                  />
                </label>
                <label>
                  Celular (opcional)
                  <input
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    maxLength={15}
                    pattern="\([0-9]{2}\) [0-9]{5}-[0-9]{4}"
                    title="Digite um celular com DDD, por exemplo (22) 99999-9999."
                    placeholder="(22) 99999-9999"
                    value={registrationPhone}
                    onChange={(event) =>
                      setRegistrationPhone(
                        formatBrazilianMobile(event.target.value),
                      )
                    }
                  />
                </label>
              </>
            )}
            <label>
              E-mail
              <input
                name="email"
                type="email"
                autoComplete="username"
                maxLength={254}
                required
              />
            </label>
            <label>
              Senha
              <input
                name="password"
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={6}
                required
              />
            </label>
            <button className="button" disabled={busy}>
              {busy
                ? mode === "login"
                  ? "Entrando…"
                  : "Criando conta…"
                : mode === "login"
                  ? "Entrar"
                  : "Criar conta"}
            </button>
          </form>
          <p>
            {mode === "login"
              ? "Ainda não tem uma conta?"
              : "Já tem uma conta?"}{" "}
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setRegistrationPhone("");
              }}
            >
              {mode === "login" ? "Criar conta" : "Entrar"}
            </button>
          </p>
          {localMode && (
            <aside className="notice">
              Depois de iniciar o banco, execute <code>npm run db:seed</code>.
              <br />
              Conta de teste: <strong>admin@hosken.local</strong>
              <br />
              Senha local: <strong>HoskenLocal2026!</strong>
            </aside>
          )}
        </>
      )}
    </div>
  );
}
