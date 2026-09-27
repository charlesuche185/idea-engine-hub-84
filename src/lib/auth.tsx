import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Ctx = { user: User | null; loading: boolean };
const AuthCtx = createContext<Ctx>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Ctx>({ user: null, loading: true });
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      setState({ user: session?.user ?? null, loading: false });
    });
    supabase.auth.getSession().then(({ data: d }) => setState({ user: d.session?.user ?? null, loading: false }));
    return () => data.subscription.unsubscribe();
  }, []);
  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
