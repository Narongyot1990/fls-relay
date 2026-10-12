import { Download } from "lucide-react";
import { RequireLevel } from "@/components/shared/RequireLevel";
import { EmptyState } from "@/components/shared/EmptyState";

export default function ExportPage() {
  return (
    <RequireLevel allow={["L4"]}>
      <div className="flex flex-col gap-4 px-4 py-5">
        <h1 className="text-xl font-semibold text-neutral-900">Export</h1>
        <EmptyState icon={Download} message="CSV/Excel export is coming soon" />
      </div>
    </RequireLevel>
  );
}
