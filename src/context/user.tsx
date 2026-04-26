"use client";

import { createContext, useContext, useState } from "react";
import type { AthleteProfile } from "@/types";

type UserContextType = {
  user: AthleteProfile | null;
  setUser: (user: AthleteProfile | null) => void;
  loading: false;
};

const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  loading: false,
});

function readStorage(): AthleteProfile | null {
  try {
    const stored = localStorage.getItem("athlete_user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AthleteProfile | null>(readStorage);

  const setUser = (u: AthleteProfile | null) => {
    setUserState(u);
    if (u) localStorage.setItem("athlete_user", JSON.stringify(u));
    else localStorage.removeItem("athlete_user");
  };

  return (
    <UserContext.Provider value={{ user, setUser, loading: false }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
