import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export const formatNumber = (value: number, digits = 2) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(value);
