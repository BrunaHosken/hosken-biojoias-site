import {
  useContext,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Star, X } from "lucide-react";
import { SessionContext, useToast } from "../../app/contexts";
import {
  submitProductReview,
  updateProductReview,
  useCustomerOrders,
  useCustomerReviews,
  type ReviewPhoto,
} from "../../data";
import { storage } from "../../firebase";
import { convertToWebp } from "../../utils/convertToWebp";
import { uploadFile } from "../../utils/uploadFile";
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
} from "firebase/storage";

export function ReviewFormPage() {
  const session = useContext(SessionContext);
  const navigate = useNavigate();
  const notify = useToast();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("pedido") || "";
  const itemIndex = searchParams.has("item") ? Number(searchParams.get("item")) : -1;
  const editRequested = searchParams.get("editar") === "1";
  const orders = useCustomerOrders(session.user?.uid);
  const reviews = useCustomerReviews(session.user?.uid);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [savedPhotos, setSavedPhotos] = useState<ReviewPhoto[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const initializedReviewId = useRef("");

  useEffect(() => {
    const previews = photos.map((photo) => URL.createObjectURL(photo));
    setPhotoPreviews(previews);
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);

  const order = orders.data.find((entry) => entry.id === orderId);
  const item = order?.items[itemIndex];
  const existingReview = reviews.data.find(
    (review) => review.orderId === orderId && review.itemIndex === itemIndex,
  );
  const canEdit = Boolean(editRequested && existingReview);
  const canReview = Boolean(
    order &&
      order.status === "completed" &&
      Number.isInteger(itemIndex) &&
      item &&
      item.productId !== "custom" &&
      (!existingReview || canEdit),
  );

  useEffect(() => {
    if (!editRequested) {
      initializedReviewId.current = "";
      setRating(0);
      setText("");
      setAnonymous(false);
      setSavedPhotos([]);
      setPhotos([]);
      return;
    }
    if (!existingReview || initializedReviewId.current === existingReview.id) return;
    initializedReviewId.current = existingReview.id;
    setRating(existingReview.rating);
    setText(existingReview.text || "");
    setAnonymous(existingReview.anonymous);
    setSavedPhotos(existingReview.photos || []);
    setPhotos([]);
  }, [editRequested, existingReview]);

  function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = "";
    if (savedPhotos.length + photos.length + selected.length > 3) {
      setFormError("Você pode anexar até 3 fotos.");
      return;
    }
    if (selected.some((file) => !file.type.startsWith("image/") || file.size > 10 * 1024 * 1024)) {
      setFormError("Escolha imagens de até 10 MB cada.");
      return;
    }
    setFormError("");
    setPhotos((current) => [...current, ...selected]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session.user || !order || !item || !canReview || rating < 1) return;
    setBusy(true);
    setFormError("");
    const uploadedPaths: string[] = [];
    const removedPhotoPaths = (existingReview?.photos || [])
      .filter((photo) => !savedPhotos.some((saved) => saved.path === photo.path))
      .map((photo) => photo.path);
    try {
      const uploadedPhotos: ReviewPhoto[] = [];
      for (const photo of photos) {
        const webp = await convertToWebp(photo);
        if (webp.size > 5 * 1024 * 1024) throw new Error("review-photo-too-large");
        const path = `reviews/${session.user.uid}/${crypto.randomUUID()}.webp`;
        const target = storageRef(storage, path);
        await uploadFile(target, webp, { contentType: "image/webp" });
        uploadedPaths.push(path);
        uploadedPhotos.push({ path, url: await getDownloadURL(target) });
      }
      const input = {
        orderId,
        itemIndex,
        rating,
        text: text.trim(),
        anonymous,
        photos: [...savedPhotos, ...uploadedPhotos],
      };
      if (canEdit) await updateProductReview(input);
      else await submitProductReview(input);

      await Promise.allSettled(
        removedPhotoPaths.map((path) => deleteObject(storageRef(storage, path))),
      );
      notify(canEdit ? "Sua avaliação foi atualizada." : "Obrigada por compartilhar sua experiência!", "success");
      navigate("/minhas-avaliacoes", { replace: true });
    } catch (error) {
      await Promise.allSettled(
        uploadedPaths.map((path) => deleteObject(storageRef(storage, path))),
      );
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : "";
      setFormError(
        code.endsWith("/already-exists")
          ? "Você já avaliou esta peça deste pedido. Você pode editar a avaliação em Minhas avaliações."
          : "Não foi possível salvar sua avaliação. Confira as fotos e tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!session.ready || orders.loading || reviews.loading) {
    return <div className="page narrow">Carregando…</div>;
  }
  if (!session.user) {
    const requestedPath = `/avaliar?${searchParams.toString()}`;
    return (
      <div className="page narrow">
        <h1>Entre para avaliar</h1>
        <p className="lead">A avaliação fica vinculada à sua compra para manter as opiniões verificadas.</p>
        <Link className="button" to={`/conta?returnTo=${encodeURIComponent(requestedPath)}`}>Entrar na conta</Link>
      </div>
    );
  }
  if (orders.error || reviews.error) {
    return <div className="page narrow"><p className="notice" role="alert">{orders.error || reviews.error}</p></div>;
  }
  if (!order || !item || order.status !== "completed" || item.productId === "custom") {
    return (
      <div className="page narrow">
        <h1>Avaliação indisponível</h1>
        <p className="lead">Você poderá avaliar uma peça do catálogo quando o pedido estiver concluído.</p>
        <Link className="text-link" to="/minhas-avaliacoes"><ArrowLeft size={16} /> Voltar às avaliações</Link>
      </div>
    );
  }
  if (editRequested && !existingReview) {
    return (
      <div className="page narrow">
        <h1>Avaliação não encontrada</h1>
        <p className="lead">Não encontramos uma avaliação sua para esta peça deste pedido.</p>
        <Link className="text-link" to="/minhas-avaliacoes"><ArrowLeft size={16} /> Voltar às avaliações</Link>
      </div>
    );
  }
  if (existingReview && !editRequested) {
    return (
      <div className="page narrow">
        <div className="eyebrow">SUA EXPERIÊNCIA</div>
        <h1>Avaliação recebida</h1>
        <p className="lead">Obrigada por contar como foi receber {item.name}.</p>
        <Link className="button secondary" to={`/avaliar?pedido=${encodeURIComponent(orderId)}&item=${itemIndex}&editar=1`}>Editar avaliação</Link>
      </div>
    );
  }

  return (
    <div className="page narrow review-form-page">
      <div className="eyebrow">SUA EXPERIÊNCIA COM A HOSKEN</div>
      <h1>{canEdit ? "Editar sua avaliação" : "Como foi receber sua peça?"}</h1>
      <p className="lead">Sua opinião ajuda outras pessoas a escolher e ajuda o ateliê a continuar florescendo.</p>
      <div className="review-order-reference">
        <strong>{item.name}</strong>
        <small>Pedido {order.orderNumber || order.id.slice(-8).toUpperCase()}</small>
      </div>
      <form className="review-form" onSubmit={submit}>
        <fieldset className="review-rating-picker">
          <legend>Sua avaliação</legend>
          <div>
            {[1, 2, 3, 4, 5].map((value) => (
              <button type="button" key={value} aria-label={`${value} ${value === 1 ? "estrela" : "estrelas"}`} aria-pressed={rating === value} onClick={() => setRating(value)}>
                <Star size={32} fill={value <= rating ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
        </fieldset>
        <label>
          Conte um pouco da sua experiência (opcional)
          <textarea value={text} maxLength={3000} onChange={(event) => setText(event.target.value)} rows={5} placeholder="O que você achou da peça?" />
        </label>
        <label className="review-photo-input">
          Fotos (opcional, até 3)
          <input type="file" accept="image/*" multiple onChange={addPhotos} disabled={busy || savedPhotos.length + photos.length >= 3} />
          <small>As imagens são otimizadas e salvas em WebP.</small>
        </label>
        {(savedPhotos.length > 0 || photoPreviews.length > 0) && (
          <div className="review-upload-previews">
            {savedPhotos.map((photo, index) => (
              <div key={photo.path}>
                <img src={photo.url} alt={`Foto ${index + 1} da avaliação`} />
                <button type="button" aria-label={`Remover foto ${index + 1}`} onClick={() => setSavedPhotos((current) => current.filter((saved) => saved.path !== photo.path))} disabled={busy}><X size={16} /></button>
              </div>
            ))}
            {photoPreviews.map((preview, index) => (
              <div key={`${preview}-${index}`}>
                <img src={preview} alt={`Prévia da foto ${savedPhotos.length + index + 1}`} />
                <button type="button" aria-label={`Remover foto ${savedPhotos.length + index + 1}`} onClick={() => setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))} disabled={busy}><X size={16} /></button>
              </div>
            ))}
          </div>
        )}
        <label className="review-anonymous-choice">
          <input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} disabled={busy} />
          <span>Publicar minha avaliação anonimamente</span>
        </label>
        <p className="review-privacy-note">Sua avaliação e as fotos poderão aparecer na página da peça. Se escolher anonimato, seu nome, o nome da peça e o número do pedido não serão exibidos junto à avaliação.</p>
        {(formError || rating < 1) && <p className="notice" role={formError ? "alert" : "status"}>{formError || "Escolha uma nota de 1 a 5 estrelas para continuar."}</p>}
        <div className="review-form-actions">
          <Link className="button secondary" to="/minhas-avaliacoes">Voltar</Link>
          <button className="button" type="submit" disabled={busy || rating < 1}>
            {busy ? "Salvando…" : canEdit ? "Salvar alterações" : "Enviar avaliação"}
          </button>
        </div>
      </form>
    </div>
  );
}
