import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Cpu, Camera, ShieldCheck, Activity, ScanLine } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-sm font-semibold leading-tight">Smart Multi-Tester</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">AI · IC Diagnostics</div>
            </div>
          </div>
          <Link to="/auth"><Button variant="default">Sign in</Button></Link>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="relative mx-auto max-w-7xl px-6 py-24">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary">
            <span className="led text-success" /> System online · v1.0
          </div>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-semibold leading-tight md:text-6xl">
            AI-assisted diagnosis for integrated circuits and electronic components.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Capture, analyze, and document faults in ICs using computer vision. Built for repair labs, engineers, and technicians who need calibrated answers—fast.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth"><Button size="lg">Launch console</Button></Link>
            <a href="#features"><Button size="lg" variant="outline">See capabilities</Button></a>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Camera, title: "Live capture", desc: "WebRTC camera with zoom, torch and lens switching." },
            { icon: ScanLine, title: "Vision AI", desc: "Detects burns, cracks, bent pins, corrosion and more." },
            { icon: Activity, title: "Confidence gauge", desc: "Calibrated scores with manual-review flags below 70%." },
            { icon: ShieldCheck, title: "Signed reports", desc: "Downloadable PDF with QR verification and audit log." },
          ].map((f) => (
            <div key={f.title} className="panel p-5">
              <f.icon className="h-6 w-6 text-primary" />
              <div className="mt-4 font-display font-semibold">{f.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
