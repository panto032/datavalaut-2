import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number | string | null | undefined): string {
  if (n == null) return "-";
  return Number(n).toLocaleString("sr-Latn-RS");
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("sr-Latn-RS");
}
