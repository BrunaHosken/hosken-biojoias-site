import { useContext, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ShoppingBag,
  Flower2,
  Leaf,
  MessageCircle,
} from "lucide-react";
import { BasketContext, SessionContext } from "../../app/contexts";
import { availability, POLICY_TYPES } from "../../app/constants";
import { Notice } from "../../components/Feedback";
import { getProductImages } from "./productImages";
import {
  money,
  useRecords,
  type Content,
  type Product,
  type Taxonomy,
} from "../../data";

export function Home() {
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
          <div className="hero-note">
            <Leaf size={17} /> Cada flor tem sua própria beleza.
          </div>
        </div>
        <div className="hero-art">
          <span className="art-label">O UNIVERSO HOSKEN BIOJOIAS</span>
          <img
            src="/hosken-logo.png"
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
                  <Flower2 className="line-flower" strokeWidth={0.7} />
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
    </>
  );
}
function PieceArt({
  product,
  imageUrl,
}: {
  product: Product;
  imageUrl?: string;
}) {
  const image = imageUrl ?? getProductImages(product)[0] ?? "";
  return (
    <div className="piece-art">
      {image ? (
        <img src={image} alt={product.name} decoding="async" />
      ) : (
        <>
          <Flower2 strokeWidth={0.65} />
          <small>FOTOGRAFIA EM BREVE</small>
        </>
      )}
      <span className="tag">{availability[product.availability]}</span>
    </div>
  );
}
function ProductGallery({ product }: { product: Product }) {
  const images = getProductImages(product);
  const [selectedImage, setSelectedImage] = useState(0);
  useEffect(() => setSelectedImage(0), [product.id]);
  return (
    <div className="product-gallery">
      <PieceArt product={product} imageUrl={images[selectedImage]} />
      {images.length > 1 && (
        <div className="product-thumbnails" aria-label="Fotos do produto">
          {images.map((image, index) => (
            <button
              type="button"
              key={`${image}-${index}`}
              className={selectedImage === index ? "selected" : ""}
              aria-label={`Ver foto ${index + 1} de ${images.length}`}
              aria-pressed={selectedImage === index}
              onClick={() => setSelectedImage(index)}
            >
              <img src={image} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
export function Shop() {
  const products = useRecords<Product>("products");
  const lines = useRecords<Taxonomy>("collections");
  const cats = useRecords<Taxonomy>("categories");
  const [line, setLine] = useState(
    new URLSearchParams(location.search).get("linha") || "",
  );
  const [cat, setCat] = useState("");
  const [search, setSearch] = useState("");
  const filtered = products.data.filter(
    (p) =>
      (!line || p.collectionId === line) &&
      (!cat || p.categoryId === cat) &&
      p.name
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")),
  );
  return (
    <div className="page">
      <div className="eyebrow">FEITO À MÃO, PARA VOCÊ</div>
      <h1>Peças que florescem.</h1>
      <p className="lead">
        Explore as criações e encontre uma flor para chamar de sua.
      </p>
      <div className="filters">
        <label>
          Linha
          <select value={line} onChange={(e) => setLine(e.target.value)}>
            <option value="">Todas as linhas</option>
            {lines.data.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo de peça
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Todos os tipos</option>
            {cats.data.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="search">
          Buscar
          <input
            placeholder="O que você procura?"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <Notice {...products} />
      <div className="product-grid">
        {filtered.map((p) => (
          <Link to={`/produto/${p.id}`} className="product-card" key={p.id}>
            <PieceArt product={p} />
            <small>
              {lines.data.find((l) => l.id === p.collectionId)?.name}
            </small>
            <h3>{p.name}</h3>
            <p>{money(p.priceCents)}</p>
          </Link>
        ))}
      </div>
      {!products.loading && !products.error && !filtered.length && (
        <div className="empty">
          <Flower2 />
          <h2>Novas flores estão a caminho.</h2>
          <p>Ainda não há peças publicadas nesta seleção.</p>
          <button
            className="button secondary"
            onClick={() => {
              setCat("");
              setLine("");
              setSearch("");
            }}
          >
            Ver todas as peças
          </button>
        </div>
      )}
    </div>
  );
}
export function ProductPage() {
  const { id } = useParams();
  const session = useContext(SessionContext);
  const products = useRecords<Product>("products");
  const { items, change } = useContext(BasketContext);
  const product = products.data.find((p) => p.id === id);
  return (
    <div className="page">
      <Link className="back" to="/loja">
        ← Voltar à loja
      </Link>
      <Notice {...products} />
      {product ? (
        <div className="product-detail">
          <ProductGallery product={product} />
          <div>
            <div className="eyebrow">UM ENCONTRO COM A NATUREZA</div>
            <h1>{product.name}</h1>
            <p className="price">{money(product.priceCents)}</p>
            <p className="description">{product.description}</p>
            {product.materials ||
            product.dimensions ||
            product.careInstructions ? (
              <dl className="product-specs">
                {product.materials && (
                  <div>
                    <dt>Materiais</dt>
                    <dd>{product.materials}</dd>
                  </div>
                )}
                {product.dimensions && (
                  <div>
                    <dt>Medidas</dt>
                    <dd>{product.dimensions}</dd>
                  </div>
                )}
                {product.careInstructions && (
                  <div>
                    <dt>Cuidados</dt>
                    <dd>{product.careInstructions}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="muted product-details-pending">
                Mais detalhes sobre materiais, medidas e cuidados serão
                adicionados em breve.
              </p>
            )}
            <p>
              {availability[product.availability]} · {product.stock} unidade(s)
            </p>
            <div className="product-actions">
              <button
                className="button"
                disabled={
                  product.availability !== "available" ||
                  product.stock <= (items[product.id] || 0)
                }
                onClick={() => change(product.id, 1)}
              >
                Adicionar à sacola <ShoppingBag size={18} />
              </button>
              {!session.admin && (
                <Link
                  className="button secondary product-chat-link"
                  to={
                    session.user
                      ? `/chat?${new URLSearchParams({
                          produto: product.id,
                          nome: product.name,
                        }).toString()}`
                      : `/conta?returnTo=${encodeURIComponent(
                          `/chat?${new URLSearchParams({
                            produto: product.id,
                            nome: product.name,
                          }).toString()}`,
                        )}`
                  }
                >
                  Tirar dúvidas sobre esta peça <MessageCircle size={18} />
                </Link>
              )}
            </div>
            {!!items[product.id] && (
              <p role="status">
                {items[product.id]} na sacola.{" "}
                <Link to="/carrinho">Ver carrinho →</Link>
              </p>
            )}
          </div>
        </div>
      ) : (
        !products.loading && !products.error && <h1>Peça não encontrada</h1>
      )}
    </div>
  );
}
export function ContentPage({
  name,
  title,
  subtitle,
}: {
  name: string;
  title: string;
  subtitle: string;
}) {
  const records = useRecords<Content>(name);
  const displayedRecords =
    name === "events"
      ? [...records.data].sort((a, b) =>
          (
            getEventSchedule(a)[0]?.date ||
            a.eventDate ||
            "9999-12-31"
          ).localeCompare(
            getEventSchedule(b)[0]?.date || b.eventDate || "9999-12-31",
          ),
        )
      : records.data;
  return (
    <div className="page">
      <div className="eyebrow">UNIVERSO HOSKEN BIOJOIAS</div>
      <h1>{title}</h1>
      <p className="lead">{subtitle}</p>
      <Notice {...records} />
      <div className="content-grid">
        {displayedRecords.map((r) => (
          <article className="content-card" key={r.id}>
            <Flower2 size={28} />
            <h2>{r.title}</h2>
            {name === "events" &&
              (getEventSchedule(r).length ||
                r.location ||
                r.address ||
                r.mapUrl) && (
                <div className="event-details">
                  {getEventSchedule(r).map((entry, index) => (
                    <p
                      className="event-schedule-public"
                      key={`${entry.date}-${entry.time}-${index}`}
                    >
                      {entry.date && formatEventDate(entry.date)}
                      {entry.date && entry.time && " · "}
                      {entry.time}
                    </p>
                  ))}
                  {r.location && <p>{r.location}</p>}
                  {r.address && <p>{r.address}</p>}
                  {isHttpUrl(r.mapUrl) && (
                    <a href={r.mapUrl} target="_blank" rel="noreferrer">
                      Como chegar <ArrowRight size={15} />
                    </a>
                  )}
                </div>
              )}
            <p>{r.body}</p>
          </article>
        ))}
      </div>
      {!records.loading && !records.error && !records.data.length && (
        <div className="empty">
          <Leaf />
          <h2>Em breve, novidades por aqui.</h2>
          <p>Os próximos anúncios aparecerão nesta página.</p>
        </div>
      )}
    </div>
  );
}
export function getEventSchedule(event: Content) {
  const schedule = Array.isArray(event.eventSchedule)
    ? event.eventSchedule.filter((entry) => entry.date || entry.time)
    : [];
  if (schedule.length) return schedule;
  return event.eventDate || event.eventTime
    ? [{ date: event.eventDate || "", time: event.eventTime || "" }]
    : [];
}
function formatEventDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
  }).format(new Date(year, month - 1, day));
}
function isHttpUrl(value?: string) {
  if (!value) return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
export function PoliciesPage() {
  const policies = useRecords<Content>("policies");
  return (
    <div className="page">
      <div className="eyebrow">INFORMAÇÕES DA LOJA</div>
      <h1>Políticas da loja</h1>
      <p className="lead">
        Consulte as informações sobre compras, entregas, trocas e privacidade.
      </p>
      <Notice {...policies} />
      <div className="content-grid">
        {policies.data.map((policy) => (
          <article className="content-card policy-card" key={policy.id}>
            <span className="policy-type">
              {POLICY_TYPES.find((type) => type.id === policy.policyType)
                ?.label || "Geral"}
            </span>
            <h2>{policy.title}</h2>
            <p>{policy.body}</p>
          </article>
        ))}
      </div>
      {!policies.loading && !policies.error && !policies.data.length && (
        <div className="empty">
          <Leaf />
          <h2>Estamos preparando estas informações.</h2>
          <p>
            As políticas de entrega, trocas e privacidade serão publicadas pelo
            ateliê antes da abertura da loja.
          </p>
        </div>
      )}
    </div>
  );
}
export function About() {
  return (
    <div className="page about">
      <div>
        <div className="eyebrow">NOSSA ESSÊNCIA</div>
        <h1>
          A beleza de guardar
          <br />
          <em>o que floresce.</em>
        </h1>
        <p className="lead">
          A Hosken cria biojoias artesanais com flores naturais preservadas em
          resina.
        </p>
        <p>
          As formas e os detalhes de cada flor fazem parte da identidade das
          peças. É essa conexão com a natureza que queremos levar para o seu dia
          a dia.
        </p>
        <p className="muted">
          Este é o começo da nossa página. Em breve, a história completa do
          ateliê e de quem faz cada criação.
        </p>
        <Link className="button" to="/loja">
          Conheça as peças <ArrowRight size={18} />
        </Link>
      </div>
      <img src="/hosken-logo.png" alt="Logo Hosken com orquídeas" />
    </div>
  );
}
