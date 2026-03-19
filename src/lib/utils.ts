import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalize an Instagram handle: strip URLs, @, whitespace.
 * Returns just the username or empty string.
 */
export function normalizeInstagramHandle(value: string | null | undefined): string {
  if (!value) return '';
  let handle = value.trim();
  const urlMatch = handle.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)\/?/);
  if (urlMatch) {
    handle = urlMatch[1];
  }
  handle = handle.replace(/^@/, '');
  handle = handle.split(/[?/#]/)[0];
  return handle;
}
