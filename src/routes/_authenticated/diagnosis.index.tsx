import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/diagnosis/")({
  component: DiagnosisIndex,
});

function DiagnosisIndex() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Analyze a component</div>
        <h1 className="mt-1 font-display text-3xl font-semibold">AI Diagnosis</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Capture with the live camera or upload an existing image. The AI will analyze the component and return a structured diagnosis with recommendations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link to="/diagnosis/camera" className="panel group flex flex-col p-6 transition hover:border-primary/50">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/15 text-primary transition group-hover:bg-primary/25">
            <Camera className="h-6 w-6" />
          </div>
          <div className="mt-4 font-display text-lg font-semibold">Live camera</div>
          <p className="mt-1 text-sm text-muted-foreground">Point your camera at the IC, zoom in, and capture. Supports lens switching and torch on capable devices.</p>
        </Link>

        <Link to="/diagnosis/upload" className="panel group flex flex-col p-6 transition hover:border-primary/50">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-signal/20 text-signal transition group-hover:bg-signal/30">
            <Upload className="h-6 w-6" />
          </div>
          <div className="mt-4 font-display text-lg font-semibold">Upload image</div>
          <p className="mt-1 text-sm text-muted-foreground">Drag & drop a JPG, PNG or WEBP up to 20 MB. Best results with well-lit, focused, top-down shots.</p>
        </Link>
      </div>
    </div>
  );
}
