import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { StatCard } from "@/components/StatCard";
import { Activity, CheckCircle2, AlertOctagon, Clock, Gauge, Cpu } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from "recharts";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { isAdmin, user } = useAuth();

  const q = useSuspenseQuery({
    queryKey: ["dashboard", user?.id, isAdmin],
    queryFn: async () => {
      let query = supabase.from("diagnoses").select("id, status, confidence, created_at, component_name").order("created_at", { ascending: false });
      if (!isAdmin && user) query = query.eq("user_id", user.id);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = q.data;
  const now = new Date();
  const today = rows.filter((r) => new Date(r.created_at).toDateString() === now.toDateString()).length;
  const healthy = rows.filter((r) => r.status === "healthy").length;
  const defective = rows.filter((r) => r.status === "defective" || r.status === "severe").length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const confidences = rows.map((r) => Number(r.confidence)).filter((v) => !isNaN(v));
  const avgConf = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;

  // Weekly stats
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = d.toDateString();
    const dayRows = rows.filter((r) => new Date(r.created_at).toDateString() === key);
    return {
      day: format(d, "EEE"),
      healthy: dayRows.filter((r) => r.status === "healthy").length,
      defective: dayRows.filter((r) => r.status === "defective" || r.status === "severe").length,
    };
  });

  const confidenceTrend = rows.slice(0, 20).reverse().map((r, i) => ({ i: i + 1, conf: Number(r.confidence) || 0 }));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Instrument overview</div>
        <h1 className="mt-1 font-display text-3xl font-semibold">Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total diagnoses" value={rows.length} icon={<Cpu className="h-4 w-4" />} />
        <StatCard label="Today" value={today} icon={<Clock className="h-4 w-4" />} sub={format(now, "EEE, MMM d")} />
        <StatCard label="Healthy" value={healthy} tone="success" icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard label="Defective" value={defective} tone="destructive" icon={<AlertOctagon className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Pending" value={pending} tone="warning" icon={<Activity className="h-4 w-4" />} />
        <StatCard label="Avg. AI confidence" value={`${avgConf.toFixed(1)}%`} tone={avgConf >= 85 ? "success" : avgConf >= 70 ? "primary" : "warning"} icon={<Gauge className="h-4 w-4" />} />
        <StatCard label="Repair queue" value={defective + pending} icon={<AlertOctagon className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Weekly diagnoses</div>
              <div className="font-display text-lg font-semibold">Last 7 days</div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={weekData}>
                <CartesianGrid stroke="var(--grid-line)" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="healthy" stackId="a" fill="var(--success)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="defective" stackId="a" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-5">
          <div className="mb-2">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Confidence trend</div>
            <div className="font-display text-lg font-semibold">Recent analyses</div>
          </div>
          <div className="h-64">
            {confidenceTrend.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">No data yet</div>
            ) : (
              <ResponsiveContainer>
                <LineChart data={confidenceTrend}>
                  <CartesianGrid stroke="var(--grid-line)" strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="i" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="conf" stroke="var(--primary)" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="flex items-center justify-between p-5">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Log</div>
            <div className="font-display text-lg font-semibold">Recent diagnoses</div>
          </div>
          <Link to="/history" className="text-xs font-medium text-primary hover:underline">View all →</Link>
        </div>
        <div className="border-t border-border/60">
          {rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No diagnoses recorded yet. Head to <span className="font-medium text-foreground">AI Diagnosis</span> to start.</div>
          ) : (
            <div className="divide-y divide-border/60">
              {rows.slice(0, 8).map((r) => (
                <Link key={r.id} to="/diagnosis/$id" params={{ id: r.id }} className="flex items-center justify-between px-5 py-3 hover:bg-muted/40">
                  <div className="flex items-center gap-3">
                    <StatusDot status={r.status} />
                    <div>
                      <div className="text-sm font-medium">{r.component_name || "Unknown IC"}</div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{format(new Date(r.created_at), "MMM d, HH:mm")}</div>
                    </div>
                  </div>
                  <div className="font-mono text-xs tabular-nums text-muted-foreground">{r.confidence ?? "—"}%</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const c = status === "healthy" ? "text-success" : status === "severe" ? "text-destructive" : status === "defective" ? "text-warning" : "text-muted-foreground";
  return <span className={`led ${c}`} />;
}
