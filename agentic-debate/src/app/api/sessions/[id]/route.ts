import { NextResponse } from "next/server";
import { computePollSnapshot } from "@/lib/poll-utils";
import { finalizeSession, runDebate } from "@/lib/agents/orchestrator";
import type { DebatePhase, Stance } from "@/lib/types";
import {
  addVote,
  getSession,
  updateSessionPhase,
} from "@/lib/store";

const VALID_STANCES: Stance[] = ["yes", "no"];
const VALID_PHASES: DebatePhase[] = ["pre_poll", "debate", "post_poll", "complete"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = getSession(id);
  const view = new URL(request.url).searchParams.get("view");

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  if (view === "debate") {
    return NextResponse.json({
      debateStatus: session.debateStatus,
      agents: session.agents,
      messages: session.messages,
      error: session.debateError,
    });
  }

  if (view === "results") {
    return NextResponse.json({
      prePoll: computePollSnapshot(session.votes, "pre"),
      postPoll: computePollSnapshot(session.votes, "post"),
      verdict: session.verdict,
      phase: session.phase,
    });
  }

  return NextResponse.json({
    session,
    prePoll: computePollSnapshot(session.votes, "pre"),
    postPoll: computePollSnapshot(session.votes, "post"),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = getSession(id);

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const body = (await request.json()) as {
    action?: "vote" | "debate" | "results";
    stance?: Stance;
    phase?: "pre" | "post";
  };

  if (body.action === "debate") {
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

  if (body.action === "results") {
    if (session.phase !== "post_poll" && session.phase !== "complete") {
      return NextResponse.json(
        { error: "Finalize after post-debate poll." },
        { status: 409 },
      );
    }
    const verdict = await finalizeSession(id);
    return NextResponse.json({ verdict });
  }

  if (body.action === "vote") {
    const stance = body.stance;
    const phase = body.phase;

    if (!stance || !VALID_STANCES.includes(stance)) {
      return NextResponse.json({ error: "Invalid vote." }, { status: 400 });
    }

    if (phase !== "pre" && phase !== "post") {
      return NextResponse.json({ error: "Invalid phase." }, { status: 400 });
    }

    if (phase === "pre" && session.phase !== "pre_poll") {
      return NextResponse.json(
        { error: "Pre-debate voting is not open." },
        { status: 409 },
      );
    }

    if (phase === "post" && session.phase !== "post_poll") {
      return NextResponse.json(
        { error: "Post-debate voting is not open." },
        { status: 409 },
      );
    }

    const vote = addVote(id, stance, phase);
    return NextResponse.json({ vote });
  }

  return NextResponse.json(
    { error: "Invalid action. Use vote, debate, or results." },
    { status: 400 },
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = getSession(id);

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const body = (await request.json()) as { phase?: DebatePhase };
  const phase = body.phase;

  if (!phase || !VALID_PHASES.includes(phase)) {
    return NextResponse.json({ error: "Invalid phase transition." }, { status: 400 });
  }

  const updated = updateSessionPhase(id, phase);
  return NextResponse.json({ session: updated });
}
