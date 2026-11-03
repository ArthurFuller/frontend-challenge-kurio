import { createContext, useContext, useEffect, useState } from "react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Heart,
  Menu,
  Search,
  ShoppingCart,
  SlidersHorizontal,
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
              activeProps={{ className: "active" }}
              onClick={() => setMenuOpen(false)}
            >
              Início
            </Link>
            <Link
              to="/"
              search={{ category: "Colecionável" }}
              onClick={() => setMenuOpen(false)}
            >
              Mercado
            </Link>
            <a href="#rodape" onClick={() => setMenuOpen(false)}>
              Criadores
            </a>
            <a href="#rodape" onClick={() => setMenuOpen(false)}>
              Aprenda
            </a>
          </nav>
          <div className="header-actions">
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
          <div>
            <strong>KURIO</strong>
            <p>Feito para colecionadores, criadores e cultura.</p>
          </div>
          <div>
            <h3>Meu perfil</h3>
            <Link to="/profile">Meus dados</Link>
            <Link to="/wallets">Carteiras</Link>
          </div>
          <div>
            <h3>Coleções</h3>
            <Link to="/">Arte digital</Link>
            <Link to="/">Colecionáveis</Link>
          </div>
          <div>
            <h3>Ajuda</h3>
            <p>
              Este é um marketplace de demonstração. Nenhuma compra real é
              realizada.
            </p>
          </div>
        </footer>
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
function Home() {
  const search = {
    search: "",
    category: "",
    sort: "featured",
    page: 1,
    min: "",
    max: "",
    ...useSearch({ from: "/" }),
  };
  const navigate = useNavigate({ from: "/" });
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
  };
  const nfts = useQuery({
    queryKey: ["nfts", params],
    queryFn: ({ signal }) => api.nfts(params, signal),
    placeholderData: (previous) => previous,
  });
  const update = (next: Partial<typeof search>) =>
    navigate({
      search: (prev) => ({ ...prev, ...next, page: next.page ?? 1 }),
    });
  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">BEM-VINDO À KURIO</span>
          <h1>
            SEJA DONO DO FUTURO
            <br />
            DA CULTURA DIGITAL
          </h1>
          <p>Descubra NFTs selecionados de criadores do mundo todo.</p>
          <a href="#colecoes" className="hero-link">
            EXPLORAR →
          </a>
        </div>
        <img src="/images/emerald.png" alt="Emerald Ape, destaque da coleção" />
      </section>
      <section id="colecoes" className="catalog">
        <div className="section-heading">
          <div>
            <span className="eyebrow">DESCUBRA</span>
            <h2>Coleções</h2>
          </div>
          <p>Arte digital e colecionáveis para descobrir.</p>
        </div>
        <div className="catalog-layout">
          <aside className="filters">
            <h3>
              <SlidersHorizontal size={17} /> Filtros
            </h3>
            <label htmlFor="category">Categoria</label>
            <select
              id="category"
              value={search.category}
              onChange={(e) => update({ category: e.target.value })}
            >
              <option value="">Todas</option>
              <option value="Arte">Arte</option>
              <option value="Colecionável">Colecionável</option>
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
                  search: {
                    search: "",
                    category: "",
                    sort: "featured",
                    page: 1,
                    min: "",
                    max: "",
                  },
                })
              }
            >
              Limpar filtros
            </Button>
          </aside>
          <div>
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
                <option value="featured">Destaques</option>
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
        <div className="breadcrumb"><Skeleton className="breadcrumb-skeleton" /></div>
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
      <div className="breadcrumb">
        <Link to="/">Início</Link> / Mercado / {item.name}
      </div>
      <section className="detail-layout">
        <div className="detail-gallery">
          <div className="thumbnails">
            <img src={item.image} alt="Miniatura da edição" />
          </div>
          <img
            className="detail-image"
            src={item.image}
            alt={`${item.name}, NFT da coleção Kurio`}
          />
        </div>
        <div className="detail-info">
          <span className="eyebrow">KURIO EDITIONS</span>
          <h1>{item.name}</h1>
          <div className="price">{eth(item.priceEth)}</div>
          <p>{item.description}</p>
          <div className="meta">
            <strong>Edição:</strong> {item.edition} · {item.available}{" "}
            disponíveis
          </div>
          <div className="meta">
            <strong>ID do token:</strong> #{item.id.split("-").at(-1)}
          </div>
          <div className="meta">
            <strong>Coleção:</strong> Kurio Apes
          </div>
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
              onClick={() => add.mutate()}
            >
              <ShoppingCart size={17} />{" "}
              {add.isPending ? "Adicionando..." : "Comprar"}
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
          </div>
          {notice && (
            <p role="status" className="error">
              {notice}
            </p>
          )}
        </div>
      </section>
      <section className="more">
        <h2>Mais desta coleção</h2>
        <div className="related">
          {["sage-nomad-009", "ivory-baron-088", "golden-beat-207"].map(
            (other) => (
              <Related key={other} id={other} />
            ),
          )}
        </div>
      </section>
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
  const [applied, setApplied] = useState("");
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
                setApplied(coupon.trim().toUpperCase());
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
                  onClick={() =>
                    navigate({
                      to: user ? "/checkout" : "/login",
                      search: user ? undefined : { next: "/checkout" },
                    })
                  }
                >
                  Finalizar compra
                </Button>
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
        <button className="text-button" onClick={() => onSet(0)}>
          Remover
        </button>
      </div>
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
  const [coupon] = useState("");
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
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
  const quote = useQuery({
    queryKey: ["quote", user?.id, coupon],
    queryFn: () => api.quote(coupon),
  });
  useEffect(() => {
    if (wallets.data?.length && !walletId)
      setWalletId(
        wallets.data.find((w) => w.primary)?.id || wallets.data[0].id,
      );
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
    /^\S+@\S+\.\S+$/.test(email) &&
    !!walletId &&
    !!quote.data?.items.length;
  return (
    <div className="page">
      <div className="breadcrumb">
        <Link to="/">Início</Link> / <Link to="/cart">Carrinho</Link> /
        Pagamento
      </div>
      <h1>Pagamento</h1>
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
            <Field label="E-mail*" id="checkout-email">
              <Input
                id="checkout-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
          </div>
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
          <Field label="Rede" id="network">
            <select
              id="network"
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
            >
              <option>Ethereum</option>
              <option>Polygon</option>
            </select>
          </Field>
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
        <div className="summary-line">
          <span>Pedido</span>
          <strong>{data.id}</strong>
        </div>
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
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      mode === "login"
        ? api.login({ email, password })
        : api.signup({ name, username, email, password }),
    onSuccess: (result) => {
      session.signIn(result.token);
      navigate({ to: params.next || "/" });
    },
  });
  return (
    <div className="auth-page">
      <div className="auth-art">
        <span className="eyebrow">KURIO</span>
        <h1>
          SEJA DONO DA
          <br />
          CULTURA DIGITAL
        </h1>
        <img src="/images/emerald.png" alt="Colecionável Emerald Ape" />
      </div>
      <div className="auth-panel">
        <span className="eyebrow">BEM-VINDO À KURIO</span>
        <h1>{mode === "login" ? "Entrar" : "Criar conta"}</h1>
        <p>
          {mode === "login"
            ? "Acesse sua coleção e continue de onde parou."
            : "Comece sua jornada no universo dos NFTs."}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          {mode === "signup" && (
            <>
              <Field label="Nome completo" id="name">
                <Input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field label="Nome de usuário" id="username">
                <Input
                  id="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
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
            />
          </Field>
          <Field label="Senha" id="password">
            <Input
              id="password"
              type="password"
              required
              minLength={mode === "signup" ? 8 : 1}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
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
        <p>
          {mode === "login" ? (
            <>
              Ainda não tem conta?{" "}
              <Link
                to="/signup"
                search={{ next: params.next }}
                className="inline-link"
              >
                Cadastre-se
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
        <p className="subtle">Para testar: ana@kurio.test / Kurio123!</p>
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
    mutationFn: () => api.password({ current, next }),
    onSuccess: () => {
      setCurrent("");
      setNext("");
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
          <Field label="URL do avatar" id="avatar">
            <Input
              id="avatar"
              type="url"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://..."
            />
          </Field>
          {avatar && (
            <img
              className="avatar-preview"
              src={avatar}
              alt="Prévia do avatar"
            />
          )}
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
function WalletContent() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const wallets = useQuery({
    queryKey: ["wallets", user?.id],
    queryFn: api.wallets,
  });
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [network, setNetwork] = useState("Ethereum");
  const [primary, setPrimary] = useState(false);
  const [editing, setEditing] = useState<string | undefined>();
  const [notice, setNotice] = useState("");
  const saveWallet = useMutation({
    mutationFn: () =>
      api.walletSave({ id: editing, label, address, network, primary }),
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
        <h1>Minhas carteiras</h1>
        <p className="subtle">Endereços simulados para esta demonstração.</p>
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
          <Field label="Nome" id="wallet-label">
            <Input
              id="wallet-label"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
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
};
const rootRoute = createRootRoute({
  component: Layout,
  notFoundComponent: NotFound,
});
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: (s: Record<string, unknown>): HomeSearch => ({
    search: String(s.search || ""),
    category: String(s.category || ""),
    sort: String(s.sort || "featured"),
    page: Math.max(1, Number(s.page) || 1),
    min: String(s.min || ""),
    max: String(s.max || ""),
  }),
  component: Home,
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
const routeTree = rootRoute.addChildren([
  homeRoute,
  detailRoute,
  cartRoute,
  checkoutRoute,
  orderRoute,
  loginRoute,
  signupRoute,
  profileRoute,
  walletsRoute,
]);
export const router = createRouter({ routeTree, defaultPreload: "intent" });
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
