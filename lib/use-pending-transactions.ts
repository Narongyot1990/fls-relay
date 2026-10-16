"use client";

import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/current-user";
import { canConfirmIssue } from "@/lib/permissions";
import type { IssueTransaction } from "@/types";

/**
 * Pending T1s this user can act on — fetches the open read (/api/transactions/pending,
 * same unauthenticated-read pattern as /api/devices, /api/sites) and filters to
 * "mine" client-side via canConfirmIssue, the same way every other page in this
 * app resolves scope without real auth. Shared by the home page, BottomNav badge,
 * and the inbox itself so that logic isn't tripled.
 */
export function usePendingTransactions(): { items: IssueTransaction[] | null; reload: () => void } {
  const { user } = useCurrentUser();
  const [items, setItems] = useState<IssueTransaction[] | null>(null);

  const reload = useCallback(() => {
    fetch("/api/transactions/pending")
      .then((r) => r.json())
      .then((data) => {
        const all: IssueTransaction[] = data.transactions ?? [];
        setItems(all.filter((tx) => canConfirmIssue(user, tx.toSiteId)));
      });
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { items, reload };
}
