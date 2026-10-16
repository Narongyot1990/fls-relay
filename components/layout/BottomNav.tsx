"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Inbox, Smartphone } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  // Inbox badge is 0 until hand-out/take-back/swap confirmation is wired to the database.
  const items = [
    { href: "/", label: "Home", icon: Home, badge: 0 },
    { href: "/inbox", label: "Inbox", icon: Inbox, badge: 0 },
    { href: "/devices", label: "Phones", icon: Smartphone, badge: 0 },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)]">
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-1 flex-col items-center gap-1 py-2.5"
          >
            <span className="relative">
              <Icon
                className={`h-6 w-6 ${active ? "text-neutral-900" : "text-neutral-400"}`}
              />
              {item.badge ? (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                  {item.badge}
                </span>
              ) : null}
            </span>
            <span
              className={`text-xs ${active ? "font-medium text-neutral-900" : "text-neutral-400"}`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
