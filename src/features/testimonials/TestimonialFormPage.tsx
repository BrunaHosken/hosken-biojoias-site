import { useContext, useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SessionContext, useToast } from "../../app/contexts";
import { submitTestimonial, useMyTestimonial } from "../../data";

const MAX_LENGTH = 1500;

export function TestimonialFormPage() {
  const session = useContext(SessionContext);
  const notify = useToast();
  const testimonial = useMyTestimonial(session.user?.uid);
  const initializedUid = useRef("");
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const uid = session.user?.uid || "";
    if (!uid || testimonial.loading || initializedUid.current === uid) return;
    initializedUid.current = uid;
    setText(testimonial.data?.text || "");
    setAnonymous(testimonial.data?.anonymous || false);
  }, [session.user?.uid, testimonial.loading, testimonial.data]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session.user || text.trim().length < 3) return;
    setBusy(true);
    setFormError("");
    try {
      await submitTestimonial({ text: text.trim(), anonymous });
      notify("Seu depoimento foi salvo.", "success");
    } catch {
      setFormError("Não foi possível salvar seu depoimento. Tente novamente.");
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
        <p className="testimonial-privacy-note">
          Seu texto só aparece publicamente se a artesã o selecionar para a página inicial.
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
