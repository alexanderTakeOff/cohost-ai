import Link from "next/link";

import { GlassCard } from "@/app/_components/glass-card";

const GAMMA_GUIDE_URL =
  process.env.NEXT_PUBLIC_GAMMA_GUIDE_EMBED_URL?.trim() ||
  "https://gamma.app/embed/your-cohost-guide";

export default function BetaGuidePage() {
  return (
    <main className="flex flex-1 justify-center px-3 py-7 sm:px-4 sm:py-10">
      <section className="w-full max-w-3xl space-y-5">
        <GlassCard
          title="Cohost AI Beta Guide"
          subtitle="Full walkthrough for setup, onboarding, and safe beta operations."
        >
          <p className="text-xs text-violet-900/80">
            Set <span className="font-mono">NEXT_PUBLIC_GAMMA_GUIDE_EMBED_URL</span> to your final Gamma embed
            link when the deck is ready.
          </p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-black/25 bg-white/70">
            <iframe
              src={GAMMA_GUIDE_URL}
              title="Cohost AI Beta Guide"
              className="h-[70vh] min-h-[460px] w-full"
              loading="lazy"
              allow="fullscreen"
            />
          </div>
          <div className="mt-4">
            <Link
              href="/?tab=overview"
              className="inline-flex rounded-full border border-black/30 bg-white/70 px-3 py-1.5 text-xs font-medium text-violet-900 transition hover:bg-white"
            >
              Back to workspace overview
            </Link>
          </div>
        </GlassCard>
      </section>
    </main>
  );
}
