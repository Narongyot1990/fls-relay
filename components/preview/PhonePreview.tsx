"use client";

import { InventoryWorkspace, type WorkspaceStartProps } from "@/components/inventory/InventoryWorkspace";

export function PhonePreview(props: WorkspaceStartProps) {
  return <InventoryWorkspace {...props} />;
}
