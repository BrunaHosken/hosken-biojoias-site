import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="image-lightbox"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="image-lightbox-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={alt}
      >
        <button
          className="image-lightbox-close"
          type="button"
          aria-label="Fechar imagem ampliada"
          onClick={onClose}
          autoFocus
        >
          <X size={24} />
        </button>
        <img src={src} alt={alt} />
      </section>
    </div>,
    document.body,
  );
}
