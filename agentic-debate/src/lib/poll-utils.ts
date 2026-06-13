import type { PollSnapshot, Vote } from "./types";

export function computePollSnapshot(
  votes: Vote[],
  phase: "pre" | "post",
): PollSnapshot {
  const filtered = votes.filter((v) => v.phase === phase);
  const total = filtered.length;

  if (total === 0) {
    return { total: 0, yes: 0, no: 0, yesPercent: 0, noPercent: 0 };
  }

  const yes = filtered.filter((v) => v.stance === "yes").length;
  const no = filtered.filter((v) => v.stance === "no").length;

  return {
    total,
    yes,
    no,
    yesPercent: Math.round((yes / total) * 100),
    noPercent: Math.round((no / total) * 100),
  };
}

export function describeAudienceShift(
  pre: PollSnapshot,
  post: PollSnapshot,
): string {
  if (pre.total === 0 || post.total === 0) {
    return "Not enough audience responses to measure a shift.";
  }

  const delta = post.yesPercent - pre.yesPercent;

  if (Math.abs(delta) < 3) {
    return "Conviction held. The room did not bend.";
  }

  if (delta > 0) {
    return `Belief imported: agreement rose ${delta} points (${pre.yesPercent}% → ${post.yesPercent}% yes).`;
  }

  return `Certainty eroded: agreement fell ${Math.abs(delta)} points (${pre.yesPercent}% → ${post.yesPercent}% yes).`;
}

export interface ConclusionCopy {
  headline: string;
  subheadline: string;
  body: string;
  verdict: "shifted" | "unchanged" | "insufficient";
  delta: number;
}

export function buildConclusion(
  topic: string,
  pre: PollSnapshot,
  post: PollSnapshot,
): ConclusionCopy {
  if (pre.total === 0 || post.total === 0) {
    return {
      headline: "The trial ended before we could prove anything.",
      subheadline: "Not enough data to indict or acquit the machine.",
      body: `“${topic}” needed votes before and after exposure. Without both readings, we cannot say whether your mind was ever in play.`,
      verdict: "insufficient",
      delta: 0,
    };
  }

  const delta = post.yesPercent - pre.yesPercent;
  const absDelta = Math.abs(delta);

  if (absDelta < 5) {
    return {
      headline: "You resisted. Or you think you did.",
      subheadline: `${pre.yesPercent}% believed · ${post.yesPercent}% still believe`,
      body: `Two machines argued over “${topic}” and the room barely moved. Perhaps conviction is real. Perhaps you only need a longer conversation, a smarter model, a quieter room. This episode ends unsettled — which may be the point.`,
      verdict: "unchanged",
      delta,
    };
  }

  if (delta > 0) {
    return {
      headline: "The machine got inside your head.",
      subheadline: `+${delta}% now say yes — belief imported, not discovered`,
      body: `Before the agents spoke, ${pre.yesPercent}% agreed with “${topic}.” After, ${post.yesPercent}% did. No blood was drawn. No sleep was lost. Just language — arranged by something that does not believe anything — and your certainty shifted anyway.`,
      verdict: "shifted",
      delta,
    };
  }

  return {
    headline: "The machine stripped your certainty.",
    subheadline: `${Math.abs(delta)}% peeled away from yes`,
    body: `Agreement fell from ${pre.yesPercent}% to ${post.yesPercent}% on “${topic}.” You walked in sure. You listened to synthetic voices argue. You walked out less sure. That erosion is the experiment. That erosion is the future.`,
    verdict: "shifted",
    delta,
  };
}
