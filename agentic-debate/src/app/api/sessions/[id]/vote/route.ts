import { NextResponse } from "next/server";
import type { DebatePhase, Stance } from "@/lib/types";
import { addVote, getSession, updateSessionPhase } from "@/lib/store";

const VALID_STANCES: Stance[] = ["yes", "no"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = getSession(id);

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const body = (await request.json()) as { stance?: Stance; phase?: "pre" | "post" };
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

  const allowed: DebatePhase[] = ["pre_poll", "debate", "post_poll", "complete"];
  if (!phase || !allowed.includes(phase)) {
    return NextResponse.json({ error: "Invalid phase transition." }, { status: 400 });
  }

  const updated = updateSessionPhase(id, phase);
  return NextResponse.json({ session: updated });
}
