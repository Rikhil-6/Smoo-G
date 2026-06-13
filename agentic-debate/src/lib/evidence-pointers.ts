import type { DebateMessage } from "./types";

export interface EvidencePointer {
  url: string;
  label: string;
  host: string;
}

const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
const RAW_URL_PATTERN = /https?:\/\/[^\s)]+/g;

function normalizeUrl(raw: string): string {
  return raw.replace(/[),.;]+$/g, "").trim();
}

function labelFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = parsed.pathname === "/" ? "" : parsed.pathname.slice(0, 28);
    return `${host}${path ? ` ${path}...` : ""}`;
  } catch {
    return "Source";
  }
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

function uniquePointers(pointers: EvidencePointer[]): EvidencePointer[] {
  const seen = new Set<string>();
  return pointers.filter((pointer) => {
    const normalized = normalizeUrl(pointer.url);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export function pointersFromContent(content: string): EvidencePointer[] {
  const pointers: EvidencePointer[] = [];

  for (const match of content.matchAll(MARKDOWN_LINK_PATTERN)) {
    const label = match[1]?.trim();
    const url = normalizeUrl(match[2] ?? "");
    if (!url) continue;
    pointers.push({
      url,
      label: label || labelFromUrl(url),
      host: hostFromUrl(url),
    });
  }

  for (const match of content.matchAll(RAW_URL_PATTERN)) {
    const url = normalizeUrl(match[0] ?? "");
    if (!url) continue;
    pointers.push({
      url,
      label: labelFromUrl(url),
      host: hostFromUrl(url),
    });
  }

  return uniquePointers(pointers);
}

export function pointersFromMessage(message: DebateMessage): EvidencePointer[] {
  const fromContent = pointersFromContent(message.content);
  const fromSources = (message.sources ?? []).map((url) => {
    const normalized = normalizeUrl(url);
    return {
      url: normalized,
      label: labelFromUrl(normalized),
      host: hostFromUrl(normalized),
    };
  });
  return uniquePointers([...fromContent, ...fromSources]);
}

export function pointersFromMessages(messages: DebateMessage[]): EvidencePointer[] {
  return uniquePointers(messages.flatMap((message) => pointersFromMessage(message)));
}
