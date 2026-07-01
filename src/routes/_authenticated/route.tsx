import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
  SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard, ScanSearch, Camera, Upload, History, FileText, User, Settings,
  ShieldCheck, LogOut, Cpu, Moon, Sun,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { userId: data.user.id };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-background"><div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Loading instrument…</div></div>;
  }

  if (!user) return null;

  if (profile && profile.disabled) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="panel max-w-md p-8 text-center">
          <h1 className="font-display text-xl font-semibold">Account disabled</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your account has been disabled by an administrator.</p>
          <Button variant="outline" className="mt-4" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}>Sign out</Button>
        </div>
      </div>
    );
  }

  if (profile && !profile.approved && !isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="panel max-w-md p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-warning/15 text-warning"><ShieldCheck className="h-6 w-6" /></div>
          <h1 className="mt-4 font-display text-xl font-semibold">Pending approval</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account has been created and is awaiting administrator approval. You'll gain access once approved.
          </p>
          <Button variant="outline" className="mt-6" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}>Sign out</Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar isAdmin={isAdmin} />
        <div className="flex flex-1 flex-col">
          <TopBar />
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/diagnosis", label: "AI Diagnosis", icon: ScanSearch },
  { to: "/diagnosis/camera", label: "Live Camera", icon: Camera },
  { to: "/diagnosis/upload", label: "Upload Image", icon: Upload },
  { to: "/history", label: "History", icon: History },
  { to: "/reports", label: "Reports", icon: FileText },
];
const personal = [
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
];

function AppSidebar({ isAdmin }: { isAdmin: boolean }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const isActive = (t: string) => path === t || (t !== "/dashboard" && path.startsWith(t));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
            <Cpu className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate font-display text-sm font-semibold">Multi-Tester</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">AI · IC</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workbench</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((i) => (
                <SidebarMenuItem key={i.to}>
                  <SidebarMenuButton asChild isActive={isActive(i.to)}>
                    <Link to={i.to}><i.icon /><span>{i.label}</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {personal.map((i) => (
                <SidebarMenuItem key={i.to}>
                  <SidebarMenuButton asChild isActive={isActive(i.to)}>
                    <Link to={i.to}><i.icon /><span>{i.label}</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin")}>
                    <Link to="/admin"><ShieldCheck /><span>Admin</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <UserFooter collapsed={collapsed} />
      </SidebarFooter>
    </Sidebar>
  );
}

function UserFooter({ collapsed }: { collapsed: boolean }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const initials = (profile?.name || profile?.email || "U").slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-2 px-2 py-2">
      <Avatar className="h-8 w-8">
        {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      {!collapsed && (
        <>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium">{profile?.name || profile?.email}</div>
            <div className="truncate font-mono text-[10px] text-muted-foreground">{profile?.email}</div>
          </div>
          <Button size="icon" variant="ghost" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}

function TopBar() {
  const { theme, setTheme } = useTheme();
  return (
    <header className="flex h-14 items-center justify-between border-b border-border/60 px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <span className="led text-success" />
          <span className="uppercase tracking-widest">Instrument online</span>
        </div>
      </div>
      <Button size="icon" variant="ghost" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    </header>
  );
}
