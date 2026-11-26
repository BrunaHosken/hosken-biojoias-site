import { useContext, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateEmail,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { deleteField, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { ArrowRight, Eye, EyeOff, MessageSquareQuote, Star } from "lucide-react";
import {
  LegalContext,
  SessionContext,
  useToast,
  type LegalDocument,
} from "../../app/contexts";
import { useCustomerProfile } from "../../data";
import { auth, db, localMode } from "../../firebase";
import { formatBrazilianMobile } from "./checkoutModel";
import { PushNotificationSettings } from "../notifications/PushNotificationSettings";
import { LegalAcceptanceModal } from "../../components/LegalAcceptanceModal";

type RegistrationDraft = {
  displayName: string;
  phone: string;
  email: string;
  password: string;
};

type LocalResetCode = {
  email: string;
  oobCode: string;
  requestType: string;
};

async function getLocalResetCodes(): Promise<LocalResetCode[]> {
  const projectId = auth.app.options.projectId;
  if (!projectId) return [];
  try {
    const response = await fetch(
      `http://127.0.0.1:9099/emulator/v1/projects/${encodeURIComponent(projectId)}/oobCodes`,
      { cache: "no-store" },
    );
    if (!response.ok) return [];
    const payload = (await response.json()) as {
      oobCodes?: LocalResetCode[];
    };
    return Array.isArray(payload.oobCodes) ? payload.oobCodes : [];
  } catch {
    return [];
  }
}

export function Account() {
  const session = useContext(SessionContext);
  const legal = useContext(LegalContext);
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
  const previousSessionUid = useRef<string | null>(null);
  const loginEmailRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"login" | "register" | "reset">(() =>
    searchParams.get("reset") === "1" ? "reset" : "login",
  );
  const [busy, setBusy] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [registrationPhone, setRegistrationPhone] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [localResetLink, setLocalResetLink] = useState("");
  const [pendingRegistration, setPendingRegistration] =
    useState<RegistrationDraft | null>(null);
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
    if (!session.ready) return;

    const currentUid = session.user?.uid ?? null;
    if (previousSessionUid.current && !currentUid) {
      setMode("login");
      setPendingRegistration(null);
      setRegistrationPhone("");
    }
    previousSessionUid.current = currentUid;
  }, [session.ready, session.user?.uid]);
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
  async function resetPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setLocalResetLink("");
    try {
      const codesBefore = localMode ? await getLocalResetCodes() : [];
      await sendPasswordResetEmail(auth, resetEmail.trim());
      if (localMode) {
        const codesAfter = await getLocalResetCodes();
        const matchingCodes = codesAfter.filter(
          (item) =>
            item.email.toLowerCase() === resetEmail.trim().toLowerCase() &&
            item.requestType === "PASSWORD_RESET",
        );
        const newCode = matchingCodes.find(
          (item) => !codesBefore.some((before) => before.oobCode === item.oobCode),
        );
        const resetCode = newCode || matchingCodes.at(-1);
        if (resetCode) {
          const basePath = import.meta.env.BASE_URL.endsWith("/")
            ? import.meta.env.BASE_URL
            : `${import.meta.env.BASE_URL}/`;
          const link = new URL(`${basePath}redefinir-senha`, window.location.origin);
          link.searchParams.set("mode", "resetPassword");
          link.searchParams.set("oobCode", resetCode.oobCode);
          setLocalResetLink(link.toString());
          return;
        }
        notify(
          "O pedido foi criado, mas não consegui montar o link do emulador. Confira se o Authentication Emulator está rodando.",
          "warning",
        );
        return;
      }
      notify(
        "Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.",
        "success",
      );
      setResetEmail("");
      setMode("login");
    } catch {
      notify(
        "Não foi possível enviar o link agora. Confira o endereço e tente novamente.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }
  async function createAccount(
    draft: RegistrationDraft,
    acceptedDocuments: LegalDocument[] = [],
  ) {
    setBusy(true);
    authActionInProgress.current = true;
    legal.beginRegistration();
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        draft.email,
        draft.password,
      );
      await updateProfile(credential.user, { displayName: draft.displayName });
      await setDoc(doc(db, "users", credential.user.uid), {
        displayName: draft.displayName,
        ...(draft.phone ? { phone: draft.phone } : {}),
        theme: "light",
        ...(acceptedDocuments.length && legal.version
          ? {
              acceptedLegalVersion: legal.version,
              acceptedLegalAt: serverTimestamp(),
            }
          : {}),
      });
      notify("Sua conta foi criada.", "success");
      setPendingRegistration(null);
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
      legal.endRegistration();
      setBusy(false);
    }
  }

  async function register(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!legal.ready) {
      notify("Aguarde o carregamento dos termos e tente novamente.", "warning");
      return;
    }
    if (legal.error || (legal.documents.length > 0 && !legal.version)) {
      notify(
        "Não foi possível carregar os termos e políticas. Tente novamente antes de criar sua conta.",
        "error",
      );
      return;
    }
    const form = new FormData(e.currentTarget);
    const draft = {
      displayName: String(form.get("displayName")).trim(),
      phone: formatBrazilianMobile(registrationPhone).replace(/\D/g, ""),
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
    };
    if (legal.documents.length > 0 && legal.version) {
      setPendingRegistration(draft);
      return;
    }
    await createAccount(draft);
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
              <>
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
                <div className="account-setting-card account-orders-link">
                  <div>
                    <div className="eyebrow">SUA EXPERIÊNCIA</div>
                    <h2>Minhas avaliações</h2>
                    <p className="muted">
                      Avalie as peças dos pedidos concluídos ou edite suas avaliações.
                    </p>
                  </div>
                  <Link
                    className="account-orders-arrow"
                    to="/minhas-avaliacoes"
                    aria-label="Ver minhas avaliações"
                    title="Ver minhas avaliações"
                  >
                    <Star size={22} />
                  </Link>
                </div>
                <div className="account-setting-card account-orders-link">
                  <div>
                    <div className="eyebrow">SUA HISTÓRIA</div>
                    <h2>Meu depoimento</h2>
                    <p className="muted">
                      Compartilhe sua experiência com o ateliê. Não é preciso ter comprado.
                    </p>
                  </div>
                  <Link
                    className="account-orders-arrow"
                    to="/meu-depoimento"
                    aria-label="Escrever ou editar meu depoimento"
                    title="Escrever ou editar meu depoimento"
                  >
                    <MessageSquareQuote size={22} />
                  </Link>
                </div>
              </>
            )}
            <PushNotificationSettings uid={session.user.uid} />
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
          {mode === "reset" ? (
            <>
              <p>
                Informe o e-mail da sua conta. Se ele estiver cadastrado,
                enviaremos um link para redefinir a senha.
              </p>
              <form onSubmit={resetPassword}>
                <label>
                  E-mail
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    value={resetEmail}
                    onChange={(event) => {
                      setResetEmail(event.target.value);
                      setLocalResetLink("");
                    }}
                    required
                  />
                </label>
                <button className="button" disabled={busy}>
                  {busy ? "Enviando link…" : "Enviar link de recuperação"}
                </button>
              </form>
              {localResetLink && (
                <div className="account-reset-link notice" role="status">
                  O emulador local não envia e-mails. Abra este link para
                  escolher uma nova senha:
                  <a className="button" href={localResetLink}>
                    Abrir formulário de nova senha <ArrowRight size={18} />
                  </a>
                </div>
              )}
              <p>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setMode("login")}
                >
                  Voltar ao login
                </button>
              </p>
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
                    ref={loginEmailRef}
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
              {mode === "login" && (
                <p>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setResetEmail(loginEmailRef.current?.value || "");
                      setMode("reset");
                    }}
                  >
                    Esqueceu sua senha?
                  </button>
                </p>
              )}
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
            </>
          )}
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
      {pendingRegistration && legal.documents.length > 0 && (
        <LegalAcceptanceModal
          key={legal.version}
          documents={legal.documents}
          canDismiss
          busy={busy}
          onDismiss={() => setPendingRegistration(null)}
          onAccept={() => createAccount(pendingRegistration, legal.documents)}
        />
      )}
    </div>
  );
}
