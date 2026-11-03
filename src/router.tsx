import { createContext, useContext, useEffect, useState } from "react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Decimal from "decimal.js";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Heart,
  Menu,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Trash2,
  UserRound,
  Wallet as WalletIcon,
} from "lucide-react";
import { api } from "./api";
import { Button, Field, Input, Modal, Skeleton } from "./ui";
import { eth, messageOf } from "./utils";
import type { Nft, User } from "./types";
import { useRealtime } from "./realtime";

type Session = {
  user: User | null;
  loading: boolean;
  signIn: (token: string) => void;
  signOut: () => Promise<void>;
};
const SessionContext = createContext<Session>({
  user: null,
  loading: false,
  signIn: () => {},
  signOut: async () => {},
});
const useSession = () => useContext(SessionContext);

function Layout() {
  const location = useLocation();
  const marketActive = ["/market", "/nft", "/cart", "/checkout", "/order"].some(
    (path) =>
      location.pathname === path || location.pathname.startsWith(`${path}/`),
  );
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => localStorage.getItem("kurio-token"));
  const [menuOpen, setMenuOpen] = useState(false);
  const session = useQuery({
    queryKey: ["session", token],
    queryFn: api.session,
    enabled: !!token,
    retry: false,
  });
  useRealtime(session.data?.id);
  useEffect(() => {
    if (session.isError && token) {
      localStorage.removeItem("kurio-token");
      setToken(null);
      queryClient.clear();
    }
  }, [session.isError, token, queryClient]);
  useEffect(() => {
    const expired = () => {
      setToken(null);
      queryClient.clear();
    };
    window.addEventListener("kurio-session-expired", expired);
    return () => window.removeEventListener("kurio-session-expired", expired);
  }, [queryClient]);
  const signIn = (next: string) => {
    localStorage.setItem("kurio-token", next);
    queryClient.clear();
    setToken(next);
  };
  const signOut = async () => {
    try {
      await api.logout();
    } finally {
      localStorage.removeItem("kurio-token");
      setToken(null);
      queryClient.clear();
    }
  };
  const cart = useQuery({
    queryKey: ["cart", session.data?.id || "guest"],
    queryFn: api.cart,
  });
  return (
    <SessionContext.Provider
      value={{
        user: session.data || null,
        loading: session.isPending && !!token,
        signIn,
        signOut,
      }}
    >
      <div className="site-shell">
        <header className="site-header">
          <Link to="/" className="logo">
            KURIO
          </Link>
          <nav
            className={menuOpen ? "main-nav open" : "main-nav"}
            aria-label="Navegação principal"
          >
            <Link
              to="/"
              className={!marketActive ? "active" : ""}
              onClick={() => setMenuOpen(false)}
            >
              Início
            </Link>
            <Link
              to="/market"
              className={marketActive ? "active" : ""}
              onClick={() => setMenuOpen(false)}
            >
              Mercado
            </Link>
            <span className="nav-label">Criadores</span>
            <span className="nav-label">Aprenda</span>
          </nav>
          <div className="header-actions">
            <Link
              to="/market"
              aria-label="Buscar no mercado"
              className="icon-link header-search"
            >
              <Search size={20} />
            </Link>
            <Link
              to="/cart"
              aria-label={`Carrinho, ${cart.data?.reduce((n, i) => n + i.quantity, 0) || 0} itens`}
              className="icon-link"
            >
              <ShoppingCart size={19} />
              <span className="cart-count">
                {cart.data?.reduce((n, i) => n + i.quantity, 0) || 0}
              </span>
            </Link>
            {session.data ? (
              <Link to="/profile" className="account-link">
                <UserRound size={18} />
                <span>{session.data.name.split(" ")[0]}</span>
              </Link>
            ) : (
              <Link to="/login" className="mini-primary">
                Entrar
              </Link>
            )}
            <button
              className="menu-button"
              aria-label="Abrir menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Menu />
            </button>
          </div>
        </header>
        <main id="conteudo">
          <Outlet />
        </main>
        <footer id="rodape" className="footer">
          <div className="footer-features">
            <div>
              <i>W</i>
              <h3>Segurança da carteira</h3>
              <p>
                Proteja sua carteira e colecione arte digital verificada com
                confiança.
              </p>
            </div>
            <div>
              <i>C</i>
              <h3>Criadores em destaque</h3>
              <p>
                Conheça artistas, estúdios e comunidades que moldam a cultura
                digital.
              </p>
            </div>
            <div>
              <i>D</i>
              <h3>Alertas de lançamentos</h3>
              <p>
                Receba calendários de cunhagem, novidades de listas de acesso e
                análises do mercado.
              </p>
            </div>
            <div>
              <h3>Antecipe-se ao próximo lançamento</h3>
              <div className="footer-newsletter">
                <input
                  aria-label="E-mail para lançamentos"
                  placeholder="digite seu e-mail..."
                  disabled
                />
                <button type="button" disabled>
                  Enviar
                </button>
              </div>
              <p>
                Receba lançamentos selecionados, histórias de criadores e
                novidades do mercado.
              </p>
            </div>
          </div>
          <div className="footer-contact">
            <strong>KURIO</strong>
            <span>
              Feito para colecionadores,
              <br /> criadores e cultura
            </span>
            <span>contato@email.com</span>
            <span>+55 11 4002 8922</span>
          </div>
          <div className="footer-links">
            <div>
              <h3>Meu perfil</h3>
              <Link to="/profile">Meu perfil</Link>
              <Link to="/wallets">Carteiras</Link>
              <span>Minha coleção</span>
              <span>Atividade</span>
            </div>
            <div>
              <h3>Central de ajuda</h3>
              <span>Como comprar NFTs</span>
              <span>Carteira e segurança</span>
              <span>Política do mercado</span>
            </div>
            <div>
              <h3>Coleções</h3>
              <Link to="/market" search={{ category: "Arte" }}>
                Arte digital
              </Link>
              <Link to="/market" search={{ category: "Colecionável" }}>
                Colecionáveis
              </Link>
            </div>
            <div>
              <h3>Redes sociais</h3>
              <span>f ◎ ♥ in ▶</span>
              <h3>Carteiras compatíveis</h3>
              <span>METAMASK · WALLETCONNECT · COINBASE</span>
            </div>
          </div>
          <small className="footer-copyright">
            © 2026 Kurio. Propriedade digital para todos.
          </small>
        </footer>
        {(location.pathname === "/" || location.pathname === "/market") && (
          <nav className="mobile-bottom-nav" aria-label="Navegação mobile">
            <Link to="/" aria-label="Início">
              ⌂
            </Link>
            <Link to="/favorites" aria-label="Favoritos">
              <Heart size={21} />
            </Link>
            <Link
              to="/market"
              aria-label="Mercado"
              className="mobile-market-action"
            >
              <Search size={23} />
            </Link>
            <Link to="/cart" aria-label="Carrinho">
              <ShoppingCart size={21} />
            </Link>
            <Link to={session.data ? "/profile" : "/login"} aria-label="Perfil">
              <UserRound size={21} />
            </Link>
          </nav>
        )}
      </div>
    </SessionContext.Provider>
  );
}

function Feedback({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div role="alert" className="feedback">
      <p>{messageOf(error)}</p>
      {retry && <Button onClick={retry}>Tentar novamente</Button>}
    </div>
  );
}
function NftCard({ nft }: { nft: Nft }) {
  return (
    <Link to="/nft/$id" params={{ id: nft.id }} className="nft-card">
      <img src={nft.image} alt={nft.name} loading="lazy" />
      <div className="nft-card-copy">
        <strong>{nft.name}</strong>
        <span>{eth(nft.priceEth)}</span>
      </div>
    </Link>
  );
}
function Home({ market = false }: { market?: boolean }) {
  const categoryOptions = [
    { label: "Arte digital", value: "Arte" },
    { label: "Fotografia", value: "Fotografia" },
    { label: "Música", value: "Música" },
    { label: "Arte 3D", value: "Arte 3D" },
    { label: "Colecionáveis", value: "Colecionável" },
  ];
  const routeSearch = useSearch({ strict: false }) as HomeSearch;
  const search = {
    search: routeSearch.search || "",
    category: routeSearch.category || "",
    sort: routeSearch.sort || "featured",
    page: routeSearch.page || 1,
    min: routeSearch.min || "",
    max: routeSearch.max || "",
    network: routeSearch.network || "",
  };
  const navigate = useNavigate();
  const [input, setInput] = useState(search.search);
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => setInput(search.search), [search.search]);
  const params = {
    search: search.search,
    category: search.category,
    sort: search.sort,
    page: search.page,
    min: search.min || undefined,
    max: search.max || undefined,
    network: search.network || undefined,
  };
  const nfts = useQuery({
    queryKey: ["nfts", params],
    queryFn: ({ signal }) => api.nfts(params, signal),
    placeholderData: (previous) => previous,
  });
  const update = (next: Partial<typeof search>) =>
    navigate({
      to: market ? "/market" : "/",
      search: (prev) => ({ ...prev, ...next, page: next.page ?? 1 }),
    });
  return (
    <>
      {!market && (
        <section className="hero">
          <div>
            <span className="eyebrow">BEM-VINDO À KURIO</span>
            <h1>
              SEJA DONO DO FUTURO
              <br />
              DA ARTE DIGITAL
            </h1>
            <p>
              Descubra NFTs selecionados de criadores emergentes e consagrados.
              Colecione arte digital rara, apoie artistas e tenha uma parte da
              cultura da internet.
            </p>
            <Link to="/market" className="hero-link">
              EXPLORAR
            </Link>
          </div>
          <img
            src="/images/emerald.png"
            alt="Emerald Ape, destaque da coleção"
          />
          <div className="hero-dots" aria-hidden="true">
            ● ● ●
          </div>
        </section>
      )}
      <section id="colecoes" className="catalog">
        {market && <h1 className="market-title">Mercado de NFTs</h1>}
        <div className="mobile-search-row">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              update({ search: input });
            }}
          >
            <Search size={18} />
            <Input
              aria-label="Buscar NFTs no mobile"
              placeholder="Explorar coleções"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </form>
          <Button
            aria-label="Abrir filtros"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal size={18} />
          </Button>
        </div>
        <div className="catalog-layout">
          <aside className="filters">
            <h3>Coleções</h3>
            <div className="category-links">
              <button
                className={!search.category ? "chosen" : ""}
                onClick={() => update({ category: "" })}
              >
                Todas as coleções
              </button>
              {categoryOptions.map((option) => (
                <button
                  key={option.value}
                  className={search.category === option.value ? "chosen" : ""}
                  onClick={() => update({ category: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <h3>Faixa de preço</h3>
            <label htmlFor="category" className="sr-only">
              Categoria
            </label>
            <select
              id="category"
              value={search.category}
              onChange={(e) => update({ category: e.target.value })}
            >
              <option value="">Todas</option>
              <option value="Arte">Arte</option>
              <option value="Colecionável">Colecionável</option>
              <option value="Fotografia">Fotografia</option>
              <option value="Música">Música</option>
              <option value="Arte 3D">Arte 3D</option>
            </select>
            <label htmlFor="min">Preço mínimo (ETH)</label>
            <Input
              id="min"
              type="number"
              min="0"
              step="0.01"
              value={search.min}
              onChange={(e) => update({ min: e.target.value })}
            />
            <label htmlFor="max">Preço máximo (ETH)</label>
            <Input
              id="max"
              type="number"
              min="0"
              step="0.01"
              value={search.max}
              onChange={(e) => update({ max: e.target.value })}
            />
            <Button
              variant="ghost"
              onClick={() =>
                navigate({
                  to: market ? "/market" : "/",
                  search: {
                    search: "",
                    category: "",
                    sort: "featured",
                    page: 1,
                    min: "",
                    max: "",
                    network: "",
                  },
                })
              }
            >
              Limpar filtros
            </Button>
            <h3>Rede</h3>
            <div className="category-links">
              <button
                className={!search.network ? "chosen" : ""}
                onClick={() => update({ network: "" })}
              >
                Todas
              </button>
              <button
                className={search.network === "Ethereum" ? "chosen" : ""}
                onClick={() => update({ network: "Ethereum" })}
              >
                Ethereum
              </button>
              <button
                className={search.network === "Polygon" ? "chosen" : ""}
                onClick={() => update({ network: "Polygon" })}
              >
                Polygon
              </button>
            </div>
          </aside>
          <div>
            <div
              className="market-tabs"
              role="group"
              aria-label="Seleção do catálogo"
            >
              <button
                className={search.sort === "featured" ? "selected" : ""}
                onClick={() => update({ sort: "featured" })}
              >
                Todos os NFTs
              </button>
              <button
                className={search.sort === "newest" ? "selected" : ""}
                onClick={() => update({ sort: "newest" })}
              >
                Novos lançamentos
              </button>
              <button
                className={search.sort === "popular" ? "selected" : ""}
                onClick={() => update({ sort: "popular" })}
              >
                Em alta
              </button>
            </div>
            <div className="catalog-toolbar">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  update({ search: input });
                }}
                className="search-box"
              >
                <Search size={18} />
                <Input
                  aria-label="Buscar NFTs"
                  placeholder="Explorar coleções"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button type="submit">Buscar</button>
              </form>
              <Button
                variant="outline"
                className="mobile-filter-button"
                aria-label="Abrir filtros"
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal size={18} />
              </Button>
              <select
                aria-label="Ordenar NFTs"
                value={search.sort}
                onChange={(e) => update({ sort: e.target.value })}
              >
                <option value="featured">Listados recentemente</option>
                <option value="newest">Novos lançamentos</option>
                <option value="popular">Em alta</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
                <option value="name">Nome</option>
              </select>
            </div>
            {nfts.isPending ? (
              <div className="nft-grid">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="card-skeleton" />
                ))}
              </div>
            ) : nfts.isError ? (
              <Feedback error={nfts.error} retry={() => void nfts.refetch()} />
            ) : nfts.data?.items.length ? (
              <>
                <div className="nft-grid">
                  {nfts.data.items.map((nft) => (
                    <NftCard key={nft.id} nft={nft} />
                  ))}
                </div>
                <div className="pagination">
                  <Button
                    variant="outline"
                    disabled={search.page <= 1}
                    onClick={() => update({ page: search.page - 1 })}
                  >
                    Anterior
                  </Button>
                  <span>
                    Página {search.page} de {nfts.data.pages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={search.page >= nfts.data.pages}
                    onClick={() => update({ page: search.page + 1 })}
                  >
                    Próxima
                  </Button>
                </div>
              </>
            ) : (
              <div className="empty">
                Nenhum NFT encontrado. Tente outro filtro.
              </div>
            )}
          </div>
        </div>
      </section>
      {!market && (
        <>
          <section className="home-extras">
            <div className="promo-card">
              <img src="/images/emerald.png" alt="Emerald Ape" />
              <div>
                <h2>Lançamentos gênesis de edição limitada</h2>
                <p>Colecione edições escassas diretamente dos criadores.</p>
                <Link to="/market">Explorar →</Link>
              </div>
            </div>
            <div className="promo-card">
              <img src="/images/ivory.png" alt="Ivory Baron" />
              <div>
                <h2>Arte digital selecionada e muito mais</h2>
                <p>Explore novos artistas e coleções verificadas.</p>
                <Link to="/market">Explorar →</Link>
              </div>
            </div>
          </section>
          <section className="home-blog">
            <h2>Diário da Cunhagem</h2>
            <p>
              Histórias, guias e insights para colecionadores sobre o universo
              da propriedade digital.
            </p>
            <div>
              {[
                {
                  image: "ivory",
                  title: "Como funciona a propriedade de NFTs",
                  copy: "Aprenda a colecionar, negociar e verificar ativos digitais.",
                },
                {
                  image: "emerald",
                  title: "10 artistas digitais para acompanhar",
                  copy: "Conheça criadores que moldam a cultura digital.",
                },
                {
                  image: "sage",
                  title: "Raridade, atributos e procedência",
                  copy: "Entenda raridade, procedência, direitos autorais e utilidade.",
                },
                {
                  image: "golden",
                  title: "Como proteger sua carteira",
                  copy: "Proteja sua carteira, seus ativos e sua identidade.",
                },
              ].map((article) => (
                <article key={article.title}>
                  <img src={`/images/${article.image}.png`} alt="" />
                  <div>
                    <h3>{article.title}</h3>
                    <p>{article.copy}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
      <Modal open={filtersOpen} onOpenChange={setFiltersOpen} title="Filtros">
        <div className="mobile-filter-fields">
          <Field label="Categoria" id="mobile-category">
            <select
              id="mobile-category"
              value={search.category}
              onChange={(e) => update({ category: e.target.value })}
            >
              <option value="">Todas</option>
              <option value="Arte">Arte</option>
              <option value="Colecionável">Colecionável</option>
              <option value="Fotografia">Fotografia</option>
              <option value="Música">Música</option>
              <option value="Arte 3D">Arte 3D</option>
            </select>
          </Field>
          <Field label="Rede" id="mobile-network">
            <select
              id="mobile-network"
              value={search.network}
              onChange={(e) => update({ network: e.target.value })}
            >
              <option value="">Todas</option>
              <option>Ethereum</option>
              <option>Polygon</option>
            </select>
          </Field>
          <Field label="Preço mínimo (ETH)" id="mobile-min">
            <Input
              id="mobile-min"
              type="number"
              min="0"
              step="0.01"
              value={search.min}
              onChange={(e) => update({ min: e.target.value })}
            />
          </Field>
          <Field label="Preço máximo (ETH)" id="mobile-max">
            <Input
              id="mobile-max"
              type="number"
              min="0"
              step="0.01"
              value={search.max}
              onChange={(e) => update({ max: e.target.value })}
            />
          </Field>
          <Button className="w-full" onClick={() => setFiltersOpen(false)}>
            Ver resultados
          </Button>
        </div>
      </Modal>
    </>
  );
}

function Detail() {
  const { id } = useParams({ from: "/nft/$id" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState("");
  const [imageView, setImageView] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const nft = useQuery({ queryKey: ["nft", id], queryFn: () => api.nft(id) });
  const favorites = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: api.favorites,
    enabled: !!user,
  });
  const favorite = useMutation({
    mutationFn: (active: boolean) => api.favorite(id, active),
    onMutate: async (active) => {
      await queryClient.cancelQueries({ queryKey: ["favorites", user?.id] });
      const previous = queryClient.getQueryData<string[]>([
        "favorites",
        user?.id,
      ]);
      queryClient.setQueryData<string[]>(["favorites", user?.id], (old) =>
        active ? [...(old || []), id] : (old || []).filter((x) => x !== id),
      );
      return { previous };
    },
    onError: (_error, _active, ctx) => {
      queryClient.setQueryData(["favorites", user?.id], ctx?.previous);
      setNotice("Não foi possível atualizar o favorito.");
    },
    onSettled: () =>
      void queryClient.invalidateQueries({ queryKey: ["favorites", user?.id] }),
  });
  const add = useMutation({
    mutationFn: async () => {
      const cart = await api.cart();
      const current = cart.find((i) => i.nftId === id)?.quantity || 0;
      return api.cartSet(id, current + quantity);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
      navigate({ to: "/cart" });
    },
    onError: (error) => setNotice(messageOf(error)),
  });
  if (nft.isPending)
    return (
      <>
        <div className="breadcrumb">
          <Skeleton className="breadcrumb-skeleton" />
        </div>
        <div className="detail-layout detail-loading">
          <Skeleton className="detail-skeleton" />
          <div>
            <Skeleton className="line-skeleton" />
            <Skeleton className="line-skeleton" />
          </div>
        </div>
      </>
    );
  if (nft.isError)
    return <Feedback error={nft.error} retry={() => void nft.refetch()} />;
  const item = nft.data;
  const active = favorites.data?.includes(id) || false;
  return (
    <>
      <div className="mobile-detail-top">
        <Link to="/market" aria-label="Voltar ao mercado">
          <ArrowLeft size={20} />
        </Link>
        <button
          aria-label={
            active ? "Remover dos favoritos" : "Adicionar aos favoritos"
          }
          onClick={() =>
            user
              ? favorite.mutate(!active)
              : navigate({ to: "/login", search: { next: `/nft/${id}` } })
          }
        >
          <Heart size={20} fill={active ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="breadcrumb">
        <Link to="/">Início</Link> / Mercado / {item.name}
      </div>
      <section className="detail-layout">
        <div className="detail-gallery">
          <div className="thumbnails">
            {[0, 1, 2, 3].map((view) => (
              <button
                key={view}
                type="button"
                className={imageView === view ? "selected" : ""}
                aria-label={`Ver imagem ${view + 1}`}
                onClick={() => setImageView(view)}
              >
                <img src={item.image} alt="" />
              </button>
            ))}
          </div>
          <div className="detail-main-image">
            <img
              className={`detail-image image-view-${imageView}`}
              src={item.image}
              alt={`${item.name}, NFT da coleção Kurio`}
            />
            <button
              type="button"
              className="detail-zoom"
              aria-label="Ampliar imagem"
              onClick={() => setZoomOpen(true)}
            >
              <Search size={19} />
            </button>
          </div>
        </div>
        <div className="detail-info">
          <h1>{item.name}</h1>
          {id === "emerald-ape-042" && (
            <div className="rating">
              ★★★★★ <span>19 avaliações de colecionadores</span>
            </div>
          )}
          <div className="price">{eth(item.priceEth)}</div>
          <strong>Sobre este NFT:</strong>
          <p>{item.description}</p>
          <div className="meta">
            <strong>Edição:</strong>
            <div className="edition-options">
              <span className="current">{item.edition}</span>
              <span>{item.available} disponíveis</span>
            </div>
          </div>
          <div className="meta">
            <strong>ID do token:</strong> #{item.id.split("-").at(-1)}
          </div>
          <div className="meta">
            <strong>Coleção:</strong> Kurio Apes
          </div>
          {id === "emerald-ape-042" && (
            <div className="meta">Atributos: Óculos, Esmeralda, Raro</div>
          )}
          <div className="purchase-actions">
            <div className="stepper">
              <button
                aria-label="Diminuir quantidade"
                disabled={quantity <= 1}
                onClick={() => setQuantity(quantity - 1)}
              >
                −
              </button>
              <span>{quantity}</span>
              <button
                aria-label="Aumentar quantidade"
                disabled={quantity >= item.available}
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </button>
            </div>
            <Button
              disabled={!item.available || add.isPending}
              aria-label="Comprar"
              onClick={() => add.mutate()}
            >
              <ShoppingCart size={17} />{" "}
              {add.isPending ? "Adicionando..." : "Comprar NFT"}
            </Button>
            <Button
              variant="outline"
              aria-label={
                active ? "Remover dos favoritos" : "Adicionar aos favoritos"
              }
              onClick={() =>
                user
                  ? favorite.mutate(!active)
                  : navigate({ to: "/login", search: { next: `/nft/${id}` } })
              }
            >
              <Heart size={17} fill={active ? "currentColor" : "none"} />
              <span className="desktop-only">Favoritar</span>
            </Button>
            <span className="mobile-purchase-price">{eth(item.priceEth)}</span>
          </div>
          {notice && (
            <p role="status" className="error">
              {notice}
            </p>
          )}
        </div>
      </section>
      <section className="detail-description">
        <div className="detail-description-tabs">
          <strong>Detalhes do NFT</strong>
          {id === "emerald-ape-042" && (
            <span>Avaliações de colecionadores (19)</span>
          )}
        </div>
        <p>{item.description}</p>
        <p>Rede: Ethereum · Contrato ERC-721 verificado.</p>
      </section>
      <section className="more">
        <h2>Mais desta coleção</h2>
        <div className="related">
          {["cosmic-bloom-118", "violet-nomad-314", "ivory-baron-088", "golden-beat-207", "golden-signal-160"].map(
            (other) => (
              <Related key={other} id={other} />
            ),
          )}
        </div>
      </section>
      <Modal open={zoomOpen} onOpenChange={setZoomOpen} title={item.name}>
        <img className="zoomed-nft" src={item.image} alt={item.name} />
      </Modal>
    </>
  );
}
function Related({ id }: { id: string }) {
  const nft = useQuery({ queryKey: ["nft", id], queryFn: () => api.nft(id) });
  return nft.data ? (
    <NftCard nft={nft.data} />
  ) : (
    <Skeleton className="card-skeleton" />
  );
}

function Cart() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useSession();
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState(
    () => sessionStorage.getItem("kurio-coupon") || "",
  );
  const [notice, setNotice] = useState("");
  const cart = useQuery({
    queryKey: ["cart", user?.id || "guest"],
    queryFn: api.cart,
  });
  const quote = useQuery({
    queryKey: ["quote", user?.id || "guest", applied, cart.data],
    queryFn: () => api.quote(applied),
    enabled: !!cart.data,
  });
  const setItem = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      api.cartSet(id, quantity),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
      void queryClient.invalidateQueries({ queryKey: ["quote"] });
    },
    onError: (error) => setNotice(messageOf(error)),
  });
  return (
    <div className="page">
      <div className="page-title">
        <Link to="/" aria-label="Voltar">
          <ArrowLeft />
        </Link>
        <h1>Carrinho de NFTs</h1>
      </div>
      {cart.isPending ? (
        <Skeleton className="summary-skeleton" />
      ) : cart.isError ? (
        <Feedback error={cart.error} retry={() => void cart.refetch()} />
      ) : !cart.data?.length ? (
        <div className="empty">
          <h2>Seu carrinho está vazio</h2>
          <p>Explore a coleção e escolha seu próximo NFT.</p>
          <Link to="/" className="btn btn-primary">
            Explorar NFTs
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            <div className="cart-table-head">
              <span>NFTs</span>
              <span>Preço</span>
              <span>Edições</span>
              <span>Total</span>
            </div>
            {cart.data.map((row) => (
              <CartRow
                key={row.nftId}
                id={row.nftId}
                quantity={row.quantity}
                onSet={(quantity) =>
                  setItem.mutate({ id: row.nftId, quantity })
                }
              />
            ))}
          </div>
          <aside className="summary">
            <h2>Resumo do pedido</h2>
            <form
              className="coupon"
              onSubmit={(e) => {
                e.preventDefault();
                const code = coupon.trim().toUpperCase();
                setApplied(code);
                sessionStorage.setItem("kurio-coupon", code);
              }}
            >
              <Input
                aria-label="Código promocional"
                placeholder="Digite o código promocional..."
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
              />
              <Button type="submit">Aplicar</Button>
            </form>
            {applied && (
              <button
                className="text-button"
                onClick={() => {
                  setApplied("");
                  setCoupon("");
                  sessionStorage.removeItem("kurio-coupon");
                }}
              >
                Remover cupom {applied}
              </button>
            )}
            {quote.isPending ? (
              <Skeleton className="summary-skeleton" />
            ) : quote.isError ? (
              <Feedback
                error={quote.error}
                retry={() => void quote.refetch()}
              />
            ) : (
              <>
                <div className="summary-line">
                  <span>Subtotal</span>
                  <strong>{eth(quote.data!.subtotalEth)}</strong>
                </div>
                <div className="summary-line">
                  <span>Desconto</span>
                  <strong>− {eth(quote.data!.discountEth)}</strong>
                </div>
                <div className="summary-line">
                  <span>Taxa de rede</span>
                  <strong>{eth(quote.data!.networkFeeEth)}</strong>
                </div>
                <div className="summary-line total">
                  <span>Total</span>
                  <strong>{eth(quote.data!.totalEth)}</strong>
                </div>
                <Button
                  className="w-full"
                  aria-label="Finalizar compra"
                  onClick={() =>
                    navigate({
                      to: user ? "/checkout" : "/login",
                      search: user ? undefined : { next: "/checkout" },
                    })
                  }
                >
                  Conectar e finalizar
                </Button>
                <Link to="/market" className="continue-link">
                  Continuar explorando
                </Link>
              </>
            )}
            {notice && (
              <p role="alert" className="error">
                {notice}
              </p>
            )}
          </aside>
        </div>
      )}
      {!!cart.data?.length && (
        <section className="cart-recommendations">
          <h2>Colecionadores também viram</h2>
          <div className="related">
            {[
              "cosmic-bloom-118",
              "violet-nomad-314",
              "ivory-baron-088",
              "golden-beat-207",
              "golden-signal-160",
            ].map((id) => (
              <Related key={id} id={id} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
function CartRow({
  id,
  quantity,
  onSet,
}: {
  id: string;
  quantity: number;
  onSet: (quantity: number) => void;
}) {
  const nft = useQuery({ queryKey: ["nft", id], queryFn: () => api.nft(id) });
  if (!nft.data) return <Skeleton className="cart-row-skeleton" />;
  return (
    <div className="cart-row">
      <Link to="/nft/$id" params={{ id }}>
        <img src={nft.data.image} alt={nft.data.name} />
      </Link>
      <div className="cart-row-info">
        <Link to="/nft/$id" params={{ id }}>
          <strong>{nft.data.name}</strong>
        </Link>
        <span>Edição: {nft.data.edition}</span>
        <b>{eth(nft.data.priceEth)}</b>
      </div>
      <strong className="cart-row-price">{eth(nft.data.priceEth)}</strong>
      <div className="cart-row-controls">
        <div className="stepper">
          <button
            aria-label={`Diminuir ${nft.data.name}`}
            onClick={() => onSet(quantity - 1)}
          >
            −
          </button>
          <span>{quantity}</span>
          <button
            aria-label={`Aumentar ${nft.data.name}`}
            disabled={quantity >= nft.data.available}
            onClick={() => onSet(quantity + 1)}
          >
            +
          </button>
        </div>
      </div>
      <strong className="cart-row-total">
        {eth(new Decimal(nft.data.priceEth).times(quantity).toFixed(3))}
      </strong>
      <button
        className="cart-remove"
        aria-label={`Remover ${nft.data.name}`}
        onClick={() => onSet(0)}
      >
        <Trash2 size={19} />
      </button>
    </div>
  );
}

function Private({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user)
      navigate({ to: "/login", search: { next: location.pathname } });
  }, [loading, user, navigate]);
  return loading ? (
    <Skeleton className="summary-skeleton" />
  ) : user ? (
    <>{children}</>
  ) : (
    <p className="page">Redirecionando para login...</p>
  );
}

function Checkout() {
  return (
    <Private>
      <CheckoutForm />
    </Private>
  );
}
function CheckoutForm() {
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [coupon] = useState(() => sessionStorage.getItem("kurio-coupon") || "");
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileName, setProfileName] = useState(user?.username || "");
  const [walletType, setWalletType] = useState("Coinbase Wallet");
  const [referral, setReferral] = useState("");
  const [ens, setEns] = useState(user?.ens || "");
  const [note, setNote] = useState("");
  const [otherWallet, setOtherWallet] = useState(false);
  const [otherAddress, setOtherAddress] = useState("");
  const [walletId, setWalletId] = useState("");
  const [network, setNetwork] = useState("Ethereum");
  const [review, setReview] = useState(false);
  const [reviewFingerprint, setReviewFingerprint] = useState("");
  const [notice, setNotice] = useState("");
  const [attemptKey, setAttemptKey] = useState(
    () => sessionStorage.getItem("kurio-attempt-key") || crypto.randomUUID(),
  );
  const wallets = useQuery({
    queryKey: ["wallets", user?.id],
    queryFn: api.wallets,
  });
  const connection = useQuery({
    queryKey: ["wallet-connection", user?.id],
    queryFn: api.walletConnection,
  });
  const connect = useMutation({
    mutationFn: api.walletConnect,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["wallet-connection", user?.id],
      });
      setNotice("Carteira conectada.");
    },
    onError: (error) => setNotice(messageOf(error)),
  });
  const disconnect = useMutation({
    mutationFn: api.walletDisconnect,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["wallet-connection", user?.id],
      });
      setNotice("Carteira desconectada.");
    },
    onError: (error) => setNotice(messageOf(error)),
  });
  const quote = useQuery({
    queryKey: ["quote", user?.id, coupon, network],
    queryFn: () => api.quote(coupon, network),
  });
  const selectedWallet = wallets.data?.find((wallet) => wallet.id === walletId);
  const walletAddress = otherWallet
    ? otherAddress
    : selectedWallet?.address || "";
  useEffect(() => {
    if (wallets.data?.length && !walletId) {
      const selected = wallets.data.find((w) => w.primary) || wallets.data[0];
      setWalletId(selected.id);
      setNetwork(selected.network);
    }
  }, [wallets.data, walletId]);
  useEffect(() => {
    const key = sessionStorage.getItem("kurio-attempt-key");
    if (key)
      void api
        .orderByKey(key)
        .then((result) =>
          navigate({ to: "/order/$id", params: { id: result.id } }),
        )
        .catch(() => {});
  }, [navigate]);
  useEffect(() => {
    if (
      review &&
      reviewFingerprint &&
      quote.data &&
      quote.data.fingerprint !== reviewFingerprint
    ) {
      setReview(false);
      setNotice("A cotação mudou. Revise os valores novamente.");
    }
  }, [review, reviewFingerprint, quote.data]);
  const order = useMutation({
    mutationFn: () =>
      api.order({
        fingerprint: reviewFingerprint,
        coupon,
        walletId,
        network,
        key: attemptKey,
        collector: {
          name,
          username,
          email,
          profileName,
          walletAddress,
          walletType,
          referral,
          ens,
          note,
        },
      }),
    onSuccess: (result) => {
      sessionStorage.removeItem("kurio-attempt-key");
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
      navigate({ to: "/order/$id", params: { id: result.id } });
    },
    onError: async (error) => {
      try {
        const existing = await api.orderByKey(attemptKey);
        navigate({ to: "/order/$id", params: { id: existing.id } });
      } catch {
        setReview(false);
        setNotice(messageOf(error));
        void quote.refetch();
        if (!sessionStorage.getItem("kurio-attempt-key"))
          setAttemptKey(crypto.randomUUID());
      }
    },
  });
  const canReview =
    !!name.trim() &&
    !!username.trim() &&
    !!profileName.trim() &&
    /^\S+@\S+\.\S+$/.test(email) &&
    !!walletId &&
    !!walletAddress.trim() &&
    !otherWallet &&
    !!connection.data &&
    connection.data.walletId === walletId &&
    connection.data.network === network &&
    connection.data.type === walletType &&
    !!quote.data?.items.length;
  return (
    <div className="page">
      <div className="breadcrumb">
        <Link to="/">Início</Link> / <Link to="/cart">Carrinho</Link> /
        Pagamento
      </div>
      <h1 className="checkout-page-title">Pagamento</h1>
      <div className="checkout-layout">
        <form
          className="checkout-form"
          onSubmit={(e) => {
            e.preventDefault();
            setReviewFingerprint(quote.data!.fingerprint);
            setReview(true);
          }}
        >
          <h2>Perfil do colecionador</h2>
          <div className="form-grid">
            <Field label="Nome de exibição*" id="checkout-name">
              <Input
                id="checkout-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>
            <Field label="Nome de usuário*" id="checkout-username">
              <Input
                id="checkout-username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Field>
            <Field label="Rede*" id="network">
              <select
                id="network"
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
              >
                <option>Ethereum</option>
                <option>Polygon</option>
              </select>
            </Field>
            <Field label="Nome do perfil*" id="checkout-profile-name">
              <Input
                id="checkout-profile-name"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </Field>
            <Field label="Endereço da carteira*" id="checkout-address">
              <Input
                id="checkout-address"
                required
                value={walletAddress}
                readOnly={!otherWallet}
                onChange={(e) => setOtherAddress(e.target.value)}
                placeholder="Endereço 0x da carteira"
              />
            </Field>
            <Field
              label="ENS ou carteira secundária (opcional)"
              id="checkout-ens"
            >
              <Input
                id="checkout-ens"
                value={ens}
                onChange={(e) => setEns(e.target.value)}
              />
            </Field>
            <Field label="Tipo de carteira*" id="checkout-wallet-type">
              <select
                id="checkout-wallet-type"
                value={walletType}
                onChange={(e) => setWalletType(e.target.value)}
              >
                <option>Coinbase Wallet</option>
                <option>MetaMask</option>
                <option>WalletConnect</option>
              </select>
            </Field>
            <Field label="Código de indicação" id="checkout-referral">
              <Input
                id="checkout-referral"
                value={referral}
                onChange={(e) => setReferral(e.target.value)}
              />
            </Field>
            <Field label="E-mail*" id="checkout-email">
              <Input
                id="checkout-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Nome ENS" id="checkout-ens-name">
              <Input
                id="checkout-ens-name"
                value={ens}
                onChange={(e) => setEns(e.target.value)}
              />
            </Field>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={otherWallet}
              onChange={(e) => setOtherWallet(e.target.checked)}
            />{" "}
            Usar outra carteira?
          </label>
          {otherWallet && (
            <Link to="/wallets" className="inline-link">
              Cadastre a outra carteira para usá-la na compra
            </Link>
          )}
          <Field
            label="Observação do colecionador (opcional)"
            id="checkout-note"
          >
            <textarea
              id="checkout-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          <h2>Carteira e rede</h2>
          {wallets.isPending ? (
            <Skeleton className="summary-skeleton" />
          ) : wallets.isError ? (
            <Feedback
              error={wallets.error}
              retry={() => void wallets.refetch()}
            />
          ) : wallets.data?.length ? (
            <div className="wallet-options">
              {wallets.data.map((w) => (
                <label key={w.id} className="wallet-option">
                  <input
                    type="radio"
                    name="wallet"
                    checked={walletId === w.id}
                    onChange={() => {
                      setWalletId(w.id);
                      setNetwork(w.network);
                    }}
                  />
                  <span>
                    <strong>{w.label}</strong>
                    <small>
                      {w.address} · {w.network}
                    </small>
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p>
              Nenhuma carteira cadastrada.{" "}
              <Link to="/wallets" className="inline-link">
                Adicionar carteira
              </Link>
            </p>
          )}
          <div className="wallet-connection-actions">
            {connection.data?.walletId === walletId &&
            connection.data.network === network &&
            connection.data.type === walletType ? (
              <>
                <span role="status">Carteira conectada</span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => disconnect.mutate()}
                >
                  Desconectar
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={!walletId || connect.isPending}
                onClick={() =>
                  connect.mutate({ walletId, network, type: walletType })
                }
              >
                {connect.isPending ? "Conectando..." : "Conectar carteira"}
              </Button>
            )}
          </div>
          <p className="subtle">
            Conexão de carteira simulada. Nenhuma transação real será enviada.
          </p>
          <Button type="submit" disabled={!canReview}>
            Revisar compra
          </Button>
        </form>
        <aside className="summary">
          <h2>Seus NFTs</h2>
          {quote.isPending ? (
            <Skeleton className="summary-skeleton" />
          ) : quote.isError ? (
            <Feedback error={quote.error} retry={() => void quote.refetch()} />
          ) : (
            <>
              <div className="checkout-items">
                {quote.data?.items.map((item) => (
                  <div key={item.nft.id} className="checkout-item">
                    <img src={item.nft.image} alt="" />
                    <span>
                      {item.nft.name}
                      <small>Qtd. {item.quantity}</small>
                    </span>
                    <strong>{eth(item.lineEth)}</strong>
                  </div>
                ))}
              </div>
              <div className="summary-line">
                <span>Subtotal</span>
                <strong>{eth(quote.data!.subtotalEth)}</strong>
              </div>
              <div className="summary-line">
                <span>Desconto</span>
                <strong>− {eth(quote.data!.discountEth)}</strong>
              </div>
              <div className="summary-line">
                <span>Taxa de rede</span>
                <strong>{eth(quote.data!.networkFeeEth)}</strong>
              </div>
              <div className="summary-line total">
                <span>Total</span>
                <strong>{eth(quote.data!.totalEth)}</strong>
              </div>
            </>
          )}
        </aside>
      </div>
      {notice && (
        <p role="alert" className="error">
          {notice}
        </p>
      )}
      <Modal open={review} onOpenChange={setReview} title="Revisar pedido">
        <p>Confirme os itens, o total e a carteira antes de enviar.</p>
        <div className="summary-line">
          <span>Total</span>
          <strong>{quote.data && eth(quote.data.totalEth)}</strong>
        </div>
        <div className="summary-line">
          <span>Carteira</span>
          <strong>{wallets.data?.find((w) => w.id === walletId)?.label}</strong>
        </div>
        <Button
          className="w-full"
          disabled={order.isPending}
          onClick={() => {
            sessionStorage.setItem("kurio-attempt-key", attemptKey);
            order.mutate();
          }}
        >
          {order.isPending ? "Enviando..." : "Confirmar compra"}
        </Button>
        <button
          className="text-button"
          onClick={() => {
            setAttemptKey(crypto.randomUUID());
            setReview(false);
          }}
        >
          Voltar e editar
        </button>
      </Modal>
    </div>
  );
}

function OrderPage() {
  return (
    <Private>
      <OrderContent />
    </Private>
  );
}
function OrderContent() {
  const { id } = useParams({ from: "/order/$id" });
  const order = useQuery({
    queryKey: ["order", id],
    queryFn: () => api.orderById(id),
    refetchInterval: (query) =>
      query.state.data?.status === "pending" ? 1000 : false,
  });
  if (order.isPending)
    return (
      <div className="page">
        <Skeleton className="summary-skeleton" />
      </div>
    );
  if (order.isError)
    return <Feedback error={order.error} retry={() => void order.refetch()} />;
  const data = order.data;
  return (
    <div className="page receipt">
      <Link to="/market" className="receipt-close" aria-label="Fechar recibo">
        ×
      </Link>
      <div className="receipt-icon">
        {data.status === "confirmed"
          ? "✓"
          : data.status === "declined"
            ? "×"
            : "…"}
      </div>
      <h1>
        {data.status === "confirmed"
          ? "Pedido confirmado"
          : data.status === "declined"
            ? "Pagamento recusado"
            : "Pedido em processamento"}
      </h1>
      <p>
        {data.status === "pending"
          ? "Aguardando a resposta da simulação. Você pode atualizar esta página sem duplicar a compra."
          : data.status === "declined"
            ? "Seus NFTs continuam no carrinho. Tente outra carteira."
            : "Seu colecionável digital está a caminho."}
      </p>
      <div className="summary">
        <div className="receipt-meta">
          <div>
            <span>ID da transação</span>
            <strong>
              {data.transaction.slice(0, 8)}...{data.transaction.slice(-4)}
            </strong>
          </div>
          <div>
            <span>Data</span>
            <strong>
              {new Date(data.createdAt).toLocaleDateString("pt-BR")}
            </strong>
          </div>
          <div>
            <span>Total</span>
            <strong>{eth(data.quote.totalEth)}</strong>
          </div>
          <div>
            <span>Carteira</span>
            <strong>{data.wallet?.label || "Carteira"}</strong>
          </div>
        </div>
        <h2>Detalhes da transação</h2>
        {data.status === "confirmed" && (
          <div className="summary-line">
            <span>Transação simulada</span>
            <strong className="transaction">{data.transaction}</strong>
          </div>
        )}
        {data.quote.items.map((item) => (
          <div key={item.nft.id} className="checkout-item">
            <img src={item.nft.image} alt="" />
            <span>
              {item.nft.name}
              <small>Qtd. {item.quantity}</small>
            </span>
            <strong>{eth(item.lineEth)}</strong>
          </div>
        ))}
        <div className="summary-line">
          <span>Taxa de rede</span>
          <strong>{eth(data.quote.networkFeeEth)}</strong>
        </div>
        <div className="summary-line total">
          <span>Total</span>
          <strong>{eth(data.quote.totalEth)}</strong>
        </div>
      </div>
      <Link
        to={data.status === "declined" ? "/cart" : "/"}
        className="btn btn-primary"
      >
        {data.status === "declined"
          ? "Voltar ao carrinho"
          : "Explorar mais NFTs"}
      </Link>
    </div>
  );
}

function Auth({ mode }: { mode: "login" | "signup" }) {
  const session = useSession();
  const navigate = useNavigate();
  const params = useSearch({ from: mode === "login" ? "/login" : "/signup" });
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const mutation = useMutation({
    mutationFn: () => {
      if (mode === "signup" && confirm !== password)
        throw new Error("As senhas não coincidem.");
      return mode === "login"
        ? api.login({ email, password })
        : api.signup({ name: username, username, email, password });
    },
    onSuccess: (result) => {
      session.signIn(result.token);
      navigate({ to: params.next || "/" });
    },
  });
  return (
    <div className="auth-page">
      <div className="auth-background" aria-hidden="true">
        <div className="auth-background-hero">
          <div>
            <small>Bem-vindo à Kurio</small>
            <h2>
              SEJA DONO DO FUTURO
              <br />
              DA ARTE DIGITAL
            </h2>
            <p>
              Descubra NFTs selecionados de criadores de arte digital
              verificada.
            </p>
            <span>EXPLORAR</span>
          </div>
          <img src="/images/emerald.png" alt="" />
        </div>
        <div className="auth-background-catalog">
          <div className="auth-background-filters">
            Coleções
            <br />
            <br />
            Arte digital
            <br />
            <br />
            Fotografia
            <br />
            <br />
            Música
            <br />
            <br />
            Arte 3D
            <br />
            <br />
            Colecionáveis
          </div>
          <div className="auth-background-cards">
            {["emerald", "sage", "ivory", "golden"].map((image) => (
              <img key={image} src={`/images/${image}.png`} alt="" />
            ))}
          </div>
        </div>
      </div>
      <div className="auth-panel">
        <Link to="/" className="auth-close" aria-label="Fechar">
          ×
        </Link>
        <div className="auth-logo">KURIO</div>
        <h1>{mode === "login" ? "Entrar" : "Criar perfil de colecionador"}</h1>
        <p>
          {mode === "login"
            ? "Entre para gerenciar sua carteira, coleção e perfil de criador."
            : "Crie seu perfil de colecionador e conecte uma carteira quando quiser."}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          {mode === "signup" && (
            <>
              <Field label="Nome de usuário" id="username">
                <Input
                  id="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nome de usuário"
                />
              </Field>
            </>
          )}
          <Field label="E-mail" id="email">
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contato@email.com"
            />
          </Field>
          <Field label="Senha" id="password">
            <div className="password-input">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={mode === "signup" ? 8 : 1}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
              />
              <button
                type="button"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </Field>
          {mode === "signup" && (
            <Field label="Confirmar senha" id="confirm">
              <Input
                id="confirm"
                type={showPassword ? "text" : "password"}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirmar senha"
              />
            </Field>
          )}
          {mode === "login" && (
            <p className="forgot-password">Esqueceu a senha?</p>
          )}
          {mutation.isError && (
            <p role="alert" className="error">
              {messageOf(mutation.error)}
            </p>
          )}
          <Button className="w-full" disabled={mutation.isPending}>
            {mutation.isPending
              ? "Aguarde..."
              : mode === "login"
                ? "Entrar"
                : "Criar conta"}
          </Button>
        </form>
        <div className="auth-divider">Ou continue com</div>
        <button className="auth-social" type="button" disabled>
          Continuar com Google
        </button>
        <button className="auth-social" type="button" disabled>
          Continuar com Facebook
        </button>
        <p className="auth-switch">
          {mode === "login" ? (
            <>
              Novo na Kurio?{" "}
              <Link
                to="/signup"
                search={{ next: params.next }}
                className="inline-link"
              >
                Crie uma conta
              </Link>
            </>
          ) : (
            <>
              Já tem conta?{" "}
              <Link
                to="/login"
                search={{ next: params.next }}
                className="inline-link"
              >
                Entrar
              </Link>
            </>
          )}
        </p>
        <p className="subtle demo-hint">
          Conta de demonstração: ana@kurio.test / Kurio123!
        </p>
      </div>
    </div>
  );
}

function AccountNav() {
  const { signOut } = useSession();
  const navigate = useNavigate();
  return (
    <aside className="account-nav">
      <h3>Meu perfil</h3>
      <Link to="/profile" activeProps={{ className: "active" }}>
        Dados do perfil
      </Link>
      <Link to="/wallets" activeProps={{ className: "active" }}>
        Carteiras
      </Link>
      <span>Atividade</span>
      <span>Lista de interesse</span>
      <span>Ofertas</span>
      <span>Arquivos baixados</span>
      <span>Suporte</span>
      <button
        onClick={async () => {
          await signOut();
          navigate({ to: "/" });
        }}
      >
        Sair
      </button>
    </aside>
  );
}
function Profile() {
  return (
    <Private>
      <ProfileContent />
    </Private>
  );
}
function ProfileContent() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [ens, setEns] = useState(user?.ens || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmNext, setConfirmNext] = useState("");
  const [notice, setNotice] = useState("");
  const update = useMutation({
    mutationFn: () => api.profile({ name, username, email, ens, avatar }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["session"] });
      setNotice("Perfil salvo.");
    },
    onError: (error) => setNotice(messageOf(error)),
  });
  const password = useMutation({
    mutationFn: () => {
      if (next !== confirmNext)
        throw new Error("As novas senhas não coincidem.");
      return api.password({ current, next });
    },
    onSuccess: () => {
      setCurrent("");
      setNext("");
      setConfirmNext("");
      setNotice("Senha alterada.");
    },
    onError: (error) => setNotice(messageOf(error)),
  });
  return (
    <div className="page account-layout">
      <AccountNav />
      <div className="account-content">
        <h1>Perfil do colecionador</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update.mutate();
          }}
        >
          <div className="form-grid">
            <Field label="Nome de exibição*" id="profile-name">
              <Input
                id="profile-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Nome de usuário*" id="profile-username">
              <Input
                id="profile-username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Field>
            <Field label="E-mail*" id="profile-email">
              <Input
                id="profile-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Nome ENS" id="profile-ens">
              <Input
                id="profile-ens"
                value={ens}
                onChange={(e) => setEns(e.target.value)}
              />
            </Field>
          </div>
          <div className="avatar-controls">
            <span>Avatar</span>
            {avatar ? (
              <img
                className="avatar-preview"
                src={avatar}
                alt="Prévia do avatar"
              />
            ) : (
              <span className="avatar-placeholder">◉</span>
            )}
            <label className="btn btn-primary">
              Alterar
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 1024 * 1024) {
                    setNotice("O avatar deve ter até 1 MB.");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => setAvatar(String(reader.result));
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            <button
              type="button"
              className="text-button"
              onClick={() => setAvatar("")}
            >
              Remover
            </button>
          </div>
          <Button disabled={update.isPending}>Salvar perfil</Button>
        </form>
        <h2>Alterar senha</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            password.mutate();
          }}
          className="password-form"
        >
          <Field label="Senha atual" id="current">
            <Input
              id="current"
              type="password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </Field>
          <Field label="Nova senha" id="next">
            <Input
              id="next"
              type="password"
              required
              minLength={8}
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </Field>
          <Field label="Confirmar nova senha" id="confirm-next">
            <Input
              id="confirm-next"
              type="password"
              required
              minLength={8}
              value={confirmNext}
              onChange={(e) => setConfirmNext(e.target.value)}
            />
          </Field>
          <Button disabled={password.isPending}>Alterar senha</Button>
        </form>
        {notice && (
          <p role="status" className="notice">
            {notice}
          </p>
        )}
      </div>
    </div>
  );
}
function Wallets() {
  return (
    <Private>
      <WalletContent />
    </Private>
  );
}
function Favorites() {
  return (
    <Private>
      <FavoritesContent />
    </Private>
  );
}
function FavoritesContent() {
  const { user } = useSession();
  const favorites = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: api.favorites,
  });
  return (
    <div className="page">
      <h1>Favoritos</h1>
      {favorites.isPending ? (
        <Skeleton className="summary-skeleton" />
      ) : favorites.isError ? (
        <Feedback
          error={favorites.error}
          retry={() => void favorites.refetch()}
        />
      ) : favorites.data?.length ? (
        <div className="nft-grid">
          {favorites.data.map((id) => (
            <Related key={id} id={id} />
          ))}
        </div>
      ) : (
        <div className="empty">Nenhum NFT favorito ainda.</div>
      )}
    </div>
  );
}
function WalletContent() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const wallets = useQuery({
    queryKey: ["wallets", user?.id],
    queryFn: api.wallets,
  });
  const [label, setLabel] = useState("");
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [profileName, setProfileName] = useState(user?.username || "");
  const [walletEmail, setWalletEmail] = useState(user?.email || "");
  const [walletEns, setWalletEns] = useState(user?.ens || "");
  const [walletKind, setWalletKind] = useState("MetaMask");
  const [referral, setReferral] = useState("");
  const [secondaryAddress, setSecondaryAddress] = useState("");
  const [address, setAddress] = useState("");
  const [network, setNetwork] = useState("Ethereum");
  const [primary, setPrimary] = useState(false);
  const [editing, setEditing] = useState<string | undefined>();
  const [notice, setNotice] = useState("");
  const saveWallet = useMutation({
    mutationFn: () =>
      api.walletSave({
        id: editing,
        label,
        address,
        network,
        primary,
        displayName,
        profileName,
        email: walletEmail,
        ens: walletEns,
        kind: walletKind,
        referral,
        secondaryAddress,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["wallets", user?.id] });
      setLabel("");
      setAddress("");
      setEditing(undefined);
      setNotice("Carteira salva.");
    },
    onError: (error) => setNotice(messageOf(error)),
  });
  return (
    <div className="page account-layout">
      <AccountNav />
      <div className="account-content">
        <h1>Carteira principal</h1>
        <p className="subtle">
          Estas carteiras ficam disponíveis no pagamento e para receber NFTs
          comprados.
        </p>
        {wallets.isPending ? (
          <Skeleton className="summary-skeleton" />
        ) : wallets.isError ? (
          <Feedback
            error={wallets.error}
            retry={() => void wallets.refetch()}
          />
        ) : (
          <div className="wallet-list">
            {wallets.data?.map((w) => (
              <div key={w.id} className="wallet-tile">
                <WalletIcon />
                <span>
                  <strong>
                    {w.label} {w.primary && "· Principal"}
                  </strong>
                  <small>
                    {w.address} · {w.network}
                  </small>
                </span>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(w.id);
                    setLabel(w.label);
                    setAddress(w.address);
                    setNetwork(w.network);
                    setPrimary(w.primary);
                    setDisplayName(w.displayName || user?.name || "");
                    setProfileName(w.profileName || user?.username || "");
                    setWalletEmail(w.email || user?.email || "");
                    setWalletEns(w.ens || user?.ens || "");
                    setWalletKind(w.kind || "MetaMask");
                    setReferral(w.referral || "");
                    setSecondaryAddress(w.secondaryAddress || "");
                  }}
                >
                  Editar
                </Button>
              </div>
            ))}
          </div>
        )}
        <h2>{editing ? "Editar carteira" : "Adicionar carteira"}</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveWallet.mutate();
          }}
          className="wallet-form"
        >
          <Field label="Nome de exibição*" id="wallet-display-name">
            <Input
              id="wallet-display-name"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </Field>
          <Field label="Apelido da carteira*" id="wallet-label">
            <Input
              id="wallet-label"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </Field>
          <Field label="Nome do perfil*" id="wallet-profile-name">
            <Input
              id="wallet-profile-name"
              required
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
            />
          </Field>
          <Field label="Endereço (0x + 40 caracteres)" id="wallet-address">
            <Input
              id="wallet-address"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x..."
            />
          </Field>
          <Field
            label="ENS ou carteira secundária (opcional)"
            id="wallet-secondary"
          >
            <Input
              id="wallet-secondary"
              value={secondaryAddress}
              onChange={(e) => setSecondaryAddress(e.target.value)}
            />
          </Field>
          <Field label="Rede" id="wallet-network">
            <select
              id="wallet-network"
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
            >
              <option>Ethereum</option>
              <option>Polygon</option>
            </select>
          </Field>
          <Field label="Tipo de carteira*" id="wallet-kind">
            <select
              id="wallet-kind"
              value={walletKind}
              onChange={(e) => setWalletKind(e.target.value)}
            >
              <option>MetaMask</option>
              <option>WalletConnect</option>
              <option>Coinbase Wallet</option>
            </select>
          </Field>
          <Field label="Código de indicação" id="wallet-referral">
            <Input
              id="wallet-referral"
              value={referral}
              onChange={(e) => setReferral(e.target.value)}
            />
          </Field>
          <Field label="E-mail*" id="wallet-email">
            <Input
              id="wallet-email"
              type="email"
              required
              value={walletEmail}
              onChange={(e) => setWalletEmail(e.target.value)}
            />
          </Field>
          <Field label="Nome ENS" id="wallet-ens">
            <Input
              id="wallet-ens"
              value={walletEns}
              onChange={(e) => setWalletEns(e.target.value)}
            />
          </Field>
          <label className="check">
            <input
              type="checkbox"
              checked={primary}
              onChange={(e) => setPrimary(e.target.checked)}
            />{" "}
            Carteira principal
          </label>
          <Button disabled={saveWallet.isPending}>Salvar carteira</Button>
        </form>
        {notice && (
          <p role="status" className="notice">
            {notice}
          </p>
        )}
      </div>
    </div>
  );
}
function NotFound() {
  return (
    <div className="page empty">
      <h1>Página não encontrada</h1>
      <Link to="/" className="btn btn-primary">
        Voltar ao início
      </Link>
    </div>
  );
}

type HomeSearch = {
  search?: string;
  category?: string;
  sort?: string;
  page?: number;
  min?: string;
  max?: string;
  network?: string;
};
const rootRoute = createRootRoute({
  component: Layout,
  notFoundComponent: NotFound,
});
const validateCatalogSearch = (s: Record<string, unknown>): HomeSearch => ({
  search: String(s.search || ""),
  category: String(s.category || ""),
  sort: String(s.sort || "featured"),
  page: Math.max(1, Number(s.page) || 1),
  min: String(s.min || ""),
  max: String(s.max || ""),
  network: String(s.network || ""),
});
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: validateCatalogSearch,
  component: Home,
});
const marketRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/market",
  validateSearch: validateCatalogSearch,
  component: () => <Home market />,
});
const detailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/nft/$id",
  component: Detail,
});
const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cart",
  component: Cart,
});
const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/checkout",
  component: Checkout,
});
const orderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/order/$id",
  component: OrderPage,
});
const authSearch = (s: Record<string, unknown>): { next?: string } => ({
  next: typeof s.next === "string" ? s.next : undefined,
});
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: authSearch,
  component: () => <Auth mode="login" />,
});
const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  validateSearch: authSearch,
  component: () => <Auth mode="signup" />,
});
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: Profile,
});
const walletsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/wallets",
  component: Wallets,
});
const favoritesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/favorites",
  component: Favorites,
});
const routeTree = rootRoute.addChildren([
  homeRoute,
  marketRoute,
  detailRoute,
  cartRoute,
  checkoutRoute,
  orderRoute,
  loginRoute,
  signupRoute,
  profileRoute,
  walletsRoute,
  favoritesRoute,
]);
export const router = createRouter({ routeTree, defaultPreload: "intent" });
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

