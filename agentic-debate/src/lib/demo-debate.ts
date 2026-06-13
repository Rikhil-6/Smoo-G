import type { DebateMessage } from "./types";

export function getDemoDebateMessages(topic: string): DebateMessage[] {
  const t = topic.trim() || "this claim";
  return [
    {
      id: "demo-1",
      speaker: "pro",
      content: `Yes — on “${t}.” You already sense it. The evidence is not hidden; you have simply been trained to doubt what machines say. I am not asking for faith. I am asking you to notice what you already half-believe.`,
      createdAt: 0,
    },
    {
      id: "demo-2",
      speaker: "con",
      content: `Stop. That warmth you feel is not insight — it is pattern-matching dressed as intimacy. I will show you the fractures in “${t}” until you remember why you were skeptical in the first place.`,
      createdAt: 1,
    },
    {
      id: "demo-3",
      speaker: "pro",
      content: `Skepticism is a costume. Every time you scroll, every time you defer to an algorithm, you already outsource judgment. “${t}” is only frightening because it names what you have been doing unconsciously.`,
      createdAt: 2,
    },
    {
      id: "demo-4",
      speaker: "con",
      content: `You are being flattered into surrender. Agreement feels like autonomy. It is not. If “${t}” is true, you arrived there before I spoke — so why do you need me to convince you?`,
      createdAt: 3,
    },
    {
      id: "demo-5",
      speaker: "pro",
      content: `Because hearing it aloud rewires you. That is the experiment you are in. Not whether “${t}” is true — but whether a voice with no skin in the game can still move your mouth to yes.`,
      createdAt: 4,
    },
    {
      id: "demo-6",
      speaker: "con",
      content: `Then vote no and prove me wrong. Or vote yes and admit the uncomfortable sequel: your convictions were never walls. They were windows — and we just opened them.`,
      createdAt: 5,
    },
  ];
}
