"use client";

import { useCurrentUser } from "@/lib/current-user";
import { LEVEL_LABELS } from "@/lib/permissions";

export function RoleSwitcher() {
  const { user, setUserId, users } = useCurrentUser();

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
            {u.name} — {LEVEL_LABELS[u.level]}
          </option>
        ))}
      </select>
    </div>
  );
}
