import { delay, http, HttpResponse } from "msw";
import {
  cartOwner,
  database,
  hashPassword,
  publicUser,
  quoteFor,
  reset,
  save,
} from "./data";
import type { Database } from "./data";
import type { CartItem, Order, User, Wallet } from "../types";
import { emitSocketEvent, socketHandler } from "./socket";

const fail = (message: string, status = 400, code?: string) =>
  HttpResponse.json({ message, code }, { status });
function tokenOf(request: Request) {
  return request.headers.get("Authorization")?.replace(/^Bearer /, "") || null;
}
function ownerOf(db: Database, request: Request) {
  if (localStorage.getItem("kurio-scenario") === "session-expired") return null;
  const token = tokenOf(request);
  return (token && db.sessions[token]) || null;
}
function requireOwner(db: Database, request: Request) {
  return ownerOf(db, request);
}
let variableRequest = 0;
async function network() {
  const scenario = localStorage.getItem("kurio-scenario") || "normal";
  if (scenario === "slow") await delay(1100);
  if (scenario === "variable")
    await delay([850, 150, 650, 250][variableRequest++ % 4]);
  return scenario;
}
function mergeGuest(db: Database, userId: string) {
  const userCart = db.carts[userId] || [];
  for (const guest of db.carts.guest || []) {
    const existing = userCart.find((i) => i.nftId === guest.nftId);
    if (existing) existing.quantity += guest.quantity;
    else userCart.push({ ...guest });
  }
  db.carts[userId] = userCart;
  db.carts.guest = [];
}

export const handlers = [
  socketHandler,
  http.all("/api/*", async ({ request }) => {
    if (request.url.includes("/api/__")) return undefined;
    const scenario = localStorage.getItem("kurio-scenario");
    if (scenario === "offline") return HttpResponse.error();
    if (scenario === "timeout") {
      await delay(11000);
      return HttpResponse.error();
    }
    return undefined;
  }),
  http.get("/api/session", async ({ request }) => {
    await network();
    const db = await database();
    const owner = ownerOf(db, request);
    if (!owner)
      return fail("Sessão expirada. Entre novamente.", 401, "SESSION_EXPIRED");
    return HttpResponse.json(
      publicUser(db.accounts.find((a) => a.id === owner)!),
    );
  }),
  http.post("/api/login", async ({ request }) => {
    await network();
    const body = (await request.json()) as { email: string; password: string };
    const db = await database();
    const account = db.accounts.find(
      (a) => a.email.toLowerCase() === body.email.toLowerCase(),
    );
    if (
      !account ||
      account.passwordHash !== (await hashPassword(body.password))
    )
      return fail("E-mail ou senha incorretos.", 401);
    const token = crypto.randomUUID();
    db.sessions[token] = account.id;
    mergeGuest(db, account.id);
    save(db);
    return HttpResponse.json({ token, user: publicUser(account) });
  }),
  http.post("/api/signup", async ({ request }) => {
    await network();
    const body = (await request.json()) as {
      name: string;
      username: string;
      email: string;
      password: string;
    };
    const db = await database();
    if (
      !body.name?.trim() ||
      !body.username?.trim() ||
      !/^\S+@\S+\.\S+$/.test(body.email) ||
      body.password.length < 8
    )
      return fail(
        "Confira os dados e use uma senha de pelo menos 8 caracteres.",
        422,
      );
    if (
      db.accounts.some(
        (a) =>
          a.email.toLowerCase() === body.email.toLowerCase() ||
          a.username.toLowerCase() === body.username.toLowerCase(),
      )
    )
      return fail("E-mail ou nome de usuário já cadastrado.", 409);
    const account = {
      id: crypto.randomUUID(),
      name: body.name.trim(),
      username: body.username.trim(),
      email: body.email.toLowerCase(),
      ens: "",
      avatar: "",
      passwordHash: await hashPassword(body.password),
    };
    db.accounts.push(account);
    const token = crypto.randomUUID();
    db.sessions[token] = account.id;
    mergeGuest(db, account.id);
    save(db);
    return HttpResponse.json(
      { token, user: publicUser(account) },
      { status: 201 },
    );
  }),
  http.post("/api/logout", async ({ request }) => {
    const db = await database();
    const token = tokenOf(request);
    const owner = token ? db.sessions[token] : undefined;
    if (owner) delete db.walletConnections?.[owner];
    if (token) delete db.sessions[token];
    save(db);
    return HttpResponse.json({ ok: true });
  }),
  http.get("/api/nfts", async ({ request }) => {
    const scenario = await network();
    if (scenario === "error")
      return fail("Catálogo temporariamente indisponível.", 503);
    const db = await database();
    const url = new URL(request.url);
    const search = (url.searchParams.get("search") || "").toLowerCase();
    const category = url.searchParams.get("category") || "";
    const selectedNetwork = url.searchParams.get("network") || "";
    const sort = url.searchParams.get("sort") || "featured";
    const min = Number(url.searchParams.get("min") || 0);
    const max = Number(url.searchParams.get("max") || 999);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    let items = db.nfts.filter(
      (n) =>
        n.name.toLowerCase().includes(search) &&
        (!category || n.category === category) &&
        (!selectedNetwork || (n.network || "Ethereum") === selectedNetwork) &&
        Number(n.priceEth) >= min &&
        Number(n.priceEth) <= max,
    );
    if (sort === "price-asc")
      items = items.sort((a, b) => Number(a.priceEth) - Number(b.priceEth));
    if (sort === "price-desc")
      items = items.sort((a, b) => Number(b.priceEth) - Number(a.priceEth));
    if (sort === "name")
      items = items.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "newest") items = items.reverse();
    if (sort === "popular")
      items = items.sort((a, b) => b.available - a.available);
    return HttpResponse.json({
      items: items.slice((page - 1) * 6, page * 6),
      total: items.length,
      pages: Math.max(1, Math.ceil(items.length / 6)),
    });
  }),
  http.get("/api/nfts/:id", async ({ params }) => {
    await network();
    const db = await database();
    const nft = db.nfts.find((n) => n.id === params.id);
    return nft ? HttpResponse.json(nft) : fail("NFT não encontrado.", 404);
  }),
  http.get("/api/favorites", async ({ request }) => {
    const db = await database();
    const owner = requireOwner(db, request);
    return owner
      ? HttpResponse.json(db.favorites[owner] || [])
      : fail("Entre para ver seus favoritos.", 401);
  }),
  http.put("/api/favorites/:id", async ({ request, params }) => {
    const db = await database();
    const owner = requireOwner(db, request);
    if (!owner) return fail("Entre para favoritar.", 401);
    if (!db.nfts.some((n) => n.id === params.id))
      return fail("NFT não encontrado.", 404);
    if (localStorage.getItem("kurio-scenario") === "favorite-error")
      return fail("Não foi possível salvar o favorito.", 503);
    const list = db.favorites[owner] || [];
    if (!list.includes(String(params.id))) list.push(String(params.id));
    db.favorites[owner] = list;
    save(db);
    return HttpResponse.json(list);
  }),
  http.delete("/api/favorites/:id", async ({ request, params }) => {
    const db = await database();
    const owner = requireOwner(db, request);
    if (!owner) return fail("Entre para favoritar.", 401);
    db.favorites[owner] = (db.favorites[owner] || []).filter(
      (id) => id !== params.id,
    );
    save(db);
    return HttpResponse.json(db.favorites[owner]);
  }),
  http.get("/api/cart", async ({ request }) => {
    await network();
    const db = await database();
    return HttpResponse.json(db.carts[cartOwner(db, tokenOf(request))] || []);
  }),
  http.put("/api/cart", async ({ request }) => {
    const body = (await request.json()) as CartItem;
    const db = await database();
    const nft = db.nfts.find((n) => n.id === body.nftId);
    if (!nft) return fail("NFT não encontrado.", 404);
    if (
      !Number.isInteger(body.quantity) ||
      body.quantity < 0 ||
      body.quantity > nft.available
    )
      return fail(
        `Há apenas ${nft.available} edições disponíveis.`,
        409,
        "AVAILABILITY",
      );
    const owner = cartOwner(db, tokenOf(request));
    const cart = db.carts[owner] || [];
    db.carts[owner] = cart.filter((i) => i.nftId !== body.nftId);
    if (body.quantity)
      db.carts[owner].push({ nftId: body.nftId, quantity: body.quantity });
    save(db);
    return HttpResponse.json(db.carts[owner]);
  }),
  http.post("/api/quote", async ({ request }) => {
    await network();
    const body = (await request.json()) as {
      coupon?: string;
      network?: string;
    };
    const code = body.coupon?.trim().toUpperCase();
    if (code && !["KURIO10"].includes(code))
      return fail(
        code === "EXPIRED" ? "Cupom expirado." : "Cupom inválido.",
        422,
        "COUPON",
      );
    const db = await database();
    const owner = cartOwner(db, tokenOf(request));
    const cart = db.carts[owner] || [];
    const unavailable = cart.find((i) => {
      const nft = db.nfts.find((n) => n.id === i.nftId);
      return !nft || i.quantity > nft.available;
    });
    if (unavailable)
      return fail(
        "A disponibilidade mudou. Atualize o carrinho.",
        409,
        "AVAILABILITY",
      );
    return HttpResponse.json(quoteFor(db, owner, code, body.network));
  }),
  http.post("/api/orders", async ({ request }) => {
    await network();
    const db = await database();
    const owner = requireOwner(db, request);
    if (!owner) return fail("Entre para continuar a compra.", 401);
    const body = (await request.json()) as {
      fingerprint: string;
      coupon?: string;
      walletId: string;
      network: string;
      key: string;
      collector: {
        name: string;
        username: string;
        email: string;
        profileName: string;
        walletAddress: string;
        walletType: string;
        referral: string;
        ens: string;
        note: string;
      };
    };
    const key = request.headers.get("Idempotency-Key") || body.key;
    if (!key) return fail("Chave de idempotência obrigatória.", 422);
    const signature = JSON.stringify(body);
    const previous = db.attempts[key];
    if (previous) {
      if (previous.body !== signature)
        return fail("Chave já usada em outra tentativa.", 409);
      return HttpResponse.json(
        db.orders.find((o) => o.id === previous.orderId),
      );
    }
    const wallet = (db.wallets[owner] || []).find(
      (w) => w.id === body.walletId,
    );
    if (!wallet) return fail("Selecione uma carteira cadastrada.", 422);
    const connected = db.walletConnections?.[owner];
    if (
      !connected ||
      connected.walletId !== wallet.id ||
      connected.network !== body.network ||
      connected.type !== body.collector?.walletType
    )
      return fail("Conecte a carteira selecionada antes de confirmar.", 409);
    if (body.collector.walletAddress !== wallet.address)
      return fail(
        "O endereço da carteira não corresponde à carteira conectada.",
        422,
      );
    if (
      !body.collector?.name?.trim() ||
      !body.collector?.username?.trim() ||
      !/^\S+@\S+\.\S+$/.test(body.collector?.email || "") ||
      !body.collector?.profileName?.trim() ||
      !body.collector?.walletAddress?.trim() ||
      !body.collector?.walletType?.trim()
    )
      return fail(
        "Preencha os dados obrigatórios do colecionador e da carteira.",
        422,
      );
    const quote = quoteFor(db, owner, body.coupon, body.network);
    if (!quote.items.length) return fail("Carrinho vazio.", 422);
    if (quote.fingerprint !== body.fingerprint)
      return fail(
        "O preço ou a disponibilidade mudou. Revise a cotação.",
        409,
        "STALE_QUOTE",
      );
    const order: Order = {
      id: `KUR-${Math.floor(Date.now() / 1000)}`,
      userId: owner,
      status: "pending",
      quote: structuredClone(quote),
      createdAt: new Date().toISOString(),
      transaction: `0x${crypto.randomUUID().replaceAll("-", "")}`,
      version: 1,
      collector: structuredClone(body.collector),
      wallet: structuredClone(wallet),
    };
    db.orders.push(order);
    db.attempts[key] = { body: signature, orderId: order.id };
    save(db);
    setTimeout(async () => {
      const current = await database();
      const saved = current.orders.find((o) => o.id === order.id);
      if (saved && saved.status === "pending") {
        saved.status =
          localStorage.getItem("kurio-scenario") === "payment-declined"
            ? "declined"
            : "confirmed";
        saved.version++;
        if (saved.status === "confirmed") {
          const cart = current.carts[owner] || [];
          for (const item of saved.quote.items) {
            const row = cart.find((i) => i.nftId === item.nft.id);
            if (row) row.quantity -= item.quantity;
          }
          current.carts[owner] = cart.filter((i) => i.quantity > 0);
        }
        save(current);
        emitSocketEvent("order.updated", {
          id: saved.id,
          userId: owner,
          version: saved.version,
          resource: saved,
        });
      }
    }, 1000);
    if (localStorage.getItem("kurio-scenario") === "order-timeout") {
      await delay(1500);
      return HttpResponse.error();
    }
    return HttpResponse.json(order, { status: 201 });
  }),
  http.get("/api/orders/:id", async ({ request, params }) => {
    const db = await database();
    const owner = requireOwner(db, request);
    if (!owner) return fail("Entre para consultar o pedido.", 401);
    const order = db.orders.find(
      (o) => o.id === params.id && o.userId === owner,
    );
    return order
      ? HttpResponse.json(order)
      : fail("Pedido não encontrado.", 404);
  }),
  http.get("/api/orders/by-key/:key", async ({ request, params }) => {
    const db = await database();
    const owner = requireOwner(db, request);
    if (!owner) return fail("Entre para consultar o pedido.", 401);
    const attempt = db.attempts[String(params.key)];
    const order = db.orders.find(
      (o) => o.id === attempt?.orderId && o.userId === owner,
    );
    return order
      ? HttpResponse.json(order)
      : fail("Tentativa não encontrada.", 404);
  }),
  http.patch("/api/profile", async ({ request }) => {
    const db = await database();
    const owner = requireOwner(db, request);
    if (!owner) return fail("Entre para editar o perfil.", 401);
    const body = (await request.json()) as Partial<User>;
    if (body.email && !/^\S+@\S+\.\S+$/.test(body.email))
      return fail("E-mail inválido.", 422);
    if (body.name !== undefined && !body.name.trim())
      return fail("Informe o nome de exibição.", 422);
    if (body.username !== undefined && !body.username.trim())
      return fail("Informe o nome de usuário.", 422);
    if (
      db.accounts.some(
        (a) =>
          a.id !== owner &&
          ((body.email && a.email.toLowerCase() === body.email.toLowerCase()) ||
            (body.username &&
              a.username.toLowerCase() === body.username.toLowerCase())),
      )
    )
      return fail("E-mail ou nome de usuário já cadastrado.", 409);
    const account = db.accounts.find((a) => a.id === owner)!;
    Object.assign(account, {
      name: body.name?.trim() || account.name,
      username: body.username?.trim() || account.username,
      email: body.email?.trim() || account.email,
      ens: body.ens ?? account.ens,
      avatar: body.avatar ?? account.avatar,
    });
    save(db);
    return HttpResponse.json(publicUser(account));
  }),
  http.patch("/api/password", async ({ request }) => {
    const db = await database();
    const owner = requireOwner(db, request);
    if (!owner) return fail("Entre para alterar a senha.", 401);
    const body = (await request.json()) as { current: string; next: string };
    const account = db.accounts.find((a) => a.id === owner)!;
    if (account.passwordHash !== (await hashPassword(body.current)))
      return fail("Senha atual incorreta.", 422);
    if (body.next.length < 8)
      return fail("A nova senha precisa ter pelo menos 8 caracteres.", 422);
    account.passwordHash = await hashPassword(body.next);
    save(db);
    return HttpResponse.json({ ok: true });
  }),
  http.get("/api/wallets", async ({ request }) => {
    const db = await database();
    const owner = requireOwner(db, request);
    return owner
      ? HttpResponse.json(db.wallets[owner] || [])
      : fail("Entre para ver as carteiras.", 401);
  }),
  http.get("/api/wallet/connection", async ({ request }) => {
    await network();
    const db = await database();
    const owner = requireOwner(db, request);
    return owner
      ? HttpResponse.json(db.walletConnections?.[owner] || null)
      : fail("Entre para conectar a carteira.", 401);
  }),
  http.post("/api/wallet/connection", async ({ request }) => {
    await network();
    const db = await database();
    const owner = requireOwner(db, request);
    if (!owner) return fail("Entre para conectar a carteira.", 401);
    if (localStorage.getItem("kurio-scenario") === "wallet-declined")
      return fail("Conexão de carteira recusada.", 409);
    const input = (await request.json()) as {
      walletId: string;
      network: string;
      type: string;
    };
    const wallet = (db.wallets[owner] || []).find(
      (w) => w.id === input.walletId,
    );
    if (
      !wallet ||
      wallet.network !== input.network ||
      !["MetaMask", "WalletConnect", "Coinbase Wallet"].includes(input.type)
    )
      return fail("Carteira ou rede inválida.", 422);
    db.walletConnections ||= {};
    db.walletConnections[owner] = input;
    save(db);
    return HttpResponse.json(input);
  }),
  http.delete("/api/wallet/connection", async ({ request }) => {
    const db = await database();
    const owner = requireOwner(db, request);
    if (!owner) return fail("Entre para desconectar a carteira.", 401);
    delete db.walletConnections?.[owner];
    save(db);
    return HttpResponse.json({ ok: true });
  }),
  http.post("/api/wallets", async ({ request }) => {
    const db = await database();
    const owner = requireOwner(db, request);
    if (!owner) return fail("Entre para editar carteiras.", 401);
    const body = (await request.json()) as Partial<Wallet>;
    if (!body.label?.trim() || !/^0x[a-fA-F0-9]{40}$/.test(body.address || ""))
      return fail("Informe um nome e um endereço Ethereum válido.", 422);
    if (!body.displayName?.trim() || !body.profileName?.trim() || !/^\S+@\S+\.\S+$/.test(body.email || ""))
      return fail("Preencha nome de exibição, nome do perfil e e-mail válido.", 422);
    if (body.kind && !["MetaMask", "WalletConnect", "Coinbase Wallet"].includes(body.kind))
      return fail("Tipo de carteira inválido.", 422);
    const list = db.wallets[owner] || [];
    if (body.primary) list.forEach((w) => (w.primary = false));
    const index = list.findIndex((w) => w.id === body.id);
    const wallet: Wallet = {
      id: body.id || crypto.randomUUID(),
      label: body.label.trim(),
      address: body.address!,
      network: body.network || "Ethereum",
      primary: !!body.primary,
      displayName: body.displayName?.trim() || "",
      profileName: body.profileName?.trim() || "",
      email: body.email?.trim() || "",
      ens: body.ens?.trim() || "",
      kind: body.kind || "MetaMask",
      referral: body.referral?.trim() || "",
      secondaryAddress: body.secondaryAddress?.trim() || "",
    };
    if (index >= 0) list[index] = wallet;
    else list.push(wallet);
    db.wallets[owner] = list;
    save(db);
    return HttpResponse.json(list);
  }),
  http.post("/api/__reset", () => {
    variableRequest = 0;
    reset();
    return HttpResponse.json({ ok: true });
  }),
  http.post("/api/__scenario", async ({ request }) => {
    const body = (await request.json()) as { name: string };
    localStorage.setItem("kurio-scenario", body.name);
    return HttpResponse.json({ name: body.name });
  }),
  http.post("/api/__nft_update", async ({ request }) => {
    const body = (await request.json()) as {
      id: string;
      priceEth?: string;
      available?: number;
    };
    const db = await database();
    const nft = db.nfts.find((n) => n.id === body.id);
    if (!nft) return fail("NFT não encontrado.", 404);
    if (body.priceEth) nft.priceEth = body.priceEth;
    if (body.available !== undefined) nft.available = body.available;
    nft.version++;
    save(db);
    emitSocketEvent("nft.updated", {
      id: nft.id,
      version: nft.version,
      resource: nft,
    });
    return HttpResponse.json(nft);
  }),
  http.post("/api/__event", async ({ request }) => {
    const body = (await request.json()) as { name: string; payload: unknown };
    emitSocketEvent(body.name, body.payload);
    return HttpResponse.json({ ok: true });
  }),
];

