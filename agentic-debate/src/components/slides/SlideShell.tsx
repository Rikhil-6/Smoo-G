"use client";

import type { ReactNode } from "react";
import type { SlideIndex } from "@/lib/types";

interface SlideShellProps {
  slide: SlideIndex;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  hideFooterBorder?: boolean;
}

export function SlideShell({
  slide,
  title,
  children,
  footer,
  hideFooterBorder,
}: SlideShellProps) {
  return (
    <section
      className="relative flex h-dvh w-full flex-col overflow-hidden bg-[var(--bg-deep)]"
      aria-labelledby={`slide-title-${slide}`}
      aria-current="step"
    >
      <div
        className="pointer-events-none absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-[var(--blood-glow)] blur-[120px]"
        aria-hidden="true"
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-5 py-5 sm:px-10 sm:py-6">
        <h1 id={`slide-title-${slide}`} className="sr-only">
          {title}
        </h1>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>

      {footer && (
        <footer
          className={`relative z-10 shrink-0 px-5 py-4 sm:px-10 ${
            hideFooterBorder
              ? "bg-transparent"
              : "border-t border-white/[0.06] bg-[var(--bg-deep)]/80 backdrop-blur-sm"
          }`}
        >
          {footer}
        </footer>
      )}
    </section>
  );
}

interface PrimaryButtonProps {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  variant?: "primary" | "ghost";
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  ariaLabel,
  variant = "primary",
}: PrimaryButtonProps) {
  const styles =
    variant === "primary"
      ? "bg-[var(--blood)] text-white hover:bg-[var(--signal-dim)] shadow-[0_0_32px_var(--blood-glow)]"
      : "border border-white/15 bg-transparent text-[var(--text-secondary)] hover:border-white/30 hover:text-white";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`font-display min-h-12 w-full px-8 py-3.5 text-sm font-bold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-14 sm:w-auto sm:min-w-[220px] sm:text-base ${styles}`}
    >
      {children}
    </button>
  );
}
