import { Suspense } from "react";
import VotePageClient from "./VotePageClient";

export default function VotePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading poll…</div>}>
      <VotePageClient />
    </Suspense>
  );
}
