"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { CurrentUser } from "@/types";
import { DEFAULT_USER_ID, META_USERS } from "@/lib/mock-data";

const STORAGE_KEY = "fls-relay:preview-user-id";
const CHANGE_EVENT = "fls-relay:preview-user-changed";

interface CurrentUserContextValue {
  user: CurrentUser;
  setUserId: (id: string) => void;
  users: CurrentUser[];
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

function findUser(id: string, users: CurrentUser[]): CurrentUser {
  return users.find((u) => u.id === id) ?? users.find((u) => u.id === DEFAULT_USER_ID) ?? users[0];
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getSnapshot(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_USER_ID;
  } catch {
    return DEFAULT_USER_ID;
  }
}

function getServerSnapshot(): string {
  return DEFAULT_USER_ID;
}

interface CurrentUserProviderProps {
  children: ReactNode;
  /**
   * Site Leader preview identities, resolved server-side from real `site_leader`
   * holders (see app/(app)/layout.tsx) — not hardcoded, since a static file can't
   * know a future, admin-created site's id. Empty until at least one exists.
   */
  dynamicUsers?: CurrentUser[];
}

export function CurrentUserProvider({ children, dynamicUsers = [] }: CurrentUserProviderProps) {
  const storedId = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const users = [...META_USERS, ...dynamicUsers];

  function handleSetUserId(id: string) {
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // localStorage unavailable (private mode, etc.) — selection won't persist across reloads.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return (
    <CurrentUserContext.Provider
      value={{ user: findUser(storedId, users), setUserId: handleSetUserId, users }}
    >
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error("useCurrentUser must be used within CurrentUserProvider");
  return ctx;
}
