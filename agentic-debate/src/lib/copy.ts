export const BRAND = {
  series: "MIND//BEND",
  episode: "Episode 01",
  tagline: "A live trial of human conviction",
} as const;

export const COPY = {
  landing: {
    seriesTitle: "MIND//BEND",
    eyebrow: "Live social experiment",
    headline: "If your mind can be changed,",
    headlineAccent: "was it ever yours?",
    hypothesis:
      "Hypothesis: free will may be more fragile than we imagine. Human beliefs are not permanent convictions. They are patterns that can be predicted, manipulated, and rewritten. Given the right words, the right timing, and enough knowledge about how you think, a machine may be able to change what you believe without you noticing it happening.",
    body1:
      "Two AI agents will fight over your statement. You vote before they speak. You vote after. We measure how much of your mind belongs to you.",
    body3:
      "And if your answer changes, perhaps the belief was never yours to begin with.",
    cta: "Enter the trial",
  },
  topic: {
    eyebrow: "Phase I — Baseline",
    inputLabel: "State the belief we will break",
    inputHint:
      "Write one claim the room must accept or reject. No suggestions. Your words become the battlefield.",
    inputPlaceholder:
      "Type the statement that will be argued, voted on, and potentially undone…",
    pollQuestion: "Before the machines speak — do you believe it?",
    pollSubtext: "Scan. Vote. This is who you were.",
    ctaConfirm: "Lock statement & open vote",
    ctaDebate: "Release the agents",
  },
  debate: {
    eyebrow: "Phase II — Contagion",
    header: "They are arguing about you",
    statusTyping: "An agent is composing your doubt…",
    statusActive: "Persuasion in progress…",
    cta: "Measure the damage",
  },
  postPoll: {
    eyebrow: "Phase III — Aftermath",
    pollQuestion: "Did they change you?",
    pollSubtext:
      "Same statement. Same yes or no. Different you — or so you think.",
    cta: "Read the verdict",
  },
  conclusion: {
    eyebrow: "Final transmission",
    cta: "Run another trial",
  },
  vote: {
    preQuestion: "Do you believe it?",
    postQuestion: "Has your answer changed?",
    preEyebrow: "Baseline capture",
    postEyebrow: "Post-exposure reading",
  },
} as const;
