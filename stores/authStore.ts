import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: any | null;
  loading: boolean;
  initialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, username: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: { full_name?: string; bio?: string; location?: string; avatar_url?: string }) => Promise<{ error: string | null }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        set({ user: session.user, session, profile, initialized: true });
      } else {
        set({ initialized: true });
      }
    } catch {
      set({ initialized: true });
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        set({ user: session.user, session, profile });
      } else {
        set({ user: null, session: null, profile: null });
      }
    });
  },

  signInWithEmail: async (email, password) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return { error: null };
    } catch (e: any) {
      return { error: e.message ?? 'Sign in failed' };
    } finally {
      set({ loading: false });
    }
  },

  signUpWithEmail: async (email, password, username, fullName) => {
    set({ loading: true });
    try {
      // Check username availability
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();
      if (existing) return { error: 'Username already taken' };

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: error.message };
      if (!data.user) return { error: 'Sign up failed' };

      // Create profile
      const { error: profileError } = await supabase.from('users').insert({
        id: data.user.id,
        username,
        full_name: fullName,
      });
      if (profileError) return { error: profileError.message };

      return { error: null };
    } catch (e: any) {
      return { error: e.message ?? 'Sign up failed' };
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null });
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;
    const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
    if (data) set({ profile: data });
  },

  updateProfile: async (data) => {
    const { user } = get();
    if (!user) return { error: 'Not authenticated' };
    const { error } = await supabase.from('users').update(data).eq('id', user.id);
    if (!error) await get().refreshProfile();
    return { error: error?.message ?? null };
  },
}));
