import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ConfidenceGauge } from "@/components/ConfidenceGauge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, ArrowLeft, AlertTriangle } from "lucide-react";
import { generateDiagnosisPdf, type DiagnosisRecord } from "@/lib/pdf";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/diagnosis/$id")({
  component: DiagnosisDetail,
});

function DiagnosisDetail() {
  const { id } = useParams({ from: "/_authenticated/diagnosis/$id" });
  const { user, profile } = useAuth();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const q = useQuery({
    queryKey: ["diagnosis", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("diagnoses").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    async function sign() {
      const d = q.data;
      if (!d?.image_path) return;
      const bucket = d.source === "camera" ? "camera-captures" : "component-images";
      const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(d.image_path, 60 * 30);
      if (signed?.signedUrl) setImageUrl(signed.signedUrl);
    }
    sign();
  }, [q.data]);

  if (q.isLoading) return <div className="grid min-h-full place-items-center p-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (q.error || !q.data) return <div className="p-10 text-center text-muted-foreground">Diagnosis not found.</div>;

  const d = q.data;
  const conf = Number(d.confidence) || 0;
  const lowConf = conf < 70;

  async function downloadPdf() {
    if (!d) return;
    setPdfBusy(true);
    try {
      let imgDataUrl: string | undefined;
      if (imageUrl) {
        try {
          const blob = await (await fetch(imageUrl)).blob();
          imgDataUrl = await new Promise<string>((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result as string);
            r.onerror = rej;
            r.readAsDataURL(blob);
          });
        } catch { /* skip */ }
      }
      const verifyUrl = `${window.location.origin}/diagnosis/${d.id}`;
      const record: DiagnosisRecord = {
        id: d.id,
        component_name: d.component_name,
        package_type: d.package_type,
        manufacturer: d.manufacturer,
        visible_damage: (d.visible_damage as string[]) ?? [],
        severity: d.severity,
        possible_cause: d.possible_cause,
        confidence: Number(d.confidence),
        summary: d.summary,
        recommendation: d.recommendation,
        repairability: d.repairability,
        status: d.status,
        created_at: d.created_at,
      };
      const blob = await generateDiagnosisPdf(record, {
        technician: profile?.name || profile?.email || "Technician",
        imageDataUrl: imgDataUrl,
        verifyUrl,
      });
      // Upload
      if (user) {
        const path = `${user.id}/${d.id}.pdf`;
        await supabase.storage.from("reports").upload(path, blob, { contentType: "application/pdf", upsert: true });
        await supabase.from("reports").insert({ diagnosis_id: d.id, user_id: user.id, pdf_url: path, pdf_path: path });
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `diagnosis-${d.id}.pdf`; a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF generated");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "PDF generation failed");
    } finally { setPdfBusy(false); }
  }

  const statusTone = d.status === "healthy" ? "success" : d.status === "severe" ? "destructive" : d.status === "defective" ? "warning" : "muted";
  const statusColor: Record<string, string> = {
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/15 text-destructive",
    warning: "bg-warning/15 text-warning",
    muted: "bg-muted text-muted-foreground",
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Link to="/history" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Back to history</Link>
        <Button onClick={downloadPdf} disabled={pdfBusy}>{pdfBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Download PDF</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="panel overflow-hidden">
          <div className="aspect-square w-full overflow-hidden bg-black">
            {imageUrl ? <img src={imageUrl} alt={d.component_name ?? "component"} className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center text-muted-foreground">Loading image…</div>}
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-border/60 p-4 text-sm">
            <Field label="Component">{d.component_name || "Unknown"}</Field>
            <Field label="Package">{d.package_type || "—"}</Field>
            <Field label="Manufacturer">{d.manufacturer || "—"}</Field>
            <Field label="Source">{d.source}</Field>
            <Field label="Date">{format(new Date(d.created_at), "PPpp")}</Field>
            <Field label="Repairability">{d.repairability || "—"}</Field>
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel flex items-center gap-6 p-6">
            <ConfidenceGauge value={conf} />
            <div className="flex-1 space-y-2">
              <div className={`inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium uppercase tracking-widest ${statusColor[statusTone]}`}>
                <span className="led" /> {d.status}
              </div>
              <div className="font-display text-xl font-semibold">{d.severity ? d.severity.toUpperCase() : "—"}</div>
              <div className="text-xs text-muted-foreground">Severity level</div>
            </div>
          </div>

          {lowConf && (
            <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-warning-foreground">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
              <div>
                <div className="font-medium text-foreground">Manual inspection recommended</div>
                <div className="mt-1 text-muted-foreground">AI confidence is below 70%. Verify the diagnosis with electrical testing.</div>
              </div>
            </div>
          )}

          <div className="panel p-5">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Summary</div>
            <p className="mt-2 text-sm leading-relaxed">{d.summary || "—"}</p>
          </div>

          <div className="panel p-5">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Visible damage</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {((d.visible_damage as string[]) ?? []).length === 0 ? (
                <span className="text-sm text-muted-foreground">None detected.</span>
              ) : (
                (d.visible_damage as string[]).map((v) => (
                  <Badge key={v} variant="secondary">{v}</Badge>
                ))
              )}
            </div>
            {d.possible_cause && (
              <>
                <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Possible cause</div>
                <p className="mt-1 text-sm">{d.possible_cause}</p>
              </>
            )}
          </div>

          <div className="panel p-5">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Recommendation</div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{d.recommendation || "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm">{children}</div>
    </div>
  );
}
