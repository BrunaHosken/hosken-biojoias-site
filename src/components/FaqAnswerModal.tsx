import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { Content } from "../data";

export function FaqAnswerModal({
  faq,
  onClose,
}: {
  faq: Content;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const previouslyFocusedRef = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      previouslyFocusedRef.current?.focus();
    };
  }, []);

  return createPortal(
    <div
      className="faq-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="faq-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="faq-modal-title"
      >
        <header className="faq-modal-header">
          <span className="eyebrow">
            {faq.category || "PERGUNTAS FREQUENTES"}
          </span>
          <button
            ref={closeButtonRef}
            className="faq-modal-close"
            type="button"
            aria-label="Fechar resposta"
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="faq-modal-scroll">
          <h2 id="faq-modal-title">{faq.title}</h2>
          <div className="faq-answer">
            {(faq.body || "").split(/\n{2,}/).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
