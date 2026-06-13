import { NextResponse } from "next/server";
import { computePollSnapshot } from "@/lib/poll-utils";
import { getSession } from "@/lib/store";

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
    session,
    prePoll: computePollSnapshot(session.votes, "pre"),
    postPoll: computePollSnapshot(session.votes, "post"),
  });
}
