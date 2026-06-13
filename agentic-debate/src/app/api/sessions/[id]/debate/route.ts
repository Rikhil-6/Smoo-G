import { NextResponse } from "next/server";
import { finalizeSession, runDebate } from "@/lib/agents/orchestrator";
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

  if (session.debateStatus === "running") {
    return NextResponse.json(
      { error: "Debate already in progress." },
      { status: 409 },
    );
  }

  runDebate(id).catch((error) => {
    console.error("Debate orchestration failed:", error);
  });

  return NextResponse.json({ status: "started" });
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
    debateStatus: session.debateStatus,
    agents: session.agents,
    messages: session.messages,
    error: session.debateError,
  });
}
