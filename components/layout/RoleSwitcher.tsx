"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/current-user";
import { LEVEL_LABELS } from "@/lib/permissions";
import type { CurrentUser, Site } from "@/types";

export function RoleSwitcher() {
  const { user, setUserId, users } = useCurrentUser();
  const [sites, setSites] = useState<Site[]>([]);

  useEffect(() => {
    fetch("/api/sites")
      .then((r) => r.json())
      .then((data) => setSites(data.sites ?? []));
  }, []);

  function labelFor(u: CurrentUser): string {
    const base = `${u.name} — ${LEVEL_LABELS[u.level]}`;
    if (u.level !== "L2") return base;
    const site = sites.find((s) => s.id === u.siteId);
    return site ? `${base} (${site.name})` : base;
  }

  return (
    <div className="flex items-center justify-between gap-2 bg-amber-50 px-4 py-1.5 text-xs text-amber-900">
      <span className="font-medium">Preview as</span>
      <select
        value={user.id}
        onChange={(e) => setUserId(e.target.value)}
        className="rounded border border-amber-300 bg-white px-2 py-1 text-xs"
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {labelFor(u)}
          </option>
        ))}
      </select>
    </div>
  );
}
