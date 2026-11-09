import { ObjectId, type ClientSession, type Collection } from "mongodb";
import type { InventoryItem } from "@/lib/inventory";
import { recordedAccessories } from "@/lib/accessories";
import { InventoryError } from "@/lib/inventory-access";
import { transactionCollection, type CustodyTransactionDoc } from "@/lib/db/transactions";

/** One query for all assigned phones; never expose signature image data on inventory reads. */
export async function withAssignments(items: InventoryItem[]) {
  if (!items.length) return items;
  const rows = await (await transactionCollection()).aggregate<{
    _id: ObjectId; assignment: { id: ObjectId; holderId: ObjectId | null; accessories?: number[]; at: Date };
  }>([
    { $match: { type: "issue", deviceId: { $in: items.map((item) => new ObjectId(item.id)) } } },
    { $sort: { at: -1, _id: -1 } },
    { $group: { _id: "$deviceId", assignment: { $first: { id: "$_id", holderId: "$toHolderId", accessories: "$accessories", at: "$at" } } } },
  ]).toArray();
  const assignments = new Map(rows.map((row) => [row._id.toHexString(), row.assignment]));
  return items.map((item) => {
    const assignment = assignments.get(item.id);
    if (!assignment || assignment.holderId?.toHexString() !== item.holderId) return item;
    return { ...item, assignment: { id: assignment.id.toHexString(), at: assignment.at.toISOString(), accessories: recordedAccessories(assignment.accessories) } };
  });
}

/** Derive the issued checklist from immutable history, never from the posted list. */
export async function checkAccessoryReturn(transactions: Collection<CustodyTransactionDoc>, deviceId: ObjectId, holderId: ObjectId | null, body: Record<string, unknown>, session: ClientSession) {
  const issue = await transactions.findOne({ type: "issue", deviceId }, { sort: { at: -1, _id: -1 }, session, projection: { signature: 0 } });
  const current = issue?.toHolderId?.equals(holderId) ? issue : undefined;
  if (current && body.assignmentId !== current._id.toHexString()) throw new InventoryError("Assignment changed; reload the issued accessory checklist before returning", 409);
  const issuedAccessories = recordedAccessories(current?.accessories);
  const returnedAccessories = recordedAccessories(body.returnedAccessories ?? []);
  if (!returnedAccessories) throw new InventoryError("Invalid returned accessories");
  if (typeof body.accessoryNotes !== "undefined" && (typeof body.accessoryNotes !== "string" || body.accessoryNotes.length > 1000)) throw new InventoryError("Accessory notes must be at most 1000 characters");
  const accessoryNotes = typeof body.accessoryNotes === "string" ? body.accessoryNotes.trim() : "";
  if (returnedAccessories.some((id) => !issuedAccessories?.includes(id))) throw new InventoryError("Only accessories from the original issue may be marked returned");
  const missingAccessories = issuedAccessories?.filter((id) => !returnedAccessories.includes(id));
  if (issuedAccessories?.length && body.accessoriesChecked !== true) throw new InventoryError("Confirm that you checked the returned accessories");
  if (missingAccessories?.length && !accessoryNotes) throw new InventoryError("Explain any missing accessories before recording the return");
  return { assignmentId: current?._id, issuedAccessories, returnedAccessories, missingAccessories, accessoriesChecked: body.accessoriesChecked === true, accessoryNotes };
}
