import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { useToast } from "../../app/contexts";
import {
  disablePushForUser,
  enablePushForUser,
  isIosHomeScreenRequired,
  isPushConfigured,
  isPushEnabled,
  isPushSupported,
  pushUnavailableReason,
} from "./pushNotifications";

export function PushNotificationSettings({ uid }: { uid: string }) {
  const notify = useToast();
  const [enabled, setEnabled] = useState(() => isPushEnabled(uid));
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [needsHomeScreen, setNeedsHomeScreen] = useState(false);

  useEffect(() => {
    setEnabled(isPushEnabled(uid));
    setSupported(null);
    setNeedsHomeScreen(isIosHomeScreenRequired());
    let active = true;
    void isPushSupported().then((value) => {
      if (active) setSupported(value);
    });
    return () => {
      active = false;
    };
  }, [uid]);

  const unavailable = !isPushConfigured() || supported === false;
  const hint = needsHomeScreen
    ? "No iPhone ou iPad, adicione o site à Tela de Início e abra pelo ícone para ativar as notificações."
    : unavailable
      ? pushUnavailableReason()
      : enabled
        ? "Este aparelho pode receber avisos de pedidos, mensagens e atualizações da sua conta."
        : "Ative para receber avisos deste site mesmo quando ele estiver fechado.";

  async function toggle() {
    if (busy || unavailable || supported !== true || needsHomeScreen) return;
    setBusy(true);
    try {
      if (enabled) {
        await disablePushForUser(uid);
        setEnabled(false);
        notify("Notificações desativadas neste aparelho.", "success");
      } else {
        await enablePushForUser(uid);
        setEnabled(true);
        notify("Notificações ativadas neste aparelho.", "success");
      }
    } catch (cause) {
      const code = (cause as { code?: string; message?: string }).code ||
        (cause as { message?: string }).message || "";
      notify(
        code.includes("permission-denied")
          ? "A permissão foi recusada. Altere-a nas configurações do navegador para ativar."
          : code.includes("not-configured")
            ? "A configuração de notificações ainda não foi publicada."
            : code.includes("not-supported")
              ? "Este navegador não oferece suporte a notificações push."
              : "Não foi possível configurar as notificações neste aparelho. Tente novamente.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="account-setting-card push-notification-setting">
      <header className="account-setting-header">
        <div>
          <div className="eyebrow">NESTE APARELHO</div>
          <h2>Notificações</h2>
        </div>
        <BellRing size={22} aria-hidden="true" />
      </header>
      <p className="muted">{hint}</p>
      {isPushConfigured() && supported === null && (
        <p className="muted" role="status">
          Verificando compatibilidade do navegador…
        </p>
      )}
      <button
        type="button"
        className={enabled ? "button secondary" : "button"}
        aria-pressed={enabled}
        disabled={busy || unavailable || supported !== true || needsHomeScreen}
        onClick={() => void toggle()}
      >
        {busy
          ? "Salvando…"
          : enabled
            ? "Desativar neste aparelho"
            : "Ativar neste aparelho"}
      </button>
    </section>
  );
}
