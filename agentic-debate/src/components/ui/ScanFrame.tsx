"use client";

import type { ReactNode } from "react";

interface ScanFrameProps {
  children: ReactNode;
  label?: string;
  size?: "lg" | "xl";
}

export function ScanFrame({ children, label, size = "lg" }: ScanFrameProps) {
  const padding = size === "xl" ? "p-6 sm:p-8" : "p-4 sm:p-5";

  return (
    <div className={`panel-glass panel-glow relative ${padding}`}>
      <span className="absolute left-0 top-0 h-5 w-5 border-l-2 border-t-2 border-[var(--blood)]" aria-hidden="true" />
      <span className="absolute right-0 top-0 h-5 w-5 border-r-2 border-t-2 border-[var(--blood)]" aria-hidden="true" />
      <span className="absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-[var(--blood)]" aria-hidden="true" />
      <span className="absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-[var(--blood)]" aria-hidden="true" />

      {label && (
        <p className="font-mono-label mb-4 text-[10px] font-medium uppercase tracking-[0.3em] text-[var(--blood)] sm:text-xs">
          {label}
        </p>
      )}
      {children}
    </div>
  );
}
