import { ObjectId, type Collection } from "mongodb";
import { getDb } from "./mongodb";

export type CustodyTransactionType = "transfer" | "receipt" | "issue" | "return" | "exchange";

export interface CustodyTransactionDoc {
  _id: ObjectId;
  type: CustodyTransactionType;
  deviceId: ObjectId;
  fromSiteId: ObjectId | null;
  toSiteId: ObjectId | null;
  fromHolderId: ObjectId | null;
  toHolderId: ObjectId | null;
  condition?: "ok" | "damaged";
  signature?: string;
  accessories?: number[];
  policyVersion?: string;
  replacementRef?: string;
  actorRole: string;
  actor: string;
  at: Date;
}

export interface CustodyTransactionItem {
  id: string; type: CustodyTransactionType; deviceId: string;
  fromSiteId: string | null; toSiteId: string | null; fromHolderId: string | null; toHolderId: string | null;
  condition?: "ok" | "damaged"; actorRole: string; actor: string; at: string;
}

export function custodyTransactionItem(doc: CustodyTransactionDoc): CustodyTransactionItem {
  return {
    id: doc._id.toHexString(), type: doc.type, deviceId: doc.deviceId.toHexString(),
    fromSiteId: doc.fromSiteId?.toHexString() ?? null, toSiteId: doc.toSiteId?.toHexString() ?? null,
    fromHolderId: doc.fromHolderId?.toHexString() ?? null, toHolderId: doc.toHolderId?.toHexString() ?? null,
    condition: doc.condition, actorRole: doc.actorRole, actor: doc.actor, at: doc.at.toISOString(),
  };
}

export async function transactionCollection() { return (await getDb()).collection<CustodyTransactionDoc>("custody_transactions"); }

/** Called only by explicit write requests, never by history reads. */
export async function ensureTransactionIndexes(collection: Collection<CustodyTransactionDoc>) {
  await collection.createIndex({ deviceId: 1, at: -1 }, { name: "custody_device_at" });
  await collection.createIndex({ type: 1 }, { name: "custody_type" });
}
