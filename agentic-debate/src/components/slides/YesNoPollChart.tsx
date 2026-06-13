"use client";

import type { PollSnapshot } from "@/lib/types";

interface YesNoPollChartProps {
  title: string;
  poll: PollSnapshot;
  live?: boolean;
  compact?: boolean;
  variant?: "default" | "dramatic";
}

export function YesNoPollChart({
  title,
  poll,
  live,
  compact,
  variant = "default",
}: YesNoPollChartProps) {
  const isDramatic = variant === "dramatic";

  return (
    <div
      className={`panel-glass panel-glow flex h-full flex-col ${
        isDramatic ? "p-6 sm:p-8" : compact ? "p-4" : "p-5"
      }`}
      aria-live={live ? "polite" : "off"}
      aria-atomic="true"
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3
            className={`font-display font-bold text-[var(--ice)] ${
              isDramatic ? "text-xl sm:text-2xl" : compact ? "text-sm" : "text-base"
            }`}
          >
            {title}
          </h3>
          {live && (
            <span className="font-mono-label mt-1 flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--blood)]">
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--blood)] animate-pulse-live" />
              Live feed
            </span>
          )}
        </div>
        <span className="font-mono-label shrink-0 border border-white/10 px-3 py-1 text-xs tabular-nums text-[var(--text-muted)]">
          n={poll.total}
        </span>
      </div>

      {poll.total === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="font-display text-4xl font-bold text-white/10 sm:text-6xl">—</p>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Waiting for the first confession…
          </p>
        </div>
      ) : (
        <div className={`flex flex-1 flex-col justify-center ${isDramatic ? "gap-8" : "gap-4"}`}>
          <DramaticBar
            label="Yes"
            value={poll.yesPercent}
            count={poll.yes}
            color="var(--yes)"
            glow="var(--yes-glow)"
            large={isDramatic}
          />
          <DramaticBar
            label="No"
            value={poll.noPercent}
            count={poll.no}
            color="var(--no)"
            glow="var(--no-glow)"
            large={isDramatic}
          />
        </div>
      )}
    </div>
  );
}

function DramaticBar({
  label,
  value,
  count,
  color,
  glow,
  large,
}: {
  label: string;
  value: number;
  count: number;
  color: string;
  glow: string;
  large?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-end justify-between">
        <span
          className={`font-display font-bold uppercase tracking-wide ${
            large ? "text-lg sm:text-xl" : "text-sm"
          }`}
          style={{ color }}
        >
          {label}
        </span>
        <div className="text-right">
          <span
            className={`font-display font-black tabular-nums ${
              large ? "text-4xl sm:text-5xl" : "text-2xl"
            }`}
            style={{ color }}
          >
            {value}%
          </span>
          <span className="font-mono-label ml-2 text-xs text-[var(--text-muted)]">
            ({count})
          </span>
        </div>
      </div>
      <div
        className={`overflow-hidden bg-white/[0.06] ${large ? "h-5 sm:h-6" : "h-3"}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${value} percent`}
      >
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{
            width: `${value}%`,
            backgroundColor: color,
            boxShadow: `0 0 24px ${glow}`,
          }}
        />
      </div>
    </div>
  );
}
