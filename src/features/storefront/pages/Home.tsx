import { useContext } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Flower2, Leaf, MessageCircle } from "lucide-react";
import { SessionContext } from "../../../app/contexts";
import { Notice } from "../../../components/Feedback";
import { useRecords, type Taxonomy } from "../../../data";
import { HomeReviewCarousel } from "../../reviews/HomeReviewCarousel";

export function Home() {
  const session = useContext(SessionContext);
  const lines = useRecords<Taxonomy>("collections");
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span /> FLORES QUE GANHAM NOVAS HISTÓRIAS
          </div>
          <h1>
            Um pedacinho
            <br />
            da natureza.
            <br />
            <em>Sempre com você.</em>
          </h1>
          <p>
            Flores naturais preservadas em biojoias artesanais. Um encontro
            entre a delicadeza da natureza e o cuidado de criar à mão.
          </p>
          <Link className="button" to="/loja">
            Conheça as peças <ArrowRight size={18} />
          </Link>
          {session.ready && !session.admin && (
            <Link
              className="button secondary hero-custom-order-link"
              to="/chat?encomenda=personalizada"
            >
              Encomendar peça personalizada <MessageCircle size={17} />
            </Link>
          )}
          <div className="hero-note">
            <Leaf size={17} /> Cada flor tem sua própria beleza.
          </div>
        </div>
        <div className="hero-art">
          <span className="art-label">O UNIVERSO HOSKEN BIOJOIAS</span>
          <img
            src={`${import.meta.env.BASE_URL}hosken-logo.webp`}
            alt="Hosken Biojoias, logo com orquídeas rosas e folhagens"
          />
          <span className="art-bottom">Florescer. Preservar. Encantar.</span>
        </div>
      </section>
      <section className="intro-strip">
        <span>Flores naturais preservadas</span>
        <span>Criação artesanal</span>
        <span>Peças com personalidade</span>
      </section>
      {(lines.loading || lines.error || lines.data.length > 0) && (
        <section className="page">
          <div className="section-title">
            <div>
              <div className="eyebrow">ENCONTRE SUA PRÓXIMA HISTÓRIA</div>
              <h2>Conheça nossas linhas</h2>
            </div>
            <Link to="/loja">
              Explorar a loja <ArrowRight size={17} />
            </Link>
          </div>
          <Notice {...lines} />
          {lines.data.length > 0 && (
            <div
              className={`line-grid ${lines.data.length === 1 ? "line-grid-single" : ""}`}
            >
              {lines.data.map((line) => (
                <Link
                  className="line-card"
                  to={`/loja?linha=${encodeURIComponent(line.id)}`}
                  key={line.id}
                >
                  {line.imageUrls?.length ? (
                    <div
                      className={`line-card-gallery${line.imageUrls.length === 1 ? " line-card-gallery-single" : ""}`}
                    >
                      {line.imageUrls.map((imageUrl, index) => (
                        <img
                          src={imageUrl}
                          alt={`${line.name} · foto ${index + 1}`}
                          loading="lazy"
                          key={`${imageUrl}-${index}`}
                        />
                      ))}
                    </div>
                  ) : (
                    <Flower2 className="line-flower" strokeWidth={0.7} />
                  )}
                  <h3>
                    {line.name} <ArrowRight size={19} />
                  </h3>
                  <p>
                    {line.description ||
                      `Conheça as criações da linha ${line.name}.`}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
      <section className="story-band">
        <span className="eyebrow">POR TRÁS DE CADA PEÇA</span>
        <h2>
          O tempo da natureza.
          <br />
          <em>O carinho de quem cria.</em>
        </h2>
        <Link className="text-link" to="/sobre">
          Conheça nossa história <ArrowRight size={17} />
        </Link>
      </section>
      <HomeReviewCarousel />
    </>
  );
}
