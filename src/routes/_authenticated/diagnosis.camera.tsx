import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { analyzeComponent } from "@/lib/diagnose.functions";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera as CameraIcon, RefreshCw, Zap, ZoomIn, ZoomOut, Loader2, ScanLine, SwitchCamera } from "lucide-react";

export const Route = createFileRoute("/_authenticated/diagnosis/camera")({
  component: CameraPage,
});

interface ExtendedTrackCapabilities extends MediaTrackCapabilities { torch?: boolean; zoom?: { min: number; max: number; step: number } }
interface ExtendedConstraintSet extends MediaTrackConstraintSet { torch?: boolean; zoom?: number }

function CameraPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [zoom, setZoom] = useState(1);
  const [zoomCap, setZoomCap] = useState<{ min: number; max: number; step: number } | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const analyze = useServerFn(analyzeComponent);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities?.() as ExtendedTrackCapabilities | undefined;
        if (caps?.zoom) setZoomCap(caps.zoom);
        else setZoomCap(null);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Camera unavailable");
      }
    }
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facing]);

  const applyZoom = async (z: number) => {
    setZoom(z);
    const track = streamRef.current?.getVideoTracks()[0];
    try { await track?.applyConstraints({ advanced: [{ zoom: z } as ExtendedConstraintSet] }); } catch { /* ignore */ }
  };
  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try { await track.applyConstraints({ advanced: [{ torch: !torchOn } as ExtendedConstraintSet] }); setTorchOn(!torchOn); }
    catch { toast.error("Torch not supported on this device"); }
  };

  const capture = () => {
    const v = videoRef.current; if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    setSnapshot(canvas.toDataURL("image/jpeg", 0.92));
  };

  const retake = () => setSnapshot(null);

  async function submit() {
    if (!snapshot || !user) return;
    setBusy(true);
    try {
      const blob = await (await fetch(snapshot)).blob();
      const path = `${user.id}/${Date.now()}.jpg`;
      toast.info("Uploading capture…");
      const { error: upErr } = await supabase.storage.from("camera-captures").upload(path, blob, { contentType: "image/jpeg" });
      if (upErr) throw upErr;
      toast.info("AI analyzing…");
      const { id } = await analyze({ data: { imagePath: path, bucket: "camera-captures" } });
      toast.success("Analysis complete");
      navigate({ to: "/diagnosis/$id", params: { id } });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Capture analysis failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Bench · Live camera</div>
        <h1 className="mt-1 font-display text-3xl font-semibold">Live capture</h1>
      </div>

      <div className="panel relative overflow-hidden p-2">
        <div className="relative aspect-video overflow-hidden rounded-md bg-black">
          {!snapshot ? (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-0 border border-primary/40" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-primary/60">
                <ScanLine className="h-16 w-16" />
              </div>
              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md bg-black/60 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-white">
                <span className="led text-success" /> Live
              </div>
            </>
          ) : (
            <img src={snapshot} className="h-full w-full object-contain" alt="Capture" />
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-2 pb-2">
          <div className="flex flex-wrap gap-2">
            {!snapshot ? (
              <>
                <Button onClick={capture} size="lg"><CameraIcon className="mr-2 h-4 w-4" /> Capture</Button>
                <Button variant="outline" onClick={() => setFacing(facing === "environment" ? "user" : "environment")}><SwitchCamera className="mr-2 h-4 w-4" /> Switch</Button>
                <Button variant="outline" onClick={toggleTorch}><Zap className={`mr-2 h-4 w-4 ${torchOn ? "text-warning" : ""}`} /> Torch</Button>
              </>
            ) : (
              <>
                <Button onClick={submit} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Analyze</Button>
                <Button variant="outline" onClick={retake}><RefreshCw className="mr-2 h-4 w-4" /> Retake</Button>
              </>
            )}
          </div>

          {zoomCap && !snapshot && (
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" onClick={() => applyZoom(Math.max(zoomCap.min, zoom - zoomCap.step))}><ZoomOut className="h-4 w-4" /></Button>
              <div className="font-mono text-xs tabular-nums w-10 text-center">{zoom.toFixed(1)}x</div>
              <Button size="icon" variant="outline" onClick={() => applyZoom(Math.min(zoomCap.max, zoom + zoomCap.step))}><ZoomIn className="h-4 w-4" /></Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
