import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  ArrowRight,
  ShoppingBag,
  Flower2,
  Menu,
  X,
  Plus,
  Minus,
  Leaf,
  LogOut,
  MessageCircle,
  Send,
  Bell,
} from "lucide-react";
import { auth, db, localMode } from "./firebase";
import {
  money,
  useCustomerOrders,
  useAdminOrders,
  useAdminConversations,
  useCustomerConversation,
  useConversationMessages,
  createCustomerConversation,
  sendChatMessage,
  markConversationRead,
  editChatMessage,
  deleteChatMessage,
  useRecords,
  type ChatConversation,
  type ChatMessage,
  type CustomerOrder,
  type Product,
  type Taxonomy,
  type Content,
} from "./data";

type Session = { user: User | null; admin: boolean; ready: boolean };
const SessionContext = createContext<Session>({
  user: null,
  admin: false,
  ready: false,
});
type Basket = {
  items: Record<string, number>;
  change: (id: string, delta: number) => void;
};
const BasketContext = createContext<Basket>({ items: {}, change: () => {} });
const availability: Record<string, string> = {
  available: "Disponível",
  soldout: "Esgotado",
  prelaunch: "Em breve",
  "made-to-order": "Sob encomenda",
};
function readBasket(): Record<string, number> {
  try {
    const v = JSON.parse(localStorage.getItem("hosken-cart") || "{}");
    return Object.fromEntries(
      Object.entries(v).filter(
        ([, n]) => Number.isInteger(n) && Number(n) > 0 && Number(n) <= 99,
      ),
    ) as Record<string, number>;
  } catch {
    return {};
  }
}
export default function App() {
  const [session, setSession] = useState<Session>({
    user: null,
    admin: false,
    ready: false,
  });
  const [items, setItems] = useState(readBasket);
  const [menu, setMenu] = useState(false);
  useEffect(
    () =>
      onIdTokenChanged(auth, async (user) => {
        try {
          const token = await user?.getIdTokenResult();
          setSession({
            user,
            admin: token?.claims.admin === true,
            ready: true,
          });
        } catch {
          setSession({ user: null, admin: false, ready: true });
        }
      }),
    [],
  );
  useEffect(() => {
    try {
      localStorage.setItem("hosken-cart", JSON.stringify(items));
    } catch {
      /* O carrinho continua funcionando em memória. */
    }
  }, [items]);
  const change = (id: string, delta: number) =>
    setItems((previous) => {
      const next = { ...previous };
      next[id] = Math.min(99, Math.max(0, (next[id] || 0) + delta));
      if (!next[id]) delete next[id];
      return next;
    });
  return (
    <SessionContext.Provider value={session}>
      <BasketContext.Provider value={{ items, change }}>
        {localMode && (
          <div className="local-banner">
            ATELIÊ EM CONSTRUÇÃO{" "}
            <span>
              Ambiente local · produtos e valores de exemplo · compras
              desativadas
            </span>
          </div>
        )}
        <header>
          <Link to="/" className="wordmark">
            <span>HOSKEN BIOJOIAS</span>
            <small>FEITO À MÃO</small>
          </Link>
          <button
            className="icon mobile-menu"
            aria-label="Abrir menu"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
          <nav className={menu ? "open" : ""} onClick={() => setMenu(false)}>
            {[
              ["/loja", "Loja"],
              ["/novidades", "Novidades"],
              ["/eventos", "Eventos"],
              ["/onde-encontrar", "Onde encontrar"],
              ["/sobre", "Nossa história"],
              ["/contato", "Contato"],
            ].map(([path, label]) => (
              <NavLink key={path} to={path}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <Link to="/conta">{session.user ? "Minha conta" : "Entrar"}</Link>
            {session.admin && <AdminHeaderNotificationBell />}
            {session.user && (
              <button
                className="header-logout"
                type="button"
                aria-label="Sair da conta"
                title="Sair da conta"
                onClick={() => signOut(auth)}
              >
                <LogOut size={17} />
                <span>Sair</span>
              </button>
            )}
            <Link
              to="/carrinho"
              className="bag"
              aria-label={`Carrinho com ${Object.values(items).reduce((a, b) => a + b, 0)} itens`}
            >
              <ShoppingBag size={21} />
              <span>{Object.values(items).reduce((a, b) => a + b, 0)}</span>
            </Link>
          </div>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/loja" element={<Shop />} />
            <Route path="/produto/:id" element={<ProductPage />} />
            <Route
              path="/novidades"
              element={
                <ContentPage
                  name="news"
                  title="Novidades do ateliê"
                  subtitle="Novas ideias, flores e caminhos."
                />
              }
            />
            <Route
              path="/eventos"
              element={
                <ContentPage
                  name="events"
                  title="Vamos nos encontrar?"
                  subtitle="Acompanhe os próximos encontros e feiras."
                />
              }
            />
            <Route
              path="/onde-encontrar"
              element={
                <ContentPage
                  name="partnerStores"
                  title="Hosken Biojoias perto de você"
                  subtitle="Conheça nossos pontos de encontro e lojas parceiras."
                />
              }
            />
            <Route path="/sobre" element={<About />} />
            <Route path="/contato" element={<Contact />} />
            <Route path="/conta" element={<Account />} />
            <Route path="/pedidos" element={<OrdersPage />} />
            <Route path="/chat" element={<CustomerChat />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/carrinho" element={<Cart />} />
            <Route
              path="*"
              element={
                <div className="page">
                  <h1>Página não encontrada</h1>
                  <Link to="/loja">Voltar à loja</Link>
                </div>
              }
            />
          </Routes>
        </main>
        {session.admin && <AdminNotificationBridge />}
        <FloatingChatButton />
        <footer>
          <div className="wordmark">
            <span>HOSKEN BIOJOIAS</span>
            <small>NATUREZA QUE ACOMPANHA VOCÊ.</small>
          </div>
          <p>Flores naturais. Histórias únicas. Feito à mão.</p>
          <div>
            <a
              href="https://www.instagram.com/hosken.biojoias/"
              target="_blank"
              rel="noreferrer"
            >
              Instagram ↗
            </a>
            <a
              href="https://wa.me/5522992339779"
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp ↗
            </a>
            <a href="mailto:nil2martins@gmail.com">E-mail</a>
            <Link to="/contato">Contato</Link>
            {session.admin && <Link to="/admin">Administrar</Link>}
          </div>
          <small>© {new Date().getFullYear()} Hosken Biojoias</small>
        </footer>
      </BasketContext.Provider>
    </SessionContext.Provider>
  );
}
function FloatingChatButton() {
  const session = useContext(SessionContext);
  const location = useLocation();
  if (location.pathname === "/chat" || location.pathname === "/admin")
    return null;
  return (
    <Link
      to={session.admin ? "/admin?tab=chat" : "/chat"}
      className="chat-fab"
      aria-label={session.admin ? "Abrir atendimentos" : "Falar com o ateliê"}
      title={session.admin ? "Abrir atendimentos" : "Falar com o ateliê"}
    >
      <MessageCircle size={24} />
    </Link>
  );
}
function AdminNotificationBridge() {
  const location = useLocation();
  const conversations = useAdminConversations(location.pathname !== "/admin");
  const unreadCount = conversations.data.reduce(
    (sum, conversation) => sum + (conversation.unreadForAdmin || 0),
    0,
  );
  useEffect(() => {
    if (location.pathname === "/admin") return;
    document.title = unreadCount
      ? `(${unreadCount}) Atendimento · Hosken Biojoias`
      : "Hosken Biojoias";
    const appNavigator = navigator as Navigator & {
      setAppBadge?: (contents?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (unreadCount > 0) {
      appNavigator.setAppBadge?.(unreadCount).catch(() => {});
    } else {
      appNavigator.clearAppBadge?.().catch(() => {});
    }
    return () => {
      document.title = "Hosken Biojoias";
    };
  }, [location.pathname, unreadCount]);
  return null;
}
function Home() {
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
        <div className="line-grid">
          {[
            [
              "biojoias",
              "01",
              "Biojoias",
              "A delicadeza das flores, preservada em cada detalhe.",
            ],
            [
              "eletroformacao",
              "02",
              "Eletroformação",
              "Novas formas de transformar a natureza em arte.",
            ],
            [
              "flores-secas",
              "03",
              "Flores secas",
              "A beleza de florescer em outros tempos.",
            ],
          ].map(([id, n, title, text]) => (
            <Link
              className={`line-card line-${id}`}
              to={`/loja?linha=${id}`}
              key={id}
            >
              <div className="line-top">
                <span>{n}</span>
                {id !== "biojoias" && (
                  <span className="tag">PRÉ-LANÇAMENTO</span>
                )}
              </div>
              <Flower2 className="line-flower" strokeWidth={0.7} />
              <h3>
                {title} <ArrowRight size={19} />
              </h3>
              <p>{text}</p>
            </Link>
          ))}
        </div>
      </section>
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
function Notice({ loading, error }: { loading: boolean; error: string }) {
  return error ? (
    <p role="alert" className="notice">
      {error}
    </p>
  ) : loading ? (
    <p role="status" className="muted">
      Carregando do banco…
    </p>
  ) : null;
}
function PieceArt({ product }: { product: Product }) {
  return (
    <div className="piece-art">
      {product.imageUrl ? (
        <img src={product.imageUrl} alt={product.name} />
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
function Shop() {
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
function ProductPage() {
  const { id } = useParams();
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
          <PieceArt product={product} />
          <div>
            <div className="eyebrow">UM ENCONTRO COM A NATUREZA</div>
            <h1>{product.name}</h1>
            <p className="price">{money(product.priceCents)}</p>
            <p className="description">{product.description}</p>
            <p>
              {availability[product.availability]} · {product.stock} unidade(s)
            </p>
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
            {!!items[product.id] && (
              <p role="status">
                {items[product.id]} na sacola.{" "}
                <Link to="/carrinho">Ver carrinho →</Link>
              </p>
            )}
            <p className="muted">
              Materiais, medidas e cuidados serão informados em cada cadastro
              real.
            </p>
          </div>
        </div>
      ) : (
        !products.loading && !products.error && <h1>Peça não encontrada</h1>
      )}
    </div>
  );
}
function ContentPage({
  name,
  title,
  subtitle,
}: {
  name: string;
  title: string;
  subtitle: string;
}) {
  const records = useRecords<Content>(name);
  return (
    <div className="page">
      <div className="eyebrow">UNIVERSO HOSKEN BIOJOIAS</div>
      <h1>{title}</h1>
      <p className="lead">{subtitle}</p>
      <Notice {...records} />
      <div className="content-grid">
        {records.data.map((r) => (
          <article className="content-card" key={r.id}>
            <Flower2 size={28} />
            <h2>{r.title}</h2>
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
function About() {
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
function Account() {
  const session = useContext(SessionContext);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await signInWithEmailAndPassword(
        auth,
        String(f.get("email")),
        String(f.get("password")),
      );
    } catch {
      setError(
        "Não foi possível entrar. Confira os dados e se a autenticação está disponível.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function register(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const displayName = String(form.get("displayName")).trim();
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        String(form.get("email")),
        String(form.get("password")),
      );
      await updateProfile(credential.user, { displayName });
      await setDoc(doc(db, "users", credential.user.uid), { displayName });
    } catch (cause) {
      const code = (cause as { code?: string }).code;
      setError(
        code === "auth/email-already-in-use"
          ? "Já existe uma conta com esse e-mail. Entre ou use outro endereço."
          : code === "auth/weak-password"
            ? "Escolha uma senha com pelo menos 6 caracteres."
            : "Não foi possível criar a conta. Confira seus dados e tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page narrow">
      <div className="eyebrow">SEU ESPAÇO NA HOSKEN BIOJOIAS</div>
      <h1>Minha conta</h1>
      {!session.ready ? (
        <p>Carregando sessão…</p>
      ) : session.user ? (
        <>
          <p>Você entrou como {session.user.email}.</p>
          {session.admin && (
            <Link className="button" to="/admin">
              Abrir administração <ArrowRight size={18} />
            </Link>
          )}
          <p className="muted">
            Consulte os pedidos e acompanhe cada atualização na sua conta.
          </p>
          <Link className="button secondary" to="/pedidos">
            Meus pedidos <ArrowRight size={18} />
          </Link>
          {!session.admin && (
            <Link className="button secondary account-chat-link" to="/chat">
              <MessageCircle size={18} /> Falar com o ateliê
            </Link>
          )}
        </>
      ) : (
        <>
          <p>
            {mode === "login"
              ? "Entre para acessar sua conta."
              : "Crie uma conta para acompanhar seus pedidos."}
          </p>
          <form onSubmit={mode === "login" ? login : register}>
            {mode === "register" && (
              <label>
                Nome
                <input
                  name="displayName"
                  type="text"
                  autoComplete="name"
                  maxLength={100}
                  required
                />
              </label>
            )}
            <label>
              E-mail
              <input
                name="email"
                type="email"
                autoComplete="username"
                maxLength={254}
                required
              />
            </label>
            <label>
              Senha
              <input
                name="password"
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={6}
                required
              />
            </label>
            {error && (
              <p className="notice" role="alert">
                {error}
              </p>
            )}
            <button className="button" disabled={busy}>
              {busy
                ? mode === "login"
                  ? "Entrando…"
                  : "Criando conta…"
                : mode === "login"
                  ? "Entrar"
                  : "Criar conta"}
            </button>
          </form>
          <p>
            {mode === "login"
              ? "Ainda não tem uma conta?"
              : "Já tem uma conta?"}{" "}
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
            >
              {mode === "login" ? "Criar conta" : "Entrar"}
            </button>
          </p>
          {localMode && (
            <aside className="notice">
              Depois de iniciar o banco, execute <code>npm run db:seed</code>.
              <br />
              Conta de teste: <strong>admin@hosken.local</strong>
              <br />
              Senha local: <strong>HoskenLocal2026!</strong>
            </aside>
          )}
        </>
      )}
    </div>
  );
}
const orderStatusLabels: Record<string, string> = {
  pending_payment: "Aguardando pagamento",
  confirmed: "Pagamento confirmado",
  preparing: "Em preparação",
  in_transit: "A caminho",
  completed: "Concluído",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};
const orderStatusOptions = Object.keys(orderStatusLabels);
function OrdersPage() {
  const session = useContext(SessionContext);
  const orders = useCustomerOrders(session.user?.uid);
  if (!session.ready) {
    return <div className="page">Carregando sua conta…</div>;
  }
  if (!session.user) {
    return (
      <div className="page narrow">
        <div className="eyebrow">SEU ESPAÇO NA HOSKEN BIOJOIAS</div>
        <h1>Meus pedidos</h1>
        <p className="lead">
          Entre na sua conta para ver o histórico de pedidos.
        </p>
        <Link className="button" to="/conta">
          Entrar ou criar conta <ArrowRight size={18} />
        </Link>
      </div>
    );
  }
  return (
    <div className="page">
      <div className="eyebrow">ACOMPANHE SUAS ESCOLHAS</div>
      <h1>Meus pedidos</h1>
      <p className="lead">
        Você pode acompanhar o andamento de cada pedido por aqui.
      </p>
      {orders.loading && <p role="status">Carregando pedidos…</p>}
      {orders.error && (
        <p className="notice" role="alert">
          {orders.error}
        </p>
      )}
      {!orders.loading && !orders.error && orders.data.length === 0 && (
        <div className="empty">
          <ShoppingBag />
          <h2>Você ainda não tem pedidos.</h2>
          <p>
            As compras online estão sendo preparadas. Quando o checkout estiver
            ativo, seus pedidos aparecerão aqui.
          </p>
          <Link className="button secondary" to="/loja">
            Continuar explorando <ArrowRight size={18} />
          </Link>
        </div>
      )}
      <div className="order-list">
        {orders.data.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  );
}
function OrderCard({ order }: { order: CustomerOrder }) {
  const status = orderStatusLabels[order.status] || "Em atualização";
  const createdAt = order.createdAt?.toDate();
  return (
    <article className="order-card">
      <header className="order-card-header">
        <div>
          <small>Pedido</small>
          <h2>{order.orderNumber || order.id.slice(-8).toUpperCase()}</h2>
          <small>
            {createdAt
              ? new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "long",
                }).format(createdAt)
              : "Data indisponível"}
          </small>
        </div>
        <div className="order-status-group">
          {order.isDemo && <span className="tag">PEDIDO DE EXEMPLO</span>}
          <span
            className={`order-status status-${order.status.replace(/[^a-z0-9_-]/gi, "")}`}
          >
            {status}
          </span>
        </div>
      </header>
      <ul className="order-items">
        {order.items.map((item, index) => (
          <li key={`${order.id}-${item.productId}-${index}`}>
            <span>
              {item.name} <small>× {item.quantity}</small>
            </span>
            <strong>{money(item.unitPriceCents * item.quantity)}</strong>
          </li>
        ))}
      </ul>
      {order.trackingCode && (
        <p className="order-tracking">
          Código de rastreio: <strong>{order.trackingCode}</strong>
        </p>
      )}
      <div className="order-total">
        <span>Total do pedido</span>
        <strong>{money(order.totalCents)}</strong>
      </div>
      {order.isDemo && (
        <p className="demo-note">
          Exemplo fictício para visualizar o histórico.
        </p>
      )}
    </article>
  );
}
function CustomerChat() {
  const session = useContext(SessionContext);
  const chat = useCustomerConversation(session.user?.uid);
  const [message, setMessage] = useState("");
  const attemptedUsers = useRef(new Set<string>());
  useEffect(() => {
    const user = session.user;
    if (
      !session.ready ||
      !user ||
      session.admin ||
      chat.loading ||
      chat.error ||
      chat.conversation ||
      attemptedUsers.current.has(user.uid)
    )
      return;
    attemptedUsers.current.add(user.uid);
    createCustomerConversation(
      user.uid,
      user.displayName || "Cliente",
      user.email || "",
    ).catch(() => {
      setMessage("Não foi possível abrir o chat. Recarregue a página para tentar novamente.");
    });
  }, [session.ready, session.user, session.admin, chat.loading, chat.error, chat.conversation]);
  if (!session.ready) return <div className="page">Carregando sua conta…</div>;
  if (!session.user)
    return (
      <div className="page narrow">
        <div className="eyebrow">ATENDIMENTO HOSKEN BIOJOIAS</div>
        <h1>Fale com o ateliê</h1>
        <p className="lead">Entre na sua conta para iniciar uma conversa.</p>
        <Link className="button" to="/conta">
          Entrar ou criar conta <ArrowRight size={18} />
        </Link>
      </div>
    );
  if (session.admin)
    return (
      <div className="page narrow">
        <div className="eyebrow">ATENDIMENTO HOSKEN BIOJOIAS</div>
        <h1>Caixa de atendimento</h1>
        <p className="lead">Acesse as conversas pelo painel administrativo.</p>
        <Link className="button" to="/admin">
          Abrir administração <ArrowRight size={18} />
        </Link>
      </div>
    );
  return (
    <div className="page chat-page">
      <div className="eyebrow">ATENDIMENTO HOSKEN BIOJOIAS</div>
      <h1>Fale com o ateliê</h1>
      <p className="lead">
        Envie sua mensagem. Nossa equipe responderá por aqui.
      </p>
      {chat.loading && <p role="status">Carregando conversa…</p>}
      {chat.error && (
        <p className="notice" role="alert">
          {chat.error}
        </p>
      )}
      {!chat.loading && !chat.error && !chat.conversation && (
        <section className="chat-start" role="status">
          <MessageCircle size={28} />
          <h2>Abrindo sua conversa…</h2>
          <p>Estamos preparando o atendimento com a Hosken Biojoias.</p>
          {message && <p className="notice" role="alert">{message}</p>}
        </section>
      )}
      {chat.conversation && (
        <ChatThread
          conversation={chat.conversation}
          senderId={session.user.uid}
          senderRole="customer"
          otherPartyName="Hosken Biojoias"
        />
      )}
    </div>
  );
}
function ChatThread({
  conversation,
  senderId,
  senderRole,
  otherPartyName,
}: {
  conversation: ChatConversation;
  senderId: string;
  senderRole: ChatMessage["senderRole"];
  otherPartyName: string;
}) {
  const conversationId = conversation.id;
  const unreadCount = senderRole === "admin"
    ? conversation.unreadForAdmin
    : conversation.unreadForCustomer;
  const messages = useConversationMessages(conversationId);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState("");
  const [now, setNow] = useState(Date.now());
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.data.length]);
  useEffect(() => {
    if (unreadCount > 0) {
      markConversationRead(conversationId, senderRole).catch(() =>
        setSendError("Não foi possível atualizar as mensagens lidas."),
      );
    }
  }, [conversationId, senderRole, unreadCount]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setSendError("");
    try {
      await sendChatMessage(conversationId, senderId, senderRole, text);
      setText("");
    } catch (cause) {
      const code =
        typeof cause === "object" && cause !== null && "code" in cause
          ? String(cause.code)
          : "erro desconhecido";
      const currentUser = auth.currentUser;
      let adminClaim = "indisponível";
      try {
        adminClaim = (await currentUser?.getIdTokenResult())?.claims.admin === true
          ? "sim"
          : "não";
      } catch {
        /* A falha original continua sendo exibida abaixo. */
      }
      const matchesAuth = currentUser?.uid === senderId;
      const matchesConversationPath = conversation.id === senderId;
      const matchesConversationOwner = conversation.customerId === senderId;
      const validUnreadCounters =
        Number.isInteger(conversation.unreadForAdmin) &&
        Number.isInteger(conversation.unreadForCustomer);
      if (import.meta.env.DEV) {
        console.error("Chat message send failed", {
          code,
          matchesAuth,
          matchesConversationPath,
          matchesConversationOwner,
          validUnreadCounters,
          unreadForAdmin: conversation.unreadForAdmin,
          unreadForCustomer: conversation.unreadForCustomer,
          senderRole,
          messageLength: text.trim().length,
          adminClaim,
          projectId: auth.app.options.projectId,
        });
      }
      setSendError(
        localMode
          ? `Não foi possível enviar (${code}). Diagnóstico: conta ${matchesAuth ? "ok" : "divergente"}, caminho ${matchesConversationPath ? "ok" : "divergente"}, cliente da conversa ${matchesConversationOwner ? "ok" : "divergente"}, não lidas equipe/cliente ${conversation.unreadForAdmin}/${conversation.unreadForCustomer}, papel ${senderRole}, ${text.trim().length} caracteres, claim admin ${adminClaim}, projeto ${auth.app.options.projectId}.`
          : "Não foi possível enviar a mensagem. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="chat-thread" aria-label={`Conversa com ${otherPartyName}`}>
      <header className="chat-thread-header">
        <span className="chat-avatar"><MessageCircle size={20} /></span>
        <div>
          <strong>{otherPartyName}</strong>
          <small>Atendimento Hosken Biojoias</small>
        </div>
      </header>
      <div className="chat-messages" ref={listRef} aria-live="polite">
        {messages.loading && <p className="muted">Carregando mensagens…</p>}
        {messages.error && <p className="notice" role="alert">{messages.error}</p>}
        {!messages.loading && !messages.error && messages.data.length === 0 && (
          <p className="chat-empty">Envie uma mensagem para começar.</p>
        )}
        {messages.data.map((item, index) => (
          <ChatMessageBubble
            key={item.id}
            conversation={conversation}
            message={item}
            own={item.senderId === senderId}
            isLatest={item.id === conversation.lastMessageId}
            previousMessage={messages.data[index - 1]}
            now={now}
          />
        ))}
      </div>
      <form className="chat-composer" onSubmit={submit}>
        <label className="sr-only" htmlFor={`message-${conversationId}`}>
          Escreva sua mensagem
        </label>
        <textarea
          id={`message-${conversationId}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          rows={2}
          placeholder="Escreva sua mensagem…"
        />
        <button className="button" disabled={busy || !text.trim()} aria-label="Enviar mensagem">
          <span>{busy ? "Enviando…" : "Enviar"}</span>
          <Send size={17} />
        </button>
      </form>
      {sendError && <p className="notice" role="alert">{sendError}</p>}
    </section>
  );
}
function ChatMessageBubble({
  conversation,
  message,
  own,
  isLatest,
  previousMessage,
  now,
}: {
  conversation: ChatConversation;
  message: ChatMessage;
  own: boolean;
  isLatest: boolean;
  previousMessage?: ChatMessage;
  now: number;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const date = message.createdAt?.toDate();
  const withinEditWindow = Boolean(
    date && now >= date.getTime() && now - date.getTime() < 60 * 60 * 1000,
  );
  async function saveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await editChatMessage(conversation.id, message, editText, isLatest);
      setEditing(false);
    } catch {
      setError("Não foi possível editar. O prazo pode ter expirado.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!window.confirm("Excluir esta mensagem? A conversa continuará salva."))
      return;
    setBusy(true);
    setError("");
    try {
      await deleteChatMessage(
        conversation,
        message,
        isLatest ? previousMessage : undefined,
      );
    } catch {
      setError("Não foi possível excluir. O prazo pode ter expirado.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className={`chat-message ${own ? "own" : ""}`}>
      {editing ? (
        <form className="chat-edit-form" onSubmit={saveEdit}>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            maxLength={2000}
            autoFocus
            aria-label="Editar mensagem"
          />
          <div>
            <button className="text-button" type="button" onClick={() => setEditing(false)}>
              Cancelar
            </button>
            <button className="text-button" type="submit" disabled={busy || !editText.trim()}>
              Salvar
            </button>
          </div>
        </form>
      ) : (
        <p>{message.text}</p>
      )}
      <small>
        {own ? "Você" : message.senderRole === "admin" ? "Ateliê" : "Cliente"}
        {date && ` · ${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date)}`}
        {message.editedAt && " · editada"}
      </small>
      {!editing && withinEditWindow && own && (
        <div className="chat-message-actions">
          <button type="button" onClick={() => { setEditText(message.text); setEditing(true); }} disabled={busy}>
            Editar
          </button>
          <button type="button" onClick={remove} disabled={busy}>
            Excluir
          </button>
        </div>
      )}
      {error && <span className="chat-message-error" role="alert">{error}</span>}
    </article>
  );
}
function Cart() {
  const { items, change } = useContext(BasketContext);
  const products = useRecords<Product>("products");
  const entries = Object.entries(items);
  const total = entries.reduce(
    (sum, [id, q]) =>
      sum + (products.data.find((p) => p.id === id)?.priceCents || 0) * q,
    0,
  );
  return (
    <div className="page">
      <div className="eyebrow">ESCOLHIDAS POR VOCÊ</div>
      <h1>Sua sacola</h1>
      <Notice {...products} />
      {!entries.length ? (
        <div className="empty">
          <ShoppingBag />
          <h2>Uma nova história começa com uma flor.</h2>
          <Link className="button" to="/loja">
            Explorar as peças <ArrowRight size={18} />
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div>
            {entries.map(([id, q]) => {
              const p = products.data.find((p) => p.id === id);
              return (
                <article className="cart-row" key={id}>
                  <div>
                    <h3>{p?.name || "Peça indisponível"}</h3>
                    <p>{p ? money(p.priceCents) : "—"}</p>
                    {p && (q > p.stock || p.availability !== "available") && (
                      <p role="alert" className="notice">
                        Disponibilidade alterada. Ajuste ou remova este item.
                      </p>
                    )}
                  </div>
                  <div className="quantity">
                    <button
                      className="icon"
                      aria-label="Diminuir quantidade"
                      onClick={() => change(id, -1)}
                    >
                      <Minus size={16} />
                    </button>
                    <span>{q}</span>
                    <button
                      className="icon"
                      aria-label="Aumentar quantidade"
                      disabled={
                        !p || p.availability !== "available" || q >= p.stock
                      }
                      onClick={() => change(id, 1)}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => change(id, -q)}
                  >
                    Remover
                  </button>
                </article>
              );
            })}
          </div>
          <aside className="cart-summary">
            <h2>Resumo</h2>
            <p>
              Subtotal <strong>{money(total)}</strong>
            </p>
            <p className="muted">Frete ainda não calculado.</p>
            <button className="button" disabled>
              Checkout em preparação
            </button>
            <p className="muted">
              Nenhuma cobrança será realizada. A integração de pagamento será a
              próxima etapa.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
function Admin() {
  const session = useContext(SessionContext);
  if (!session.ready) return <div className="page">Verificando acesso…</div>;
  if (!session.user)
    return (
      <div className="page">
        <h1>Acesso administrativo</h1>
        <p>Entre com a conta autorizada para continuar.</p>
        <Link className="button" to="/conta">
          Entrar
        </Link>
      </div>
    );
  if (!session.admin)
    return (
      <div className="page">
        <h1>Acesso restrito</h1>
        <p>Sua conta não tem permissão para administrar a loja.</p>
      </div>
    );
  return <AdminPanel />;
}
const blankProduct = {
  name: "",
  description: "",
  priceCents: 0,
  stock: 0,
  categoryId: "",
  collectionId: "",
  status: "draft",
  availability: "available",
  imageUrl: "",
};
function AdminPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const validTabs = [
    "orders",
    "chat",
    "products",
    "categories",
    "collections",
    "news",
    "events",
    "partnerStores",
  ];
  const requestedTab = searchParams.get("tab");
  const tab = requestedTab && validTabs.includes(requestedTab) ? requestedTab : "orders";
  const conversations = useAdminConversations();
  const adminOrders = useAdminOrders();
  const unreadCount = conversations.data.reduce(
    (sum, conversation) => sum + (conversation.unreadForAdmin || 0),
    0,
  );
  const products = useRecords<Product>("products", true);
  const cats = useRecords<Taxonomy>("categories", true);
  const lines = useRecords<Taxonomy>("collections", true);
  const content = useRecords<Content>(
    ["news", "events", "partnerStores"].includes(tab) ? tab : "news",
    true,
  );
  const [editing, setEditing] = useState("");
  const [product, setProduct] = useState(blankProduct);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    document.title = unreadCount
      ? `(${unreadCount}) Atendimento · Hosken Biojoias`
      : "Administração · Hosken Biojoias";
    const appNavigator = navigator as Navigator & {
      setAppBadge?: (contents?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (unreadCount > 0) {
      appNavigator.setAppBadge?.(unreadCount).catch(() => {});
    } else {
      appNavigator.clearAppBadge?.().catch(() => {});
    }
    return () => {
      document.title = "Hosken Biojoias";
    };
  }, [unreadCount]);
  const tabs = [
    ["orders", "Pedidos"],
    ["chat", "Atendimento"],
    ["products", "Produtos"],
    ["categories", "Tipos de peça"],
    ["collections", "Linhas"],
    ["news", "Novidades"],
    ["events", "Eventos"],
    ["partnerStores", "Lojas parceiras"],
  ];
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      if (tab === "products") {
        if (
          !Number.isSafeInteger(product.priceCents) ||
          product.priceCents < 0 ||
          !Number.isSafeInteger(product.stock) ||
          product.stock < 0
        )
          throw new Error("invalid");
        if (editing) await updateDoc(doc(db, "products", editing), product);
        else await addDoc(collection(db, "products"), product);
        setProduct(blankProduct);
        setEditing("");
      } else {
        const name = String(f.get("name")).trim();
        const payload = ["categories", "collections"].includes(tab)
          ? {
              name,
              slug: name
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, ""),
              status: String(f.get("status")),
            }
          : {
              title: name,
              body: String(f.get("body")).trim(),
              status: String(f.get("status")),
            };
        await addDoc(collection(db, tab), payload);
        form.reset();
      }
      setMessage("Cadastro salvo no banco.");
    } catch {
      setMessage(
        "Não foi possível salvar. Confira os campos, sua permissão e a conexão com o banco.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function toggleProduct(p: Product) {
    try {
      await updateDoc(doc(db, "products", p.id), {
        status: p.status === "published" ? "draft" : "published",
      });
      setMessage("Visibilidade atualizada.");
    } catch {
      setMessage("Não foi possível alterar a visibilidade.");
    }
  }
  async function remove(id: string) {
    if (
      !window.confirm(
        "Excluir este cadastro? Para produtos com histórico, prefira ocultar.",
      )
    )
      return;
    try {
      await deleteDoc(doc(db, tab, id));
      setMessage("Cadastro excluído.");
    } catch {
      setMessage("Não foi possível excluir.");
    }
  }
  const records =
    tab === "products"
      ? products
      : tab === "categories"
        ? cats
        : tab === "collections"
          ? lines
          : content;
  return (
    <div className="page">
      <div className="eyebrow">ÁREA RESTRITA</div>
      <h1>Cuidar do ateliê</h1>
      <p className="lead">
        Cadastros conectados ao {localMode ? "Firestore local" : "Firestore"} em
        tempo real.
      </p>
      <div className="tabs">
        {tabs.map(([id, label]) => (
          <button
            className={tab === id ? "selected" : ""}
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.set("tab", id);
              if (id !== "chat") next.delete("conversation");
              if (id !== "orders") next.delete("order");
              setSearchParams(next);
              setEditing("");
              setProduct(blankProduct);
              setMessage("");
            }}
            key={id}
          >
            {label}
            {id === "chat" && unreadCount > 0 && (
              <span className="unread-badge" aria-label={`${unreadCount} mensagens não lidas`}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>
      {tab === "orders" ? (
        <AdminOrders
          orders={adminOrders}
          focusOrderId={searchParams.get("order") || ""}
        />
      ) : tab === "chat" ? (
        <AdminChatInbox
          conversations={conversations.data}
          loading={conversations.loading}
          error={conversations.error}
          unreadCount={unreadCount}
          adminId={auth.currentUser?.uid || ""}
          selectedConversationId={searchParams.get("conversation") || ""}
          onSelectConversation={(id) => {
            const next = new URLSearchParams(searchParams);
            next.set("tab", "chat");
            next.set("conversation", id);
            next.delete("order");
            setSearchParams(next);
            markAdminNotificationSeen(ADMIN_SEEN_CONVERSATIONS, id);
          }}
        />
      ) : (
        <div className="admin-layout">
          <form key={tab} className="admin-form" onSubmit={save}>
            <h2>{editing ? "Editar peça" : "Novo cadastro"}</h2>
            {tab === "products" ? (
              <>
                <label>
                  Nome
                  <input
                    required
                    maxLength={120}
                    value={product.name}
                    onChange={(e) =>
                      setProduct({ ...product, name: e.target.value })
                    }
                  />
                </label>
                <label>
                  Descrição
                  <textarea
                    required
                    maxLength={3000}
                    value={product.description}
                    onChange={(e) =>
                      setProduct({ ...product, description: e.target.value })
                    }
                  />
                </label>
                <div className="form-pair">
                  <label>
                    Preço (R$)
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={product.priceCents / 100}
                      onChange={(e) =>
                        setProduct({
                          ...product,
                          priceCents: Math.round(Number(e.target.value) * 100),
                        })
                      }
                    />
                  </label>
                  <label>
                    Estoque
                    <input
                      required
                      type="number"
                      min="0"
                      step="1"
                      value={product.stock}
                      onChange={(e) =>
                        setProduct({
                          ...product,
                          stock: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>
                <label>
                  Linha
                  <select
                    required
                    value={product.collectionId}
                    onChange={(e) =>
                      setProduct({ ...product, collectionId: e.target.value })
                    }
                  >
                    <option value="">Selecione</option>
                    {lines.data.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Tipo de peça
                  <select
                    required
                    value={product.categoryId}
                    onChange={(e) =>
                      setProduct({ ...product, categoryId: e.target.value })
                    }
                  >
                    <option value="">Selecione</option>
                    {cats.data.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Disponibilidade
                  <select
                    value={product.availability}
                    onChange={(e) =>
                      setProduct({ ...product, availability: e.target.value })
                    }
                  >
                    {Object.entries(availability).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  URL da foto (opcional)
                  <input
                    type="url"
                    maxLength={2000}
                    value={product.imageUrl}
                    onChange={(e) =>
                      setProduct({ ...product, imageUrl: e.target.value })
                    }
                    placeholder="https://…"
                  />
                </label>
                <label>
                  Publicação
                  <select
                    value={product.status}
                    onChange={(e) =>
                      setProduct({ ...product, status: e.target.value })
                    }
                  >
                    <option value="draft">Rascunho</option>
                    <option value="published">Publicado</option>
                  </select>
                </label>
              </>
            ) : (
              <>
                <label>
                  {["categories", "collections"].includes(tab)
                    ? "Nome"
                    : "Título"}
                  <input
                    name="name"
                    required
                    maxLength={
                      ["categories", "collections"].includes(tab) ? 80 : 160
                    }
                  />
                </label>
                {!["categories", "collections"].includes(tab) && (
                  <label>
                    Texto
                    <textarea name="body" required maxLength={5000} />
                  </label>
                )}
                <label>
                  Publicação
                  <select name="status">
                    <option value="draft">Rascunho</option>
                    <option value="published">Publicado</option>
                  </select>
                </label>
              </>
            )}
            <button className="button" disabled={busy}>
              {busy ? "Salvando…" : "Salvar cadastro"} <Plus size={17} />
            </button>
            {editing && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setEditing("");
                  setProduct(blankProduct);
                }}
              >
                Cancelar edição
              </button>
            )}
            {message && (
              <p role="status" className="notice">
                {message}
              </p>
            )}
          </form>
          <section>
            <h2>Cadastros existentes</h2>
            <Notice {...records} />
            {records.data.map((r) => (
              <article className="admin-row" key={r.id}>
                <div>
                  <strong>{"name" in r ? r.name : r.title}</strong>
                  <small>
                    {r.status === "published" ? "Publicado" : "Rascunho"}
                    {"stock" in r ? ` · Estoque: ${r.stock}` : ""}
                  </small>
                </div>
                <div>
                  {tab === "products" && (
                    <>
                      <button
                        className="text-button"
                        onClick={() => {
                          const p = r as Product;
                          const { id, ...data } = p;
                          setProduct(data);
                          setEditing(id);
                          setMessage("");
                        }}
                      >
                        Editar
                      </button>
                      <button
                        className="text-button"
                        onClick={() => toggleProduct(r as Product)}
                      >
                        {r.status === "published" ? "Ocultar" : "Publicar"}
                      </button>
                    </>
                  )}
                  <button className="text-button" onClick={() => remove(r.id)}>
                    Excluir
                  </button>
                </div>
              </article>
            ))}
            {!records.loading && !records.data.length && (
              <p className="muted">Nenhum cadastro ainda.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

const ADMIN_SEEN_ORDERS = "hosken-admin-seen-orders";
const ADMIN_SEEN_CONVERSATIONS = "hosken-admin-seen-conversations";
const ADMIN_NOTIFICATIONS_EVENT = "hosken-admin-notifications-updated";
function readAdminSeenIds(key: string) {
  try {
    const values = JSON.parse(localStorage.getItem(key) || "[]");
    return new Set<string>(Array.isArray(values) ? values : []);
  } catch {
    return new Set<string>();
  }
}
function markAdminNotificationSeen(key: string, id: string) {
  try {
    const values = readAdminSeenIds(key);
    values.add(id);
    localStorage.setItem(key, JSON.stringify([...values]));
    window.dispatchEvent(new Event(ADMIN_NOTIFICATIONS_EVENT));
  } catch {
    /* O aviso segue funcionando durante esta sessão. */
  }
}
function AdminNotificationBell({
  orders,
  conversations,
}: {
  orders: CustomerOrder[];
  conversations: ChatConversation[];
}) {
  const [open, setOpen] = useState(false);
  const [seenOrders, setSeenOrders] = useState(() => readAdminSeenIds(ADMIN_SEEN_ORDERS));
  const [seenConversations, setSeenConversations] = useState(() =>
    readAdminSeenIds(ADMIN_SEEN_CONVERSATIONS),
  );
  useEffect(() => {
    const syncSeen = () => {
      setSeenOrders(readAdminSeenIds(ADMIN_SEEN_ORDERS));
      setSeenConversations(readAdminSeenIds(ADMIN_SEEN_CONVERSATIONS));
    };
    window.addEventListener(ADMIN_NOTIFICATIONS_EVENT, syncSeen);
    window.addEventListener("storage", syncSeen);
    return () => {
      window.removeEventListener(ADMIN_NOTIFICATIONS_EVENT, syncSeen);
      window.removeEventListener("storage", syncSeen);
    };
  }, []);
  const newOrders = orders.filter(
    (order) => !order.isDemo && !seenOrders.has(order.id),
  );
  const newConversations = conversations.filter(
    (conversation) =>
      conversation.unreadForAdmin > 0 || !seenConversations.has(conversation.id),
  );
  const count =
    newOrders.length +
    newConversations.reduce(
      (total, conversation) =>
        total + (conversation.unreadForAdmin || 1),
      0,
    );
  return (
    <div className="notification-bell">
      <button
        type="button"
        className="notification-bell-button"
        aria-label={count ? `${count} notificações não lidas` : "Notificações"}
        aria-expanded={open}
        aria-controls="admin-notification-panel"
        onClick={() => setOpen((current) => !current)}
      >
        <Bell size={21} />
        {count > 0 && <span className="unread-badge">{count > 99 ? "99+" : count}</span>}
      </button>
      {open && (
        <section className="notification-panel" id="admin-notification-panel">
          <header>
            <strong>Notificações</strong>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar notificações">
              <X size={17} />
            </button>
          </header>
          {!newOrders.length && !newConversations.length ? (
            <p className="notification-empty">Tudo em dia por aqui.</p>
          ) : (
            <div className="notification-list">
              {newOrders.map((order) => (
                <Link
                  key={`order-${order.id}`}
                  to={`/admin?tab=orders&order=${encodeURIComponent(order.id)}`}
                  onClick={() => {
                    markAdminNotificationSeen(ADMIN_SEEN_ORDERS, order.id);
                    setOpen(false);
                  }}
                >
                  <span className="notification-icon"><ShoppingBag size={17} /></span>
                  <span>
                    <strong>Novo pedido {order.orderNumber || order.id.slice(-8).toUpperCase()}</strong>
                    <small>{order.customerName || order.customerEmail || "Cliente"}</small>
                  </span>
                </Link>
              ))}
              {newConversations.map((conversation) => (
                <Link
                  key={`conversation-${conversation.id}`}
                  to={`/admin?tab=chat&conversation=${encodeURIComponent(conversation.id)}`}
                  onClick={() => {
                    markAdminNotificationSeen(ADMIN_SEEN_CONVERSATIONS, conversation.id);
                    setOpen(false);
                  }}
                >
                  <span className="notification-icon"><MessageCircle size={17} /></span>
                  <span>
                    <strong>
                      {conversation.unreadForAdmin > 0
                        ? `${conversation.unreadForAdmin} nova${conversation.unreadForAdmin === 1 ? "" : "s"} mensagem${conversation.unreadForAdmin === 1 ? "" : "ns"}`
                        : "Novo atendimento"}
                    </strong>
                    <small>{conversation.customerName || conversation.customerEmail || "Cliente"}</small>
                    <small className="notification-preview">
                      {conversation.lastMessage || "Conversa iniciada"}
                    </small>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
function AdminHeaderNotificationBell() {
  const conversations = useAdminConversations();
  const orders = useAdminOrders();
  return (
    <AdminNotificationBell
      orders={orders.data}
      conversations={conversations.data}
    />
  );
}

function AdminChatInbox({
  conversations,
  loading,
  error,
  unreadCount,
  adminId,
  selectedConversationId,
  onSelectConversation,
}: {
  conversations: ChatConversation[];
  loading: boolean;
  error: string;
  unreadCount: number;
  adminId: string;
  selectedConversationId: string;
  onSelectConversation: (id: string) => void;
}) {
  const selected =
    conversations.find((item) => item.id === selectedConversationId) ||
    conversations[0];
  return (
    <section className="admin-inbox">
      <div className="admin-inbox-heading">
        <div>
          <h2>Atendimentos</h2>
          <p className="muted">Mensagens atualizadas em tempo real.</p>
        </div>
        {unreadCount > 0 && <span className="unread-summary">{unreadCount} não lida{unreadCount === 1 ? "" : "s"}</span>}
      </div>
      {error && <p className="notice" role="alert">{error}</p>}
      {loading ? (
        <p role="status">Carregando atendimentos…</p>
      ) : conversations.length === 0 ? (
        <div className="empty">
          <MessageCircle />
          <h2>Nenhum atendimento ainda.</h2>
          <p>As conversas iniciadas pelos clientes aparecerão aqui.</p>
        </div>
      ) : (
        <div className="admin-inbox-layout">
          <nav className="conversation-list" aria-label="Lista de atendimentos">
            {conversations.map((conversation) => (
              <button
                type="button"
                key={conversation.id}
                className={`conversation-preview ${selected?.id === conversation.id ? "selected" : ""}`}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <span className="conversation-preview-top">
                  <strong>{conversation.customerName || "Cliente"}</strong>
                  {!!conversation.unreadForAdmin && (
                    <span className="unread-badge">{conversation.unreadForAdmin > 99 ? "99+" : conversation.unreadForAdmin}</span>
                  )}
                </span>
                <small>{conversation.customerEmail}</small>
                <span className="conversation-preview-last">
                  {conversation.lastMessage || "Conversa iniciada"}
                </span>
              </button>
            ))}
          </nav>
          {selected && (
            <ChatThread
              key={selected.id}
              conversation={selected}
              senderId={adminId}
              senderRole="admin"
              otherPartyName={selected.customerName || selected.customerEmail || "Cliente"}
            />
          )}
        </div>
      )}
    </section>
  );
}

function AdminOrders({
  orders,
  focusOrderId,
}: {
  orders: ReturnType<typeof useAdminOrders>;
  focusOrderId: string;
}) {
  useEffect(() => {
    if (!focusOrderId || orders.loading) return;
    const timer = window.setTimeout(() => {
      document
        .getElementById(`admin-order-${focusOrderId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [focusOrderId, orders.data.length, orders.loading]);
  return (
    <section className="admin-orders">
      <h2>Pedidos recebidos</h2>
      <p className="muted">
        Atualize o andamento e o rastreio. O status do pagamento e os valores
        não são alterados aqui.
      </p>
      <Notice {...orders} />
      {orders.data.map((order) => (
        <AdminOrderCard key={order.id} order={order} />
      ))}
      {!orders.loading && !orders.error && orders.data.length === 0 && (
        <p className="muted">Nenhum pedido cadastrado ainda.</p>
      )}
    </section>
  );
}

function AdminOrderCard({ order }: { order: CustomerOrder }) {
  const [status, setStatus] = useState(order.status);
  const [trackingCode, setTrackingCode] = useState(order.trackingCode || "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const createdAt = order.createdAt?.toDate();
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await updateDoc(doc(db, "orders", order.id), {
        status,
        trackingCode: trackingCode.trim(),
        updatedAt: serverTimestamp(),
      });
      setMessage("Status e rastreio atualizados.");
    } catch {
      setMessage("Não foi possível atualizar este pedido. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
      <article className="admin-order-card" id={`admin-order-${order.id}`}>
      <div className="admin-order-summary">
        <div>
          <strong>
            {order.orderNumber || order.id.slice(-8).toUpperCase()}
          </strong>
          {order.isDemo && <span className="tag">PEDIDO DE EXEMPLO</span>}
        </div>
        <p className="admin-customer">
          <strong>{order.customerName || "Cliente"}</strong>
          {order.customerEmail && <span>{order.customerEmail}</span>}
        </p>
        <small>
          {createdAt
            ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(
                createdAt,
              )
            : "Data indisponível"}
        </small>
        <ul className="order-items">
          {order.items.map((item, index) => (
            <li key={`${item.productId}-${index}`}>
              <span>
                {item.name} <small>× {item.quantity}</small>
              </span>
              <strong>{money(item.quantity * item.unitPriceCents)}</strong>
            </li>
          ))}
        </ul>
        <p className="order-total">
          <span>Total</span>
          <strong>{money(order.totalCents)}</strong>
        </p>
      </div>
      <form className="admin-order-form" onSubmit={save}>
        <label>
          Andamento
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {orderStatusOptions.map((value) => (
              <option key={value} value={value}>
                {orderStatusLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Código de rastreio
          <input
            value={trackingCode}
            maxLength={100}
            onChange={(e) => setTrackingCode(e.target.value)}
            placeholder="Opcional"
          />
        </label>
        <button className="button" disabled={busy}>
          {busy ? "Salvando…" : "Atualizar pedido"}
        </button>
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
      </form>
    </article>
  );
}

function Contact() {
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
