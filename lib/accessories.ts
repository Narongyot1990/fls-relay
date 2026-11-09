/** Stable IDs follow the five entries in the supplied handover policy. */
export const ACCESSORY_COUNT = 5;

export interface AssignmentSummary {
  id: string;
  at: string;
  accessories?: number[];
}

export interface AccessoryReturnInput {
  assignmentId?: string;
  returnedAccessories: number[];
  accessoriesChecked: boolean;
  accessoryNotes: string;
}

export function recordedAccessories(value: unknown): number[] | undefined {
  if (!Array.isArray(value) || !value.every((id) => Number.isInteger(id) && id >= 0 && id < ACCESSORY_COUNT)) return undefined;
  return [...new Set(value)].sort((a, b) => a - b);
}
