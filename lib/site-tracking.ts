export interface SiteSummary {
  siteId: string | null; code: string; name: string; active: boolean;
  total: number; assigned: number; inStock: number; pending: number; unavailable: number;
  driverCount: number; driversWithPhone: number; statuses: Record<string, number>;
}

/** Counts physical phone location separately from driver affiliation. No assignments are inferred. */
export function summarizeSites(
  devices: { siteId: string | null; holderId: string | null; status: string }[],
  sites: { id: string; code: string; name: string; active: boolean }[],
  people: { id: string; siteId: string; type: string; active: boolean }[],
  includeCentral = true,
): SiteSummary[] {
  const summaries = new Map<string | null, SiteSummary>();
  const add = (siteId: string | null, code = "", name = "", active = false) => {
    if (!summaries.has(siteId)) summaries.set(siteId, { siteId, code, name, active, total: 0, assigned: 0, inStock: 0, pending: 0, unavailable: 0, driverCount: 0, driversWithPhone: 0, statuses: {} });
    return summaries.get(siteId)!;
  };
  for (const site of sites) add(site.id, site.code, site.name, site.active);
  if (includeCentral) add(null, "", "", true);
  const holdersBySite = new Map<string | null, Set<string>>();
  for (const phone of devices) {
    const row = add(phone.siteId);
    row.total++; row.statuses[phone.status] = (row.statuses[phone.status] || 0) + 1;
    if (phone.status === "assigned") {
      row.assigned++;
      if (phone.holderId) { const holders = holdersBySite.get(phone.siteId) || new Set<string>(); holders.add(phone.holderId); holdersBySite.set(phone.siteId, holders); }
    } else if (["registered", "in_site_stock"].includes(phone.status)) row.inStock++;
    else if (phone.status === "in_transit") row.pending++;
    else row.unavailable++;
  }
  for (const person of people) if (person.type === "driver" && person.active) {
    const row = add(person.siteId);
    row.driverCount++;
    if (holdersBySite.get(person.siteId)?.has(person.id)) row.driversWithPhone++;
  }
  return [...summaries.values()].sort((a, b) => a.siteId === null ? 1 : b.siteId === null ? -1 : (a.code || a.name).localeCompare(b.code || b.name));
}

export function countForStatus(row: SiteSummary, status: string) {
  return status === "all" ? row.total : status === "stock" ? row.inStock : row.statuses[status] || 0;
}
