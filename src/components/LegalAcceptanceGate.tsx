import { useContext, useState } from "react";
import { LegalContext, SessionContext, useToast } from "../app/contexts";
import { LegalAcceptanceModal } from "./LegalAcceptanceModal";

export function LegalAcceptanceGate() {
  const session = useContext(SessionContext);
  const legal = useContext(LegalContext);
  const notify = useToast();
  const [busy, setBusy] = useState(false);

  const needsAcceptance =
    session.ready &&
    Boolean(session.user) &&
    !session.admin &&
    legal.ready &&
    legal.profileReady &&
    !legal.registrationInProgress &&
    Boolean(legal.version) &&
    legal.acceptedVersion !== legal.version;

  if (!needsAcceptance) return null;

  return (
    <LegalAcceptanceModal
      documents={legal.documents}
      updated={Boolean(legal.acceptedVersion)}
      busy={busy}
      onAccept={async () => {
        setBusy(true);
        try {
          await legal.acceptCurrentVersion();
        } catch {
          notify("Não foi possível salvar seu aceite. Tente novamente.", "error");
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
