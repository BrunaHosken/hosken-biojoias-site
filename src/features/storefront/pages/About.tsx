import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

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
      <img
        src={`${import.meta.env.BASE_URL}hosken-logo.png`}
        alt="Logo Hosken com orquídeas"
      />
    </div>
  );
}
