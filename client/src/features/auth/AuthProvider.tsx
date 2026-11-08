import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  passwordRecovery: boolean;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    displayName: string,
    email: string,
    password: string,
    returnTo: string,
  ) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren): React.JSX.Element {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const activeUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_OUT') queryClient.clear();
      const nextUserId = nextSession?.user.id ?? null;
      if (activeUserId.current && nextUserId && activeUserId.current !== nextUserId) {
        queryClient.clear();
      }
      activeUserId.current = nextUserId;
      setPasswordRecovery(event === 'PASSWORD_RECOVERY');
      setSession(nextSession);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  const signIn = async (email: string, password: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (
    displayName: string,
    email: string,
    password: string,
    returnTo: string,
  ): Promise<boolean> => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const redirectUrl = new URL('/sign-in', window.location.origin);
    redirectUrl.searchParams.set('returnTo', returnTo);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl.toString(),
        data: { display_name: displayName.trim() },
      },
    });
    if (error) throw error;
    return Boolean(data.session);
  };

  const signOut = async (): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    queryClient.clear();
  };

  const requestPasswordReset = async (email: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const redirectTo = new URL('/password-reset', window.location.origin).toString();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  };

  const updatePassword = async (password: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  const value: AuthContextValue = {
    configured: Boolean(supabase),
    loading,
    passwordRecovery,
    user: session?.user ?? null,
    signIn,
    signUp,
    requestPasswordReset,
    updatePassword,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}

export function authErrorMessage(
  error: unknown,
  messages: {
    invalidCredentials: string;
    weakPassword: string;
    generic: string;
  },
): string {
  if (!(error instanceof Error)) return messages.generic;
  const text = error.message.toLowerCase();
  if (text.includes('invalid login credentials') || text.includes('email not confirmed')) {
    return messages.invalidCredentials;
  }
  if (text.includes('password') && (text.includes('short') || text.includes('least'))) {
    return messages.weakPassword;
  }
  return messages.generic;
}
