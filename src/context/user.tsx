"use client";

import { createContext, useContext, useCallback, useSyncExternalStore } from "react";
import type { AthleteProfile } from "@/types";

const STORAGE_KEY = "athlete_user";

// Module-level cache — same reference returned until data actually changes.
// Required by useSyncExternalStore: getSnapshot must be referentially stable.
let _cachedStr: string | null = null;
let _cachedUser: AthleteProfile | null = null;
const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach((cb) => cb());
}

function getSnapshot(): AthleteProfile | null {
  try {
    const str = localStorage.getItem(STORAGE_KEY);
    if (str === _cachedStr) return _cachedUser; // same data → same reference
    _cachedStr = str;
    _cachedUser = str ? (JSON.parse(str) as AthleteProfile) : null;
    return _cachedUser;
  } catch {
    return null;
  }
}

function subscribe(cb: () => void): () => void {
  _listeners.add(cb);
  // Cross-tab sync
  const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) cb(); };
  window.addEventListener("storage", onStorage);
  return () => {
    _listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

type UserContextType = { setUser: (u: AthleteProfile | null) => void };
const UserContext = createContext<UserContextType>({ setUser: () => {} });

export function UserProvider({ children }: { children: React.ReactNode }) {
  const setUser = useCallback((u: AthleteProfile | null) => {
    try {
      if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      else localStorage.removeItem(STORAGE_KEY);
      // Invalidate cache so next getSnapshot sees the new value
      _cachedStr = u ? JSON.stringify(u) : null;
      _cachedUser = u;
    } catch { /* ignore */ }
    notify(); // notify same-tab listeners (storage event doesn't fire for same tab)
  }, []);

  return <UserContext.Provider value={{ setUser }}>{children}</UserContext.Provider>;
}

export function useUser() {
  const { setUser } = useContext(UserContext);
  // Server snapshot = null → matches server HTML. Client reads real localStorage.
  const user = useSyncExternalStore(subscribe, getSnapshot, () => null);
  return { user, setUser };
}
