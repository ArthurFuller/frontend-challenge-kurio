import Decimal from "decimal.js";
import type { CartItem, Nft, Order, Quote, User, Wallet } from "../types";

type Account = User & { passwordHash: string };
export type Database = {
  nfts: Nft[];
  accounts: Account[];
  sessions: Record<string, string>;
  favorites: Record<string, string[]>;
  carts: Record<string, CartItem[]>;
  wallets: Record<string, Wallet[]>;
  orders: Order[];
  attempts: Record<string, { body: string; orderId: string }>;
};
const KEY = "kurio-mock-db-v1";
const baseNfts: Nft[] = [
  {
    id: "emerald-ape-042",
    name: "Emerald Ape #042",
    image: "/images/emerald.png",
    priceEth: "1.19",
    edition: "1/50",
    available: 10,
    category: "Colecionável",
    creator: "Kurio",
    version: 1,
    description:
      "Um colecionável digital da coleção Kurio Editions, verificado na Ethereum.",
  },
  {
    id: "sage-nomad-009",
    name: "Sage Nomad #009",
    image: "/images/sage.png",
    priceEth: "1.69",
    edition: "1/10",
    available: 8,
    category: "Arte",
    creator: "Kurio",
    version: 1,
    description: "Um viajante entre universos digitais.",
  },
  {
    id: "ivory-baron-088",
    name: "Ivory Baron #088",
    image: "/images/ivory.png",
    priceEth: "1.79",
    edition: "1/10",
    available: 6,
    category: "Colecionável",
    creator: "Kurio",
    version: 1,
    description: "Uma peça rara da coleção Kurio Apes.",
  },
  {
    id: "golden-beat-207",
    name: "Golden Beat #207",
    image: "/images/golden.png",
    priceEth: "0.99",
    edition: "1/50",
    available: 15,
    category: "Arte",
    creator: "Kurio",
    version: 1,
    description: "O ritmo dourado de uma nova geração.",
  },
  {
    id: "cosmic-bloom-118",
    name: "Cosmic Bloom #118",
    image: "/images/sage.png",
    priceEth: "0.89",
    edition: "1/25",
    available: 4,
    category: "Arte",
    creator: "Kurio",
    version: 1,
    description: "Cores e formas de outro mundo.",
  },
  {
    id: "violet-nomad-314",
    name: "Violet Nomad #314",
    image: "/images/sage.png",
    priceEth: "1.39",
    edition: "1/10",
    available: 7,
    category: "Colecionável",
    creator: "Kurio",
    version: 1,
    description: "Explorador da coleção Nomad.",
  },
  {
    id: "golden-signal-216",
    name: "Golden Signal #216",
    image: "/images/golden.png",
    priceEth: "0.89",
    edition: "1/50",
    available: 18,
    category: "Arte",
    creator: "Kurio",
    version: 1,
    description: "Sintonize a próxima era.",
  },
  {
    id: "emerald-ape-842",
    name: "Emerald Ape #842",
    image: "/images/emerald.png",
    priceEth: "2.49",
    edition: "1/5",
    available: 2,
    category: "Colecionável",
    creator: "Kurio",
    version: 1,
    description: "Variação rara do Emerald Ape.",
  },
];
export async function hashPassword(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
export async function database(): Promise<Database> {
  const saved = localStorage.getItem(KEY);
  if (saved) {
    const db = JSON.parse(saved) as Database;
    let changed = false;
    for (const order of db.orders) {
      if (
        order.status !== "pending" ||
        Date.now() - new Date(order.createdAt).getTime() < 1200
      )
        continue;
      order.status =
        localStorage.getItem("kurio-scenario") === "payment-declined"
          ? "declined"
          : "confirmed";
      order.version++;
      if (order.status === "confirmed") {
        const cart = db.carts[order.userId] || [];
        for (const item of order.quote.items) {
          const row = cart.find((i) => i.nftId === item.nft.id);
          if (row) row.quantity -= item.quantity;
        }
        db.carts[order.userId] = cart.filter((i) => i.quantity > 0);
      }
      changed = true;
    }
    if (changed) save(db);
    return db;
  }
  const hash = await hashPassword("Kurio123!");
  const db: Database = {
    nfts: baseNfts,
    accounts: [
      {
        id: "u-ana",
        name: "Ana Silva",
        username: "ana",
        email: "ana@kurio.test",
        ens: "ana.kurio.eth",
        avatar: "",
        passwordHash: hash,
      },
      {
        id: "u-bruno",
        name: "Bruno Costa",
        username: "bruno",
        email: "bruno@kurio.test",
        ens: "bruno.kurio.eth",
        avatar: "",
        passwordHash: hash,
      },
    ],
    sessions: {},
    favorites: {},
    carts: { guest: [] },
    wallets: {
      "u-ana": [
        {
          id: "w-ana",
          label: "Principal",
          address: "0xA91F00000000000000000000000000000000E82C",
          network: "Ethereum",
          primary: true,
        },
      ],
      "u-bruno": [
        {
          id: "w-bruno",
          label: "Principal",
          address: "0xB19F0000000000000000000000000000000020AD",
          network: "Polygon",
          primary: true,
        },
      ],
    },
    orders: [],
    attempts: {},
  };
  save(db);
  return db;
}
export function save(db: Database) {
  localStorage.setItem(KEY, JSON.stringify(db));
}
export function reset() {
  localStorage.removeItem(KEY);
  localStorage.removeItem("kurio-token");
}
export function publicUser(account: Account): User {
  const { passwordHash: _passwordHash, ...user } = account;
  void _passwordHash;
  return user;
}
export function cartOwner(db: Database, token: string | null) {
  return (token && db.sessions[token]) || "guest";
}
export function quoteFor(db: Database, owner: string, coupon?: string): Quote {
  const cart = db.carts[owner] || [];
  const items = cart.map((row) => {
    const nft = db.nfts.find((n) => n.id === row.nftId)!;
    return {
      nft,
      quantity: row.quantity,
      lineEth: new Decimal(nft.priceEth).times(row.quantity).toFixed(3),
    };
  });
  const subtotal = items.reduce(
    (sum, row) => sum.plus(row.lineEth),
    new Decimal(0),
  );
  const code = coupon?.trim().toUpperCase() || null;
  const discount = code === "KURIO10" ? subtotal.times("0.1") : new Decimal(0);
  const fee = items.length ? new Decimal("0.016") : new Decimal(0);
  const total = subtotal.minus(discount).plus(fee);
  return {
    items,
    subtotalEth: subtotal.toFixed(3),
    discountEth: discount.toFixed(3),
    networkFeeEth: fee.toFixed(3),
    totalEth: total.toFixed(3),
    coupon: code,
    fingerprint: JSON.stringify({
      items: items.map((i) => [
        i.nft.id,
        i.nft.version,
        i.quantity,
        i.nft.priceEth,
      ]),
      code,
      total: total.toFixed(3),
    }),
  };
}
