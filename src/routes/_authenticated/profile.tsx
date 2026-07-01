import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, user, refresh } = useAuth();
  const [name, setName] = useState(profile?.name ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function saveProfile() {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ name }).eq("id", user.id);
    setBusy(false);
    if (error) toast.error(error.message); else { toast.success("Profile updated"); refresh(); }
  }
  async function changePassword() {
    if (password.length < 8) { toast.error("Min 8 characters"); return; }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) toast.error(error.message); else { toast.success("Password changed"); setPassword(""); }
  }
  async function uploadAvatar(f: File) {
    if (!user) return;
    setUploading(true);
    try {
      const path = `${user.id}/${Date.now()}-${f.name}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, f, { contentType: f.type, upsert: true });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl || null;
      await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      toast.success("Avatar updated");
      refresh();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  }

  const initials = (profile?.name || profile?.email || "U").slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Account</div>
        <h1 className="mt-1 font-display text-3xl font-semibold">Profile</h1>
      </div>

      <div className="panel space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <label className="cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && uploadAvatar(e.target.files[0])} />
            <span className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}Change photo
            </span>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={profile?.email ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <Button onClick={saveProfile} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
      </div>

      <div className="panel space-y-4 p-6">
        <div>
          <div className="font-display font-semibold">Change password</div>
          <div className="text-sm text-muted-foreground">Choose a strong password of at least 8 characters.</div>
        </div>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" />
        <Button onClick={changePassword}>Update password</Button>
      </div>
    </div>
  );
}
