/**
 * SHEildAI — useAuth hook
 *
 * Wraps Supabase's onAuthStateChange in a Zustand store so any
 * component can read auth state without prop-drilling.
 *
 * Usage:
 *   const { user, session, loading, signOut } = useAuth();
 */

import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../services/supabaseClient';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;

  setAuth: (user: User | null, session: Session | null) => void;
  setLoading: (v: boolean) => void;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  initialized: false,

  setAuth: (user, session) =>
    set({ user, session, loading: false, initialized: true }),

  setLoading: (v) => set({ loading: v }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
}));

/**
 * Call once at the app root (inside App.tsx) to wire up the auth listener.
 * Subsequent renders will read from the store without re-subscribing.
 */
let _subscribed = false;
export function initAuthListener() {
  if (_subscribed) return;
  _subscribed = true;

  // Set initial session synchronously
  supabase.auth.getSession().then(({ data }) => {
    useAuth.getState().setAuth(data.session?.user ?? null, data.session ?? null);
  });

  // Listen for future changes (login, logout, token refresh)
  supabase.auth.onAuthStateChange((_event, session) => {
    useAuth.getState().setAuth(session?.user ?? null, session ?? null);
  });
}
