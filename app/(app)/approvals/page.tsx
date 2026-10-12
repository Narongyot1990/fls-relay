import { CheckSquare } from "lucide-react";
import { RequireLevel } from "@/components/shared/RequireLevel";
import { EmptyState } from "@/components/shared/EmptyState";

export default function ApprovalsPage() {
  return (
    <RequireLevel allow={["L4"]}>
      <div className="flex flex-col gap-4 px-4 py-5">
        <h1 className="text-xl font-semibold text-neutral-900">Approvals</h1>
        <EmptyState icon={CheckSquare} message="Write-off and loss approvals are coming soon" />
      </div>
    </RequireLevel>
  );
}
