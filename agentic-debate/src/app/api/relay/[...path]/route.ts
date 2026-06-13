import { NextResponse } from "next/server";

function getBackendBaseUrl(): string | null {
  const value =
    process.env.BACKEND_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim();

  if (!value) return null;
  return value.replace(/\/+$/, "");
}

async function relay(request: Request, path: string[]) {
  const backendBaseUrl = getBackendBaseUrl();
  if (!backendBaseUrl) {
    return NextResponse.json(
      { error: "BACKEND_API_URL is not configured for relay mode." },
      { status: 503 },
    );
  }

  const requestUrl = new URL(request.url);
  const target = `${backendBaseUrl}/${path.join("/")}${requestUrl.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (!["GET", "HEAD"].includes(request.method)) {
    init.body = await request.text();
  }

  const response = await fetch(target, init);
  const text = await response.text();

  return new NextResponse(text, {
    status: response.status,
    headers: response.headers,
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return relay(request, path);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return relay(request, path);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return relay(request, path);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return relay(request, path);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return relay(request, path);
}

