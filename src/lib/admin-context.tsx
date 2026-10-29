"use client";

import { createContext, useContext } from "react";
import type { User } from "./types";

type AdminContextValue = {
  admin: User;
  setAdmin: (user: User) => void;
};

export const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside the admin panel layout");
  return ctx;
}
