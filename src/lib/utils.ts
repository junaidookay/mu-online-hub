import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeExternalUrl(raw: string | null | undefined) {
  const value = raw?.trim().replace(/^['"`]+|['"`]+$/g, '');
  if (!value) return null;

  const normalized = value
    .replace(/^https?\/\//i, (match) => (match.toLowerCase().startsWith('https') ? 'https://' : 'http://'))
    .replace(/^(https?):\/(?!\/)/i, '$1://')
    .replace(/^\/\//, 'https://')
    .replace(/^(https?:\/\/)https?:?\/\/+/i, '$1');

  if (/^(mailto:|tel:)/i.test(normalized)) return normalized;

  if (/^https?:\/\//i.test(normalized)) {
    try {
      return new URL(normalized).toString();
    } catch {
      return null;
    }
  }

  if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/i.test(normalized)) {
    try {
      return new URL(`https://${normalized}`).toString();
    } catch {
      return null;
    }
  }

  return null;
}
