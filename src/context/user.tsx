"use client";

import { createContext, useContext, useState, useSyncExternalStore } from "react";
import type { AthleteProfile } from "@/types";

const STORAGE_KEY = "athlete_user";

function readStorage(): AthleteProfile | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function writeStorage(u: AthleteProfile | null) {
  try {
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

// useSyncExternalStore: server snapshot always null (prevents hydration mismatch),
// client snapshot reads localStorage after hydration.
function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

type UserContextType = {
  setUser: (user: AthleteProfile | null) => void;
};

const UserContext = createContext<UserContextType>({ setUser: () => {} });

export function UserProvider({ children }: { children: React.ReactNode }) {
  // Internal write-state — only used when this tab changes the user.
  // Cross-tab changes come through useSyncExternalStore's storage listener.
  const [, rerender] = useState(0);

  const setUser = (u: AthleteProfile | null) => {
    writeStorage(u);
    rerender((n) => n + 1); // force re-render so useSyncExternalStore re-reads
  };

  return (
    <UserContext.Provider value={{ setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const { setUser } = useContext(UserContext);

  // Server snapshot = null (matches server render).
  // Client snapshot = actual localStorage value after hydration.
  const user = useSyncExternalStore(subscribe, readStorage, () => null);

  return { user, setUser };
}
