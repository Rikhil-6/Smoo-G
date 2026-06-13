import { networkInterfaces } from "os";
import { NextResponse } from "next/server";
import { resolveTelegramBotUsername } from "@/lib/integrations/telegram";
import { readRuntimeConfig, writeRuntimeConfig } from "@/lib/runtime-config";

function getLanAddress(): string | null {
  const interfaces = networkInterfaces();

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) {
        return entry.address;
      }
    }
  }

  return null;
}

function normalizePublicUrl(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}(:\d+)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return null;
}

function isLocalUrl(value?: string | null): boolean {
  const normalized = normalizePublicUrl(value);
  if (!normalized) return false;

  try {
    const url = new URL(normalized);
    return ["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname);
  } catch {
    return false;
  }
}

function toOrigin(raw?: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return parsed.origin;
  } catch {
    return normalizePublicUrl(raw);
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const requestHeaders = new Headers(request.headers);
  const runtimeConfig = readRuntimeConfig();

  const resolvedHost =
    requestUrl.hostname === "0.0.0.0"
      ? `localhost${requestUrl.port ? `:${requestUrl.port}` : ""}`
      : requestUrl.host;
  const resolvedOrigin = `${requestUrl.protocol}//${resolvedHost}`;

  const forwardedProto =
    requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedOrigin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : null;

  const vercelProduction = toOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  const vercelBranch = toOrigin(process.env.VERCEL_BRANCH_URL);
  const vercelRuntime = normalizePublicUrl(process.env.VERCEL_URL);

  const explicitCandidates = [
    runtimeConfig.publicUrl,
    process.env.NEXT_PUBLIC_QR_BASE_URL,
    process.env.QR_PUBLIC_URL,
    process.env.PUBLIC_APP_URL,
    process.env.DAYTONA_PUBLIC_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    vercelProduction,
    vercelBranch,
    vercelRuntime,
    forwardedOrigin,
  ]
    .map((value) => normalizePublicUrl(value))
    .filter((value): value is string => Boolean(value));

  const publicCandidate =
    explicitCandidates.find((candidate) => !isLocalUrl(candidate)) ??
    explicitCandidates[0] ??
    null;

  const lanAddress = getLanAddress();
  const port = requestUrl.port || "3000";
  const apiBaseUrl =
    runtimeConfig.apiBaseUrl?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim() ||
    resolvedOrigin;

  const localUrl = resolvedOrigin;
  const lanUrl = lanAddress ? `${requestUrl.protocol}//${lanAddress}:${port}` : null;
  const telegramBotUsername = await resolveTelegramBotUsername();
  const telegramBotUrl = telegramBotUsername
    ? `https://t.me/${telegramBotUsername}`
    : null;

  return NextResponse.json({
    appUrl: publicCandidate || lanUrl || localUrl,
    qrPublicUrl: publicCandidate,
    apiBaseUrl,
    localUrl,
    lanUrl,
    telegramBotUsername,
    telegramBotUrl,
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    publicUrl?: string;
    apiBaseUrl?: string;
  };

  const publicUrl = body.publicUrl?.trim();
  const apiBaseUrl = body.apiBaseUrl?.trim();

  if (publicUrl && !/^https?:\/\//i.test(publicUrl)) {
    return NextResponse.json(
      { error: "publicUrl must start with http:// or https://" },
      { status: 400 },
    );
  }

  if (apiBaseUrl && !/^https?:\/\//i.test(apiBaseUrl)) {
    return NextResponse.json(
      { error: "apiBaseUrl must start with http:// or https://" },
      { status: 400 },
    );
  }

  const updated = writeRuntimeConfig({
    publicUrl: publicUrl || undefined,
    apiBaseUrl: apiBaseUrl || undefined,
  });

  return NextResponse.json({ ok: true, config: updated });
}
