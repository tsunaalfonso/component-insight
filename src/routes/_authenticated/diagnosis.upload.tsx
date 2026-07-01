import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { analyzeComponent } from "@/lib/diagnose.functions";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Upload as UploadIcon, ImageIcon } from "lucide-react";

const ACCEPT = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX = 20 * 1024 * 1024;

export const Route = createFileRoute("/_authenticated/diagnosis/upload")({
  component: UploadPage,
});

function UploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const analyze = useServerFn(analyzeComponent);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const pick = (f: File | null) => {
    if (!f) return;
    if (!ACCEPT.includes(f.type)) { toast.error("Unsupported file type. Use JPG, PNG or WEBP."); return; }
    if (f.size > MAX) { toast.error("File exceeds 20 MB limit."); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    pick(e.dataTransfer.files?.[0] ?? null);
  }, []);

  async function submit() {
    if (!file || !user) return;
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      toast.info("Uploading image…");
      const { error: upErr } = await supabase.storage.from("component-images").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      toast.info("AI analyzing component…");
      const { id } = await analyze({ data: { imagePath: path, bucket: "component-images" } });
      toast.success("Analysis complete");
      navigate({ to: "/diagnosis/$id", params: { id } });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Bench · Upload</div>
        <h1 className="mt-1 font-display text-3xl font-semibold">Upload component image</h1>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`panel flex flex-col items-center justify-center p-10 text-center transition ${drag ? "border-primary bg-primary/5" : ""}`}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="max-h-72 rounded-lg border border-border" />
        ) : (
          <>
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-primary/15 text-primary">
              <ImageIcon className="h-7 w-7" />
            </div>
            <div className="mt-4 font-display text-lg font-semibold">Drop an image here</div>
            <div className="mt-1 text-sm text-muted-foreground">JPG, PNG or WEBP · up to 20 MB</div>
          </>
        )}
        <div className="mt-6 flex gap-2">
          <label>
            <input type="file" accept={ACCEPT.join(",")} className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
            <span className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
              <UploadIcon className="h-4 w-4" /> Choose file
            </span>
          </label>
          <Button disabled={!file || busy} onClick={submit}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Analyze with AI
          </Button>
        </div>
      </div>
    </div>
  );
}
