import Link from "next/link";

const GAMMA_GUIDE_URL =
  process.env.NEXT_PUBLIC_GAMMA_GUIDE_EMBED_URL?.trim() ||
  "https://gamma.app/embed/your-cohost-guide";

export default function BetaGuidePage() {
  return (
    <main className="flex min-h-screen flex-1 flex-col px-2 py-2 sm:px-3 sm:py-3">
      <section className="glass-surface flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl p-2 sm:p-3">
        <iframe
          src={GAMMA_GUIDE_URL}
          title="Cohost AI Beta Guide"
          className="h-[calc(100vh-5.5rem)] min-h-[540px] w-full flex-1 rounded-xl border border-slate-500/35 bg-slate-100/70"
          loading="lazy"
          allow="fullscreen"
        />
        <Link
          href="/?tab=overview"
          className="accent-link mt-2 inline text-xs font-medium"
        >
          Back to workspace overview
        </Link>
      </section>
    </main>
  );
}
