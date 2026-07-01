import { cn } from "@/lib/utils";

export function ConfidenceGauge({ value, size = 140 }: { value: number; size?: number }) {
  const v = Math.max(0, Math.min(100, value));
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  const color = v >= 85 ? "var(--success)" : v >= 70 ? "var(--primary)" : "var(--warning)";
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--border)" strokeWidth={8} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color as string} strokeWidth={8} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className={cn("font-display text-3xl font-semibold", v >= 85 ? "text-success" : v >= 70 ? "text-primary" : "text-warning")}>
            {v.toFixed(0)}%
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Confidence</div>
        </div>
      </div>
    </div>
  );
}
