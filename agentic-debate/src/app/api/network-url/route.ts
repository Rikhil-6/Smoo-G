import { networkInterfaces } from "os";
import { NextResponse } from "next/server";

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

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const lanAddress = getLanAddress();
  const port = requestUrl.port || "3000";

  const localUrl = `${requestUrl.protocol}//${requestUrl.host}`;
  const lanUrl = lanAddress ? `${requestUrl.protocol}//${lanAddress}:${port}` : null;

  return NextResponse.json({
    appUrl: configuredUrl || lanUrl || localUrl,
    localUrl,
    lanUrl,
  });
}
