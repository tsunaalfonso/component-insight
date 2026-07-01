import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface AuthProfile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  approved: boolean;
  disabled: boolean;
}

export interface AuthState {
  user: User | null;
  profile: AuthProfile | null;
  isAdmin: boolean;
  loading: boolean;
}

export function useAuth(): AuthState & { refresh: () => Promise<void> } {
  const [state, setState] = useState<AuthState>({ user: null, profile: null, isAdmin: false, loading: true });

  const load = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user ?? null;
    if (!user) {
      setState({ user: null, profile: null, isAdmin: false, loading: false });
      return;
    }
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);
    const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
    setState({ user, profile: (profile as AuthProfile) ?? null, isAdmin, loading: false });
  };

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") load();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { ...state, refresh: load };
}
