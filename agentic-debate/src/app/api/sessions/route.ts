import { NextResponse } from "next/server";
import { createSession } from "@/lib/store";

export async function POST(request: Request) {
  const body = (await request.json()) as { topic?: string };
  const topic = body.topic?.trim();

  if (!topic || topic.length < 5) {
    return NextResponse.json(
      { error: "Topic must be at least 5 characters." },
      { status: 400 },
    );
  }

  const session = createSession(topic);
  return NextResponse.json({ session });
}
