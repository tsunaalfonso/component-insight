import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { user, isAdmin } = useAuth();

  const q = useQuery({
    queryKey: ["reports", user?.id, isAdmin],
    queryFn: async () => {
      let query = supabase.from("reports").select("*, diagnoses(component_name, status)").order("created_at", { ascending: false });
      if (!isAdmin && user) query = query.eq("user_id", user.id);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  async function download(path: string) {
    const { data, error } = await supabase.storage.from("reports").createSignedUrl(path, 60);
    if (error || !data?.signedUrl) { toast.error("Could not open report"); return; }
    window.open(data.signedUrl, "_blank");
  }

  const rows = q.data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Documents</div>
        <h1 className="mt-1 font-display text-3xl font-semibold">Reports</h1>
      </div>

      {rows.length === 0 ? (
        <div className="panel p-10 text-center text-muted-foreground">No reports generated yet. Open a diagnosis and click "Download PDF" to create one.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((r) => {
            const diag = r.diagnoses as { component_name: string | null; status: string } | null;
            return (
              <div key={r.id} className="panel flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/15 text-primary"><FileText className="h-5 w-5" /></div>
                  <div>
                    <div className="font-medium">{diag?.component_name || "Diagnosis report"}</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy · HH:mm")}</div>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => download(r.pdf_path || r.pdf_url)}><Download className="mr-2 h-4 w-4" /> Open</Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
