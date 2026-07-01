import { createFileRoute } from "@tanstack/react-router";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Monitor } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Preferences</div>
        <h1 className="mt-1 font-display text-3xl font-semibold">Settings</h1>
      </div>
      <div className="panel space-y-4 p-6">
        <div>
          <div className="font-display font-semibold">Appearance</div>
          <div className="text-sm text-muted-foreground">Choose an appearance for the console.</div>
        </div>
        <div className="flex gap-2">
          <Button variant={theme === "dark" ? "default" : "outline"} onClick={() => setTheme("dark")}><Moon className="mr-2 h-4 w-4" /> Dark</Button>
          <Button variant={theme === "light" ? "default" : "outline"} onClick={() => setTheme("light")}><Sun className="mr-2 h-4 w-4" /> Light</Button>
        </div>
      </div>
      <div className="panel space-y-2 p-6">
        <div className="font-display font-semibold">Notifications</div>
        <p className="text-sm text-muted-foreground">In-app toast notifications are always enabled for uploads, analysis, PDF generation, and account events.</p>
      </div>
      <div className="panel space-y-2 p-6">
        <div className="font-display font-semibold">About</div>
        <p className="text-sm text-muted-foreground">Smart Multi-Tester AI · IC Diagnosis Console.</p>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <Monitor className="h-3 w-3" /> Web console v1.0
        </div>
      </div>
    </div>
  );
}
