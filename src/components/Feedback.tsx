import { useEffect } from "react";
import { CheckCircle2, CircleX, AlertTriangle, Info, X } from "lucide-react";
import type { ToastMessage } from "../app/contexts";

export function ToastNotice({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: () => void;
}) {
  const Icon =
    toast.kind === "success"
      ? CheckCircle2
      : toast.kind === "error"
        ? CircleX
        : toast.kind === "warning"
          ? AlertTriangle
          : Info;
  return (
    <div
      className={`toast-notice toast-${toast.kind}`}
      role={toast.kind === "error" ? "alert" : "status"}
      aria-live={toast.kind === "error" ? "assertive" : "polite"}
      key={toast.id}
    >
      <Icon size={21} aria-hidden="true" />
      <span>{toast.message}</span>
      <button type="button" onClick={onDismiss} aria-label="Fechar aviso">
        <X size={17} />
      </button>
    </div>
  );
}

export function ConfirmationModal({
  title,
  message,
  confirmLabel = "Confirmar",
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [busy, onCancel]);
  return (
    <div
      className="confirmation-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <section
        className="confirmation-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-message"
      >
        <div className="eyebrow">CONFIRMAÇÃO</div>
        <h2 id="confirmation-title">{title}</h2>
        <p id="confirmation-message">{message}</p>
        <div className="confirmation-actions">
          <button
            className="button secondary"
            type="button"
            onClick={onCancel}
            disabled={busy}
            autoFocus
          >
            Cancelar
          </button>
          <button
            className="button danger-button"
            type="button"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Excluindo…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export function Notice({
  loading,
  error,
}: {
  loading: boolean;
  error: string;
}) {
  return error ? (
    <p role="alert" className="notice">
      {error}
    </p>
  ) : loading ? (
    <p role="status" className="muted">
      Carregando do banco…
    </p>
  ) : null;
}
