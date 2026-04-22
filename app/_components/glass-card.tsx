import type { ReactNode } from "react";

type GlassCardProps = {
  title?: string;
  subtitle?: string;
  className?: string;
  children: ReactNode;
};

export function GlassCard({ title, subtitle, className, children }: GlassCardProps) {
  return (
    <section className={`glass-surface p-5 ${className ?? ""}`.trim()}>
      {title ? <h3 className="text-sm font-semibold text-slate-100">{title}</h3> : null}
      {subtitle ? <p className="mt-1 text-xs text-slate-300">{subtitle}</p> : null}
      <div className={title || subtitle ? "mt-4" : ""}>{children}</div>
    </section>
  );
}
