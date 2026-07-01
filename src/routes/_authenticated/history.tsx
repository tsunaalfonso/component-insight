import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Download, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

const PAGE = 20;

function HistoryPage() {
  const { user, isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(0);

  const q = useQuery({
    queryKey: ["history", user?.id, isAdmin],
    queryFn: async () => {
      let query = supabase.from("diagnoses").select("*").order("created_at", { ascending: false });
      if (!isAdmin && user) query = query.eq("user_id", user.id);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return (q.data ?? []).filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!s) return true;
      return [r.component_name, r.manufacturer, r.package_type, r.summary].some((f) => (f ?? "").toString().toLowerCase().includes(s));
    });
  }, [q.data, search, status]);

  const pageRows = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));

  const exportCsv = () => {
    const header = ["id", "date", "component", "manufacturer", "package", "status", "severity", "confidence"];
    const lines = [header.join(",")];
    for (const r of filtered) {
      lines.push([r.id, r.created_at, r.component_name ?? "", r.manufacturer ?? "", r.package_type ?? "", r.status, r.severity ?? "", r.confidence ?? ""]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `diagnoses-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Log</div>
          <h1 className="mt-1 font-display text-3xl font-semibold">Diagnosis history</h1>
        </div>
        <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
      </div>

      <div className="panel p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search component, manufacturer…" className="pl-9" />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="healthy">Healthy</SelectItem>
              <SelectItem value="defective">Defective</SelectItem>
              <SelectItem value="severe">Severe</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Component</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No records</TableCell></TableRow>
              )}
              {pageRows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => { window.location.href = `/diagnosis/${r.id}`; }}>
                  <TableCell className="font-mono text-xs">{format(new Date(r.created_at), "MMM d, HH:mm")}</TableCell>
                  <TableCell>
                    <Link to="/diagnosis/$id" params={{ id: r.id }} className="hover:text-primary">
                      <div className="font-medium">{r.component_name || "Unknown IC"}</div>
                      <div className="text-xs text-muted-foreground">{r.manufacturer || "—"}</div>
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.package_type || "—"}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{r.confidence ?? "—"}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {pages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="text-muted-foreground">Page {page + 1} of {pages}</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</Button>
              <Button size="sm" variant="outline" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    healthy: "bg-success/15 text-success border-success/30",
    defective: "bg-warning/15 text-warning border-warning/30",
    severe: "bg-destructive/15 text-destructive border-destructive/30",
    pending: "bg-muted text-muted-foreground",
    unknown: "bg-muted text-muted-foreground",
  };
  return <Badge variant="outline" className={map[status] || ""}>{status}</Badge>;
}
