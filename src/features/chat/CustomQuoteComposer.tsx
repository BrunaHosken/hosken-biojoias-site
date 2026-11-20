import { useEffect, useRef, useState, type FormEvent } from "react";
import { BadgePlus, ImagePlus, X } from "lucide-react";
import { useToast } from "../../app/contexts";
import { createCustomQuote, useRecords, type Taxonomy } from "../../data";
import { isNecklaceCategory } from "../../data/productAvailability";

export function CustomQuoteComposer({
  conversationId,
  adminId,
}: {
  conversationId: string;
  adminId: string;
}) {
  const notify = useToast();
  const categories = useRecords<Taxonomy>("categories");
  const colors = useRecords<Taxonomy>("colors");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>([]);
  const [basePrice, setBasePrice] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const categoryOptions = categories.data.filter(
    (category) => category.status === "published",
  );
  const colorOptions = colors.data.filter(
    (color) => color.status === "published",
  );
  const category = categoryOptions.find((item) => item.id === categoryId);
  const necklace = isNecklaceCategory(category);

  useEffect(() => {
    const previews = images.map((image) => URL.createObjectURL(image));
    setImagePreviews(previews);
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview));
  }, [images]);

  function reset() {
    setTitle("");
    setDescription("");
    setCategoryId("");
    setSelectedColorIds([]);
    setBasePrice("");
    setImages([]);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function addImages(files: File[]) {
    if (files.some((file) => !file.type.startsWith("image/"))) {
      notify("Escolha somente arquivos de imagem.", "warning");
      return;
    }
    if (files.some((file) => file.size > 10 * 1024 * 1024)) {
      notify("Cada foto precisa ter até 10 MB antes da conversão.", "warning");
      return;
    }
    if (images.length + files.length > 4) {
      notify("Você pode anexar até 4 fotos por proposta.", "warning");
      return;
    }
    setImages((current) => [...current, ...files]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!category || !adminId || busy) return;
    const basePriceCents = Math.round(Number(basePrice) * 100);
    if (!Number.isSafeInteger(basePriceCents) || basePriceCents <= 0) {
      notify("Informe um preço válido para a peça.", "warning");
      return;
    }
    const selectedColors = colorOptions.filter((color) =>
      selectedColorIds.includes(color.id),
    );
    setBusy(true);
    try {
      await createCustomQuote(
        conversationId,
        adminId,
        {
          title: title.trim(),
          description: description.trim(),
          categoryId: category.id,
          categoryName: category.name,
          categorySlug: category.slug,
          colorIds: selectedColors.map((color) => color.id),
          colorNames: Object.fromEntries(
            selectedColors.map((color) => [color.id, color.name]),
          ),
          basePriceCents,
        },
        images,
      );
      reset();
      setOpen(false);
      notify("Proposta enviada pelo chat.", "success");
    } catch (cause) {
      if (import.meta.env.DEV)
        console.error("Custom quote creation failed", cause);
      notify("Não foi possível enviar a proposta. Tente novamente.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="custom-quote-composer">
      <button
        type="button"
        className="custom-quote-toggle"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X size={17} /> : <BadgePlus size={17} />}
        {open ? "Fechar proposta" : "Preparar proposta personalizada"}
      </button>
      {open && (
        <form className="custom-quote-form" onSubmit={submit}>
          <div>
            <strong>Proposta da artesã</strong>
            <p className="muted">
              A proposta fica somente neste atendimento e não entra no catálogo.
            </p>
          </div>
          <label>
            Nome da peça
            <input
              required
              maxLength={100}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex.: Pingente de orquídea"
            />
          </label>
          <label>
            Detalhes da proposta
            <textarea
              required
              maxLength={1500}
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Descreva materiais, formato e outros detalhes combinados."
            />
          </label>
          <div className="custom-quote-image-field">
            <span>Fotos de referência ou da peça</span>
            <input
              ref={imageInputRef}
              className="sr-only"
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                const selectedFiles = Array.from(
                  event.currentTarget.files || [],
                );
                event.currentTarget.value = "";
                addImages(selectedFiles);
              }}
            />
            <button
              type="button"
              className="custom-quote-image-picker"
              disabled={busy || images.length >= 4}
              onClick={() => imageInputRef.current?.click()}
            >
              <ImagePlus size={16} />
              Adicionar fotos ({images.length}/4)
            </button>
            <small>As imagens serão convertidas para WebP ao enviar.</small>
            {images.length > 0 && (
              <div className="custom-quote-image-list">
                {images.map((image, index) => (
                  <figure key={`${image.name}-${index}`}>
                    <img
                      src={imagePreviews[index]}
                      alt={`Prévia da foto ${index + 1}`}
                    />
                    <button
                      type="button"
                      aria-label={`Remover foto ${index + 1}`}
                      disabled={busy}
                      onClick={() =>
                        setImages((current) =>
                          current.filter(
                            (_, imageIndex) => imageIndex !== index,
                          ),
                        )
                      }
                    >
                      <X size={15} />
                    </button>
                  </figure>
                ))}
              </div>
            )}
          </div>
          <label>
            Tipo de peça
            <select
              required
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
              }}
            >
              <option value="">Selecione</option>
              {categoryOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="custom-quote-colors">
            <legend>Cores disponíveis para esta proposta</legend>
            <p className="muted">
              {colorOptions.length
                ? "Marque as cores que a cliente poderá escolher."
                : "Cadastre e publique cores no Catálogo para oferecê-las aqui."}
            </p>
            {colorOptions.map((color) => (
              <label key={color.id}>
                <input
                  type="checkbox"
                  checked={selectedColorIds.includes(color.id)}
                  disabled={
                    !selectedColorIds.includes(color.id) &&
                    selectedColorIds.length >= 20
                  }
                  onChange={(event) =>
                    setSelectedColorIds((current) =>
                      event.target.checked
                        ? [...current, color.id]
                        : current.filter((id) => id !== color.id),
                    )
                  }
                />
                {color.name}
              </label>
            ))}
          </fieldset>
          <label>
            Preço total da peça{necklace ? " (corrente incluída)" : ""} (R$)
            <input
              required
              type="number"
              min="0.01"
              max="1000000"
              step="0.01"
              value={basePrice}
              onChange={(event) => setBasePrice(event.target.value)}
            />
          </label>
          <button
            className="button"
            disabled={busy || categories.loading || !category}
          >
            {busy ? "Enviando proposta…" : "Enviar proposta"}
          </button>
        </form>
      )}
    </section>
  );
}
