"use client";

function trimSlash(input: string): string {
  return input.replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  const mode = process.env.NEXT_PUBLIC_API_MODE?.trim().toLowerCase();
  if (mode === "relay") {
    return "/api/relay";
  }

  const configured =
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim();

  if (configured) {
    return trimSlash(configured);
  }

  if (typeof window !== "undefined") {
    return trimSlash(window.location.origin);
  }

  return "";
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  if (!base) return path;
  if (base.startsWith("/")) return `${base}${path}`;
  return `${base}${path}`;
}
