import { ClipboardList } from "lucide-react";
import { RequireLevel } from "@/components/shared/RequireLevel";
import { EmptyState } from "@/components/shared/EmptyState";

export default function StockCountPage() {
  return (
    <RequireLevel allow={["L3", "L4"]}>
      <div className="flex flex-col gap-4 px-4 py-5">
        <h1 className="text-xl font-semibold text-neutral-900">Stock count</h1>
        <EmptyState icon={ClipboardList} message="Stock count entry is coming soon" />
      </div>
    </RequireLevel>
  );
}
