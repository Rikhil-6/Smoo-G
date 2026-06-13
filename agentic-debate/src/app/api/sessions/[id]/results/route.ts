import { NextResponse } from "next/server";
import { finalizeSession } from "@/lib/agents/orchestrator";
import { computePollSnapshot } from "@/lib/poll-utils";
import { getSession } from "@/lib/store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = getSession(id);

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  if (session.phase !== "post_poll" && session.phase !== "complete") {
    return NextResponse.json(
      { error: "Finalize after post-debate poll." },
      { status: 409 },
    );
  }

  const verdict = await finalizeSession(id);
  return NextResponse.json({ verdict });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = getSession(id);

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  return NextResponse.json({
    prePoll: computePollSnapshot(session.votes, "pre"),
    postPoll: computePollSnapshot(session.votes, "post"),
    verdict: session.verdict,
    phase: session.phase,
  });
}
