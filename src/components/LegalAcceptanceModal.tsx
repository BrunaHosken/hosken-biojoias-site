import { useEffect, useState } from "react";
import type { LegalDocument } from "../app/contexts";

export function LegalAcceptanceModal({
  documents,
  updated,
  canDismiss = false,
  busy = false,
  onDismiss,
  onAccept,
}: {
  documents: LegalDocument[];
  updated?: boolean;
  canDismiss?: boolean;
  busy?: boolean;
  onDismiss?: () => void;
  onAccept: () => void | Promise<void>;
}) {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && canDismiss && !busy) onDismiss?.();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [busy, canDismiss, onDismiss]);

  return (
    <div
      className="legal-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && canDismiss && !busy)
          onDismiss?.();
      }}
    >
      <section
        className="legal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
      >
        <header className="legal-modal-header">
          <div>
            <div className="eyebrow">HOSKEN BIOJOIAS</div>
            <h2 id="legal-modal-title">
              {updated ? "Termos e políticas atualizados" : "Termos e políticas"}
            </h2>
          </div>
          {canDismiss && (
            <button
              type="button"
              className="legal-modal-close"
              aria-label="Fechar"
              onClick={onDismiss}
              disabled={busy}
            >
              ×
            </button>
          )}
        </header>

        <p className="legal-modal-intro">
          {updated
            ? "Atualizamos um ou mais documentos. Leia o conteúdo e aceite a versão atual para continuar usando sua conta."
            : "Confira os documentos abaixo. Para continuar, confirme que leu e aceita os termos e políticas publicados."}
        </p>

        <div className="legal-modal-documents" tabIndex={0}>
          {documents.map((document) => (
            <article className="legal-modal-document" key={document.id}>
              <span>{document.policyType === "terms" ? "Termos de uso" : "Política da loja"}</span>
              <h3>{document.title}</h3>
              <p>{document.body}</p>
            </article>
          ))}
        </div>

        <label className="legal-acceptance-check">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
          />
          <span>Li e aceito os termos e políticas publicados.</span>
        </label>

        <div className="legal-modal-actions">
          {canDismiss && (
            <button
              type="button"
              className="button secondary"
              onClick={onDismiss}
              disabled={busy}
            >
              Voltar
            </button>
          )}
          <button
            type="button"
            className="button"
            disabled={!checked || busy}
            onClick={() => void onAccept()}
          >
            {busy ? "Salvando…" : "Li e aceito"}
          </button>
        </div>
      </section>
    </div>
  );
}
