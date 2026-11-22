import { useEffect, useState } from "react";
import { Check, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isStandaloneWindow() {
  const iosStandalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone;
}

function isAppleMobile() {
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function PwaInstallControl() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [installationComplete, setInstallationComplete] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const updateDisplayMode = () => setStandalone(isStandaloneWindow());
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setInstallationComplete(true);
      setInstallPrompt(null);
      setShowInstructions(false);
    };

    updateDisplayMode();
    displayMode.addEventListener("change", updateDisplayMode);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      displayMode.removeEventListener("change", updateDisplayMode);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstallClick() {
    if (!installPrompt) {
      setShowInstructions((visible) => !visible);
      return;
    }

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setInstallationComplete(true);
    } catch {
      setShowInstructions(true);
    } finally {
      setInstallPrompt(null);
    }
  }

  if (standalone || installationComplete) {
    return (
      <div className="pwa-install-control pwa-install-status" role="status">
        <Check size={17} aria-hidden="true" />
        <span>{standalone ? "App instalado" : "Instalação concluída"}</span>
      </div>
    );
  }

  return (
    <div className={`pwa-install-control${showInstructions ? " has-help" : ""}`}>
      <button
        type="button"
        className="pwa-install-button"
        aria-expanded={showInstructions}
        onClick={() => void handleInstallClick()}
      >
        <Download size={17} aria-hidden="true" />
        <span>Instalar app</span>
      </button>
      {showInstructions && (
        <p className="pwa-install-help" role="status">
          {isAppleMobile()
            ? "No Safari, toque em Compartilhar e escolha Adicionar à Tela de Início."
            : "No menu do navegador, escolha Instalar app ou Adicionar à tela inicial."}
        </p>
      )}
    </div>
  );
}
