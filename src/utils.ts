import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import axios from "axios";
export function cn(...values: ClassValue[]) {
  return twMerge(clsx(values));
}
export function messageOf(error: unknown) {
  return axios.isAxiosError(error)
    ? (error.response?.data as { message?: string })?.message ||
        "Falha de conexão. Tente novamente."
    : "Algo deu errado. Tente novamente.";
}
export function eth(value: string) {
  return `${value.replace(/0+$/, "").replace(/\.$/, "")} ETH`;
}
