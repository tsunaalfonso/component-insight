import type { ReactNode } from "react";

export function StatCard({ label, value, sub, icon, tone = "primary" }: { label: string; value: ReactNode; sub?: string; icon?: ReactNode; tone?: "primary" | "success" | "warning" | "destructive" }) {
  const toneClass = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    destructive: "text-destructive bg-destructive/10",
  }[tone];
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
        {icon && <div className={`grid h-8 w-8 place-items-center rounded-md ${toneClass}`}>{icon}</div>}
      </div>
      <div className="mt-3 font-display text-3xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
