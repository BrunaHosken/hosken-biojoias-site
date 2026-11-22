import {
  useContext,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ImagePlus, X } from "lucide-react";
import { SessionContext, useToast } from "../../app/contexts";
import {
  submitTestimonial,
  useMyTestimonial,
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

const MAX_LENGTH = 1500;

export function TestimonialFormPage() {
  const session = useContext(SessionContext);
  const notify = useToast();
  const testimonial = useMyTestimonial(session.user?.uid);
  const initializedUid = useRef("");
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [savedPhoto, setSavedPhoto] = useState<ReviewPhoto | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const uid = session.user?.uid || "";
    if (!uid || testimonial.loading || initializedUid.current === uid) return;
    initializedUid.current = uid;
    setText(testimonial.data?.text || "");
    setAnonymous(testimonial.data?.anonymous || false);
    setSavedPhoto(testimonial.data?.photo || null);
    setPhoto(null);
  }, [session.user?.uid, testimonial.loading, testimonial.data]);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview("");
      return;
    }
    const preview = URL.createObjectURL(photo);
    setPhotoPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [photo]);

  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.currentTarget.files?.[0] || null;
    event.currentTarget.value = "";
    if (!selected) return;
    if (!selected.type.startsWith("image/") || selected.size > 10 * 1024 * 1024) {
      setFormError("Escolha uma imagem de até 10 MB.");
      return;
    }
    setFormError("");
    setPhoto(selected);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session.user || text.trim().length < 3) return;
    setBusy(true);
    setFormError("");
    const uploadedPaths: string[] = [];
    const previousPhoto = testimonial.data?.photo || null;
    let nextPhoto = savedPhoto;
    try {
      if (photo) {
        const webp = await convertToWebp(photo);
        if (webp.size > 5 * 1024 * 1024) throw new Error("testimonial-photo-too-large");
        const path = `testimonials/${session.user.uid}/${crypto.randomUUID()}.webp`;
        const target = storageRef(storage, path);
        await uploadFile(target, webp, { contentType: "image/webp" });
        uploadedPaths.push(path);
        nextPhoto = { path, url: await getDownloadURL(target) };
      }
      await submitTestimonial({ text: text.trim(), anonymous, photo: nextPhoto });
      if (previousPhoto && previousPhoto.path !== nextPhoto?.path) {
        await deleteObject(storageRef(storage, previousPhoto.path)).catch(() => undefined);
      }
      setSavedPhoto(nextPhoto);
      setPhoto(null);
      notify("Seu depoimento foi salvo.", "success");
    } catch (error) {
      await Promise.allSettled(
        uploadedPaths.map((path) => deleteObject(storageRef(storage, path))),
      );
      setFormError(
        error instanceof Error && error.message === "testimonial-photo-too-large"
          ? "A imagem ficou maior que 5 MB após a otimização. Escolha outra foto."
          : "Não foi possível salvar seu depoimento. Confira a foto e tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!session.ready) return <div className="page narrow">Carregando…</div>;
  if (!session.user) {
    const returnTo = "/meu-depoimento";
    return (
      <div className="page narrow testimonial-page">
        <div className="eyebrow">SUA HISTÓRIA</div>
        <h1>Compartilhe seu depoimento</h1>
        <p className="lead">Entre na sua conta para contar sua experiência com a Hosken Biojoias.</p>
        <Link className="button" to={`/conta?returnTo=${encodeURIComponent(returnTo)}`}>
          Entrar ou criar conta <ArrowRight size={18} />
        </Link>
      </div>
    );
  }
  if (testimonial.loading) return <div className="page narrow">Carregando seu depoimento…</div>;
  if (testimonial.error) {
    return <div className="page narrow"><p className="notice" role="alert">{testimonial.error}</p></div>;
  }

  return (
    <div className="page narrow testimonial-page">
      <Link className="text-link testimonial-back-link" to="/conta">
        <ArrowLeft size={16} /> Voltar à minha conta
      </Link>
      <div className="eyebrow">SUA HISTÓRIA</div>
      <h1>{testimonial.data ? "Edite seu depoimento" : "Deixe seu depoimento"}</h1>
      <p className="lead">
        Não precisa ter feito uma compra. Conte o que gostaria de compartilhar com quem visita nosso ateliê.
      </p>
      {testimonial.data && (
        <p className="testimonial-selection-status">
          {testimonial.data.featuredHome
            ? "Seu depoimento está selecionado para aparecer na página inicial."
            : "Depois de salvo, a artesã poderá selecioná-lo para a página inicial."}
        </p>
      )}
      <form className="testimonial-form" onSubmit={(event) => void save(event)}>
        <label htmlFor="testimonial-text">
          Seu depoimento
          <textarea
            id="testimonial-text"
            value={text}
            maxLength={MAX_LENGTH}
            minLength={3}
            required
            onChange={(event) => setText(event.target.value)}
            placeholder="Escreva aqui sua mensagem…"
          />
          <small>{text.length}/{MAX_LENGTH} caracteres</small>
        </label>
        <label className="testimonial-anonymous-option">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(event) => setAnonymous(event.target.checked)}
          />
          <span>Quero que meu depoimento apareça sem meu nome.</span>
        </label>
        <div className="testimonial-photo-field">
          <span>Foto do depoimento (opcional)</span>
          <label className="button secondary testimonial-photo-picker">
            <ImagePlus size={17} />
            {photo || savedPhoto ? "Trocar foto" : "Adicionar foto"}
            <input
              type="file"
              accept="image/*"
              onChange={selectPhoto}
              disabled={busy}
            />
          </label>
          <small>A foto será otimizada e salva em WebP. Você pode enviar uma.</small>
          {(photoPreview || (!photo && savedPhoto?.url)) && (
            <div className="testimonial-photo-preview">
              <img
                src={photoPreview || savedPhoto?.url}
                alt="Prévia da foto do depoimento"
              />
              <button
                type="button"
                aria-label="Remover foto do depoimento"
                onClick={() => {
                  setPhoto(null);
                  setSavedPhoto(null);
                }}
                disabled={busy}
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>
        <p className="testimonial-privacy-note">
          Seu depoimento só aparece publicamente se a artesã o selecionar para a página inicial. Se incluir uma foto, ela aparecerá junto com o depoimento.
        </p>
        {formError && <p className="notice" role="alert">{formError}</p>}
        <div className="testimonial-form-actions">
          <button className="button" type="submit" disabled={busy || text.trim().length < 3}>
            {busy ? "Salvando…" : testimonial.data ? "Salvar alterações" : "Enviar depoimento"}
            <ArrowRight size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
