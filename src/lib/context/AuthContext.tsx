"use client";

import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { Session, AuthChangeEvent } from "@supabase/supabase-js";
import { AuthContextType, AuthUser } from "../../../types";

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  /**
   * Helper: Transforms Supabase user data into our local AuthUser type.
   */
  const buildUser = (sbUser: any): AuthUser => ({
    id: sbUser.id,
    email: sbUser.email ?? "",
    name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || "User",
    avatar: sbUser.user_metadata?.avatar_url,
  });

  useEffect(() => {
    /**
     * initAuth: Replaces the Middleware's job by checking the session
     * on mount and handling "Invalid Refresh Token" errors.
     */
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (session?.user) {
          setUser(buildUser(session.user));
        }
      } catch (error: any) {
        // This targets the 400 error you encountered
        if (error.message?.includes("Refresh Token Not Found") || error.status === 400) {
          console.warn("Auth Session Expired: Cleaning up...");
          await supabase.auth.signOut();
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    /**
     * Listener: Updates the UI state whenever the user logs in or out.
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          setUser(buildUser(session.user));
        } else {
          setUser(null);
        }

        // If a background refresh fails, ensure the app knows the user is logged out
        if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
          setUser(null);
        }

        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string): Promise<void> => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      window.location.href = "/login"; 
    }
  };

  const value = useMemo(() => ({ 
    user, 
    loading, 
    login, 
    signup,
    signInWithGoogle,
    logout 
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};