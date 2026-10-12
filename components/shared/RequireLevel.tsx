"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { useCurrentUser } from "@/lib/current-user";
import { LEVEL_LABELS } from "@/lib/permissions";
import type { Level } from "@/types";

interface RequireLevelProps {
  allow: Level[];
  children: ReactNode;
}

export function RequireLevel({ allow, children }: RequireLevelProps) {
  const { user } = useCurrentUser();

  if (!allow.includes(user.level)) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <Lock className="h-8 w-8 text-neutral-400" />
        <p className="text-sm text-neutral-600">
          This isn&apos;t available for your role ({LEVEL_LABELS[user.level]}).
        </p>
        <Link href="/" className="text-sm font-medium text-neutral-900 underline">
          Back to home
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
