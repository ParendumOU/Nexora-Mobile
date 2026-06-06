import { create } from 'zustand';
import type { Session } from './types';
import { clearSession, loadSession, saveSession } from './secure';

interface AppState {
  hydrated: boolean;
  session: Session | null;

  hydrate: () => Promise<void>;
  setSession: (s: Session) => Promise<void>;
  /** Update just the access token (after a device/refresh) without re-persisting nothing else. */
  patchAccessToken: (accessToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  hydrated: false,
  session: null,

  hydrate: async () => {
    const session = await loadSession();
    set({ session, hydrated: true });
  },

  setSession: async (s) => {
    await saveSession(s);
    set({ session: s });
  },

  patchAccessToken: async (accessToken) => {
    const cur = get().session;
    if (!cur) return;
    const next = { ...cur, accessToken };
    await saveSession(next);
    set({ session: next });
  },

  signOut: async () => {
    await clearSession();
    set({ session: null });
  },
}));
