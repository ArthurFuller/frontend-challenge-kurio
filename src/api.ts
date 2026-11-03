import axios from "axios";
import type { CartItem, Nft, Order, Quote, User, Wallet } from "./types";

export const http = axios.create({ baseURL: "/api", timeout: 10000 });
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("kurio-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !["/login", "/signup"].includes(error.config?.url || "") &&
      localStorage.getItem("kurio-token")
    ) {
      localStorage.removeItem("kurio-token");
      window.dispatchEvent(new Event("kurio-session-expired"));
    }
    return Promise.reject(error);
  },
);

export const api = {
  session: () => http.get<User>("/session").then((r) => r.data),
  login: (input: { email: string; password: string }) =>
    http
      .post<{ token: string; user: User }>("/login", input)
      .then((r) => r.data),
  signup: (input: {
    name: string;
    username: string;
    email: string;
    password: string;
  }) =>
    http
      .post<{ token: string; user: User }>("/signup", input)
      .then((r) => r.data),
  logout: () => http.post("/logout").then((r) => r.data),
  nfts: (
    params: Record<string, string | number | undefined>,
    signal?: AbortSignal,
  ) =>
    http
      .get<{ items: Nft[]; total: number; pages: number }>("/nfts", {
        params,
        signal,
      })
      .then((r) => r.data),
  nft: (id: string) => http.get<Nft>(`/nfts/${id}`).then((r) => r.data),
  favorites: () => http.get<string[]>("/favorites").then((r) => r.data),
  favorite: (id: string, active: boolean) =>
    http[active ? "put" : "delete"](`/favorites/${id}`).then((r) => r.data),
  cart: () => http.get<CartItem[]>("/cart").then((r) => r.data),
  cartSet: (nftId: string, quantity: number) =>
    http.put<CartItem[]>("/cart", { nftId, quantity }).then((r) => r.data),
  quote: (coupon?: string, network?: string) =>
    http.post<Quote>("/quote", { coupon, network }).then((r) => r.data),
  order: (input: {
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
  }) =>
    http
      .post<Order>("/orders", input, {
        headers: { "Idempotency-Key": input.key },
      })
      .then((r) => r.data),
  orderById: (id: string) =>
    http.get<Order>(`/orders/${id}`).then((r) => r.data),
  orderByKey: (key: string) =>
    http.get<Order>(`/orders/by-key/${key}`).then((r) => r.data),
  profile: (input: Partial<User>) =>
    http.patch<User>("/profile", input).then((r) => r.data),
  password: (input: { current: string; next: string }) =>
    http.patch("/password", input).then((r) => r.data),
  wallets: () => http.get<Wallet[]>("/wallets").then((r) => r.data),
  walletConnection: () =>
    http
      .get<{ walletId: string; network: string; type: string } | null>(
        "/wallet/connection",
      )
      .then((r) => r.data),
  walletConnect: (input: { walletId: string; network: string; type: string }) =>
    http
      .post<{ walletId: string; network: string; type: string }>(
        "/wallet/connection",
        input,
      )
      .then((r) => r.data),
  walletDisconnect: () => http.delete("/wallet/connection").then((r) => r.data),
  walletSave: (input: Partial<Wallet>) =>
    http.post<Wallet[]>("/wallets", input).then((r) => r.data),
};

