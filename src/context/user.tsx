"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { AthleteProfile } from "@/types";

type UserContextType = {
  user: AthleteProfile | null;
  setUser: (user: AthleteProfile | null) => void;
  loading: boolean;
};

const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  loading: true,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AthleteProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("athlete_user");
      if (stored) setUserState(JSON.parse(stored));
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  const setUser = (u: AthleteProfile | null) => {
    setUserState(u);
    if (u) localStorage.setItem("athlete_user", JSON.stringify(u));
    else localStorage.removeItem("athlete_user");
  };

  return (
    <UserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
