"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { CurrentUser } from "@/types";
import { DEFAULT_USER_ID, MOCK_USERS } from "@/lib/mock-data";

const STORAGE_KEY = "fls-relay:preview-user-id";
const CHANGE_EVENT = "fls-relay:preview-user-changed";

interface CurrentUserContextValue {
  user: CurrentUser;
  setUserId: (id: string) => void;
  users: CurrentUser[];
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

function findUser(id: string): CurrentUser {
  return MOCK_USERS.find((u) => u.id === id) ?? MOCK_USERS.find((u) => u.id === DEFAULT_USER_ID)!;
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

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const storedId = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

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
      value={{ user: findUser(storedId), setUserId: handleSetUserId, users: MOCK_USERS }}
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
