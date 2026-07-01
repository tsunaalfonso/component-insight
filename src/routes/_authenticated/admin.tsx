import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useServerFn } from "@tanstack/react-start";
import { approveUser, setUserDisabled, setUserRole, deleteUser } from "@/lib/admin.functions";
import { toast } from "sonner";
import { format } from "date-fns";
import { CheckCircle2, Ban, Trash2, ShieldCheck, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

interface ProfileRow { id: string; email: string; name: string | null; approved: boolean; disabled: boolean; created_at: string; }

function AdminPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const approve = useServerFn(approveUser);
  const toggleDisabled = useServerFn(setUserDisabled);
  const setRole = useServerFn(setUserRole);
  const del = useServerFn(deleteUser);

  const users = useQuery({
    queryKey: ["admin-users"],
    enabled: isAdmin,
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const roleMap = new Map<string, string[]>();
      (roles ?? []).forEach((r) => {
        const arr = roleMap.get(r.user_id) ?? []; arr.push(r.role); roleMap.set(r.user_id, arr);
      });
      return (profiles ?? []).map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] })) as (ProfileRow & { roles: string[] })[];
    },
  });

  const logs = useQuery({
    queryKey: ["admin-logs"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("system_logs").select("*").order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  if (!isAdmin) return <div className="p-10 text-center text-muted-foreground">Admin access required.</div>;

  async function run(fn: () => Promise<unknown>, msg: string) {
    try { await fn(); toast.success(msg); qc.invalidateQueries({ queryKey: ["admin-users"] }); qc.invalidateQueries({ queryKey: ["admin-logs"] }); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  const pending = (users.data ?? []).filter((u) => !u.approved);
  const active = (users.data ?? []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">System</div>
        <h1 className="mt-1 font-display text-3xl font-semibold">Admin panel</h1>
      </div>

      <Tabs defaultValue="approvals">
        <TabsList>
          <TabsTrigger value="approvals">Approvals ({pending.length})</TabsTrigger>
          <TabsTrigger value="users">Users ({active.length})</TabsTrigger>
          <TabsTrigger value="logs">Audit log</TabsTrigger>
        </TabsList>

        <TabsContent value="approvals" className="mt-4">
          <div className="panel">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.length === 0 && <TableRow><TableCell colSpan={3} className="py-10 text-center text-muted-foreground">No pending approvals</TableCell></TableRow>}
                {pending.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{format(new Date(u.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => run(() => approve({ data: { userId: u.id } }), "User approved")}><CheckCircle2 className="mr-1 h-3 w-3" /> Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => confirm("Delete this user permanently?") && run(() => del({ data: { userId: u.id } }), "User deleted")}><Trash2 className="mr-1 h-3 w-3" /> Reject</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <div className="panel overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell>
                      {u.roles.includes("admin") ? <Badge className="bg-primary/15 text-primary"><ShieldCheck className="mr-1 h-3 w-3" /> Admin</Badge> : <Badge variant="outline"><UserIcon className="mr-1 h-3 w-3" /> User</Badge>}
                    </TableCell>
                    <TableCell>
                      {!u.approved ? <Badge variant="outline" className="border-warning/40 text-warning">Pending</Badge> : u.disabled ? <Badge variant="outline" className="border-destructive/40 text-destructive">Disabled</Badge> : <Badge variant="outline" className="border-success/40 text-success">Active</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {u.roles.includes("admin")
                          ? <Button size="sm" variant="outline" onClick={() => run(() => setRole({ data: { userId: u.id, role: "user" } }), "Role updated")}>Demote</Button>
                          : <Button size="sm" variant="outline" onClick={() => run(() => setRole({ data: { userId: u.id, role: "admin" } }), "Role updated")}>Make admin</Button>}
                        <Button size="sm" variant="outline" onClick={() => run(() => toggleDisabled({ data: { userId: u.id, disabled: !u.disabled } }), u.disabled ? "Enabled" : "Disabled")}>
                          <Ban className="mr-1 h-3 w-3" /> {u.disabled ? "Enable" : "Disable"}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => confirm("Delete this user permanently?") && run(() => del({ data: { userId: u.id } }), "User deleted")}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <div className="panel overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Metadata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(logs.data ?? []).map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-xs">{format(new Date(l.created_at), "MMM d, HH:mm:ss")}</TableCell>
                    <TableCell className="font-mono text-xs">{l.user_id?.slice(0, 8) || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{l.action}</Badge></TableCell>
                    <TableCell className="max-w-md truncate font-mono text-[11px] text-muted-foreground">{JSON.stringify(l.metadata)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
