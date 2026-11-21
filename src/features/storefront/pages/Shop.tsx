import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Flower2 } from "lucide-react";
import { SessionContext } from "../../../app/contexts";
import { Notice } from "../../../components/Feedback";
import {
  getProductAvailability,
  getProductTotalPriceCents,
  money,
  getStorefrontProduct,
  useRecords,
  type Product,
  type Taxonomy,
} from "../../../data";
import { availability } from "../../../app/constants";
import {
  getProductStock,
  isNecklaceCategory,
} from "../../../data/productAvailability";
import { PieceArt } from "./ProductVisuals";

export function Shop() {
  const session = useContext(SessionContext);
  const products = useRecords<Product>("products");
  const lines = useRecords<Taxonomy>("collections");
  const cats = useRecords<Taxonomy>("categories");
  const colors = useRecords<Taxonomy>("colors");
  const [line, setLine] = useState(
    new URLSearchParams(location.search).get("linha") || "",
  );
  const [cat, setCat] = useState("");
  const [search, setSearch] = useState("");
  const visibleProducts = products.data
    .map((product) =>
      getStorefrontProduct(product, cats.data, lines.data, colors.data),
    )
    .filter((product): product is Product => Boolean(product));
  const filtered = visibleProducts.filter(
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
      {session.ready && !session.admin && (
        <div className="custom-order-callout">
          <div>
            <strong>Tem uma ideia especial?</strong>
            <p>Converse com a artesã sobre uma peça feita para você.</p>
          </div>
          <Link className="button secondary" to="/chat?encomenda=personalizada">
            Encomendar peça personalizada <ArrowRight size={17} />
          </Link>
        </div>
      )}
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
            <p>
              {money(
                getProductTotalPriceCents(
                  p,
                  isNecklaceCategory(
                    cats.data.find((category) => category.id === p.categoryId),
                  ),
                ),
              )}
            </p>
            <small className="product-card-stock">
              {availability[getProductAvailability(p)]} · {getProductStock(p)}{" "}
              unidade(s)
            </small>
          </Link>
        ))}
      </div>
      {!products.loading &&
        !lines.loading &&
        !cats.loading &&
        !colors.loading &&
        !products.error &&
        !filtered.length && (
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
