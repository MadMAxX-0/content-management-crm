"use client";
import { createContext, useContext } from "react";
import { Me } from "@/lib/api";

export type AuthCtx = { me: Me | null; signOut: () => Promise<void>; authEnabled: boolean };

export const AuthContext = createContext<AuthCtx>({
  me: null,
  signOut: async () => {},
  authEnabled: false,
});

export const useAuth = () => useContext(AuthContext);
