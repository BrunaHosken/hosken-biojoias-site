export function Contact() {
  return (
    <div className="page">
      <div className="eyebrow">VAMOS CONVERSAR</div>
      <h1>Um contato, muitas histórias.</h1>
      <p className="lead">
        Tem alguma dúvida sobre as peças ou quer conversar sobre uma encomenda?
        Fale com a Hosken Biojoias.
      </p>
      <div className="contact-links">
        <a href="https://wa.me/5522992339779" target="_blank" rel="noreferrer">
          <strong>WhatsApp ↗</strong>
          <span>(22) 99233-9779</span>
          <p>Converse sobre peças e encomendas.</p>
        </a>
        <a
          href="https://www.instagram.com/hosken.biojoias/"
          target="_blank"
          rel="noreferrer"
        >
          <strong>Instagram ↗</strong>
          <span>@hosken.biojoias</span>
          <p>Acompanhe as criações e o dia a dia do ateliê.</p>
        </a>
        <a href="mailto:nil2martins@gmail.com">
          <strong>E-mail</strong>
          <span>nil2martins@gmail.com</span>
          <p>Escreva para conversar sobre uma peça ou encomenda.</p>
        </a>
      </div>
    </div>
  );
}
