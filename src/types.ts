export type Nft = {
  id: string;
  name: string;
  image: string;
  priceEth: string;
  edition: string;
  available: number;
  category: "Arte" | "Colecionável";
  creator: string;
  version: number;
  description: string;
};
export type User = {
  id: string;
  name: string;
  username: string;
  email: string;
  ens: string;
  avatar: string;
};
export type Wallet = {
  id: string;
  label: string;
  address: string;
  network: string;
  primary: boolean;
};
export type CartItem = { nftId: string; quantity: number };
export type Quote = {
  items: Array<{ nft: Nft; quantity: number; lineEth: string }>;
  subtotalEth: string;
  discountEth: string;
  networkFeeEth: string;
  totalEth: string;
  coupon: string | null;
  fingerprint: string;
};
export type Order = {
  id: string;
  userId: string;
  status: "pending" | "confirmed" | "declined";
  quote: Quote;
  createdAt: string;
  transaction: string;
  version: number;
};
export type ApiError = { message: string; code?: string };
