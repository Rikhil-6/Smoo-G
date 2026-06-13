"use client";

import { COPY } from "@/lib/copy";
import { PrimaryButton, SlideShell } from "./SlideShell";

interface LandingSlideProps {
  onBegin: () => void;
}

export function LandingSlide({ onBegin }: LandingSlideProps) {
  return (
    <SlideShell
      slide={1}
      title="MIND//BEND"
      hideFooterBorder
      footer={
        <div className="flex justify-center">
          <PrimaryButton onClick={onBegin} ariaLabel={COPY.landing.cta}>
            {COPY.landing.cta}
          </PrimaryButton>
        </div>
      }
    >
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden text-center">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="animate-pulse-ring absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--blood)] blur-[100px] sm:h-[28rem] sm:w-[28rem]" />
        </div>

        <p className="font-display animate-fade-up text-sm font-bold tracking-tight text-[var(--ice)] sm:text-base">
          {COPY.landing.seriesTitle}
        </p>

        <p className="font-mono-label animate-fade-up mb-4 mt-3 text-[11px] font-medium uppercase tracking-[0.4em] text-[var(--blood)] sm:text-xs">
          {COPY.landing.eyebrow}
        </p>

        <h2 className="font-display animate-fade-up-delay-1 max-w-5xl text-[2.5rem] font-bold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
          <span className="block text-[var(--ice)]">{COPY.landing.headline}</span>
          <span className="animate-glitch mt-1 block text-gradient-blood animate-shimmer sm:mt-2">
            {COPY.landing.headlineAccent}
          </span>
        </h2>

        <p className="animate-fade-up-delay-2 mx-auto mt-8 max-w-2xl border-l-2 border-[var(--blood)] pl-5 text-left text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base lg:text-lg">
          <span className="font-mono-label mb-2 block text-xs uppercase tracking-widest text-[var(--blood)]">
            Hypothesis
          </span>
          {COPY.landing.hypothesis}
        </p>

        <div className="animate-fade-up-delay-3 mx-auto mt-6 max-w-xl space-y-4 text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
          <p>{COPY.landing.body1}</p>
          <p>{COPY.landing.body3}</p>
        </div>
      </div>
    </SlideShell>
  );
}
