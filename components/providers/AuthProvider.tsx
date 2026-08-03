"use client";

import { SessionProvider } from "next-auth/react";

/** Expose la session Auth.js aux composants clients (`useSession`). */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
