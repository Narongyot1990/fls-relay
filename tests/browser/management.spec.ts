import { setRole } from "./helpers/profile";
import { test, expect, type Page } from "@playwright/test";
import type { DirectoryPerson, DirectorySite } from "../../lib/directory";
import type { InventoryItem } from "../../lib/inventory";

async function setup(page: Page) {
  const site = "aaaaaaaaaaaaaaaaaaaaaaaa", emptySite = "bbbbbbbbbbbbbbbbbbbbbbbb", driver = "dddddddddddddddddddddddd";
  const device = (index: number, status: string, siteId: string | null, holderId: string | null): InventoryItem => ({ id: String(index).padStart(24, "0"), deviceId: `QA-PHONE-${index}`, model: index === 1 ? "Galaxy A15" : "Nokia C32", deviceName: `Intune QA ${index}`, imei: "", serial: `QA-SERIAL-${index}`, phoneNumber: "0800000000", status, siteId, holderId, updatedAt: "2026-11-09T03:00:00Z", mdm: {} });
  const state = {
    sites: [{ id: site, code: "QA", name: "Rayong test site", active: true }, { id: emptySite, code: "EMPTY", name: "Unused test site", active: true }] as DirectorySite[],
    people: [{ id: driver, name: "Ada Driver", employeeNo: "QA-001", type: "driver", siteId: site, active: true, phone: "0812345678" }, { id: "eeeeeeeeeeeeeeeeeeeeeeee", name: "Ben Driver", employeeNo: "QA-002", type: "driver", siteId: site, active: true, phone: "" }, { id: "ffffffffffffffffffffffff", name: "QA Site Leader", employeeNo: "QA-SL", type: "site_leader", siteId: site, active: true, phone: "" }] as DirectoryPerson[],
    devices: [device(1, "assigned", site, driver), device(2, "in_site_stock", site, null), device(3, "damaged", site, null), device(4, "registered", null, null)],
    writes: [] as { method: string; path: string; body?: Record<string, unknown> }[], historyUrls: [] as string[], rejectDelete: false, deleteGate: undefined as Promise<void> | undefined,
  };
  await page.route("**/api/**", async (route) => {
    const request = route.request(), url = new URL(request.url());
    const json = (status: number, data: unknown) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (url.pathname === "/api/inventory") {
      const selectedSite = url.searchParams.get("site") || "all";
      const devices = state.devices.filter((item) => selectedSite === "all" || (selectedSite === "central" ? !item.siteId : item.siteId === selectedSite));
      return json(200, { devices, sites: state.sites, holders: state.people, leaders: state.people.filter((person) => person.type === "site_leader" && person.active), assignedDevices: devices.filter((item) => item.holderId), assignedSite: null });
    }
    const match = url.pathname.match(/^\/api\/inventory\/(sites|people)\/([^/]+)$/);
    if (match && ["PATCH", "DELETE"].includes(request.method())) {
      const body = request.method() === "PATCH" ? request.postDataJSON() : undefined;
      state.writes.push({ method: request.method(), path: url.pathname, body });
      if (request.method() === "DELETE") {
        await state.deleteGate;
        if (state.rejectDelete) return json(409, { error: "Cannot delete: history references this record. Deactivate it instead to preserve tracking." });
        if (match[1] === "sites") state.sites = state.sites.filter((item) => item.id !== match[2]); else state.people = state.people.filter((item) => item.id !== match[2]);
        return json(200, { deleted: true });
      }
      if (match[1] === "sites") { state.sites = state.sites.map((item) => item.id === match[2] ? { ...item, ...body } : item); return json(200, { site: state.sites.find((item) => item.id === match[2]) }); }
      state.people = state.people.map((item) => item.id === match[2] ? { ...item, ...body } : item); return json(200, { person: state.people.find((item) => item.id === match[2]) });
    }
    if (url.pathname === "/api/inventory/history") {
      state.historyUrls.push(url.href);
      const rows = [
        { id: "event-2", deviceId: state.devices[0].id, deviceLabel: state.devices[0].deviceId, model: "Galaxy A15", type: "issue", fromSiteName: "Rayong test site", fromHolderName: null, toHolderName: "Ada Driver", toSiteName: "Rayong test site", actorRole: "site_leader", at: "2026-11-09T03:00:00Z", accessories: [0, 1], signerName: "Ada Driver" },
        { id: "event-1", deviceId: state.devices[1].id, deviceLabel: state.devices[1].deviceId, model: "Nokia C32", type: "return", fromHolderName: "Ben Driver", fromSiteName: "Rayong test site", toHolderName: null, toSiteName: "Rayong test site", actorRole: "implementation", at: "2026-11-08T03:00:00Z", condition: "ok", reason: "Driver rotation", issuedAccessories: [0, 1], returnedAccessories: [0], accessoryNotes: "Cable outstanding" },
      ];
      return json(200, { transactions: rows.filter((row) => !url.searchParams.get("device") || row.deviceId === url.searchParams.get("device")), hasMore: false });
    }
    return json(501, { error: "Unexpected test request; blocked" });
  });
  return state;
}
async function navigate(page: Page, name: string) { await page.getByRole("navigation").getByRole("button", { name, exact: true }).click(); }
async function screenshot(page: Page, name: string) { await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" }); await page.screenshot({ path: `test-results/${name}.png`, fullPage: true }); }

test("Administration opens the current site and people management screens", async ({ page }) => {
  await setup(page); await page.goto("/preview"); await setRole(page, "system_admin"); await navigate(page, "Administration");
  await expect(page.getByRole("heading", { name: "Administration", exact: true })).toBeVisible();
  await expect(page.getByText(/Screen outline/)).toHaveCount(0);
  await screenshot(page, "administration-mobile");
  await page.getByRole("button").filter({ has: page.getByRole("heading", { name: "Sites", exact: true }) }).click();
  await expect(page.getByRole("heading", { name: "Unused test site", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit", exact: true })).toHaveCount(2);
});

test("Site edit, deactivate and reactivate persist through the current API", async ({ page }) => {
  const state = await setup(page); await page.goto("/preview?manage=sites");
  const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Unused test site", exact: true }) });
  await card.getByRole("button", { name: "Edit", exact: true }).click();
  const form = page.getByRole("form", { name: "Edit site", exact: true });
  await form.getByLabel("Site name", { exact: true }).fill("Renamed test site"); await form.getByLabel("Active record", { exact: true }).uncheck(); await form.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Record updated.", { exact: true })).toBeVisible();
  await page.getByLabel("Record status", { exact: true }).selectOption("inactive");
  const renamed = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Renamed test site", exact: true }) });
  await expect(renamed).toContainText("Inactive");
  await renamed.getByRole("button", { name: "Reactivate", exact: true }).click(); await page.getByRole("form", { name: "Edit site", exact: true }).getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => state.sites[1].active).toBe(true);
  expect(state.writes.filter((item) => item.method === "PATCH")).toHaveLength(2);
});

test("People can be edited and unused records deleted with pending feedback and one request", async ({ page }) => {
  const state = await setup(page); await page.goto("/preview?manage=people");
  const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Ben Driver", exact: true }) });
  await card.getByRole("button", { name: "Edit", exact: true }).click();
  const form = page.getByRole("form", { name: "Edit person", exact: true }); await form.getByLabel("Full name", { exact: true }).fill("Ben Updated"); await form.getByLabel("Phone number (optional)", { exact: true }).fill("0890000000"); await form.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ben Updated", exact: true })).toBeVisible();
  await page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Ben Updated", exact: true }) }).getByRole("button", { name: "Delete", exact: true }).click();
  let release!: () => void; state.deleteGate = new Promise<void>((resolve) => { release = resolve; });
  const dialog = page.getByRole("dialog"); await dialog.getByRole("button", { name: "Confirm deletion", exact: true }).click();
  try { await expect(dialog.getByRole("button", { name: "Deleting…", exact: true })).toBeDisabled(); await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeDisabled(); } finally { release(); }
  await expect(dialog).toBeHidden(); await expect(page.getByRole("heading", { name: "Ben Updated", exact: true })).toHaveCount(0);
  expect(state.writes.filter((item) => item.method === "DELETE")).toHaveLength(1);
});

test("Referenced records show a deletion error and can be deactivated instead", async ({ page }) => {
  const state = await setup(page); state.rejectDelete = true; await page.goto("/preview?manage=people");
  const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Ben Driver", exact: true }) });
  await card.getByRole("button", { name: "Delete", exact: true }).click(); const dialog = page.getByRole("dialog"); await dialog.getByRole("button", { name: "Confirm deletion", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Deactivate"); await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await card.getByRole("button", { name: "Deactivate", exact: true }).click(); await page.getByRole("form", { name: "Edit person", exact: true }).getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => state.people[1].active).toBe(false);
});

test("Inventory cards show location and holder, support tracking filters and open scoped phone history", async ({ page }) => {
  const state = await setup(page); await page.goto("/preview"); await navigate(page, "Devices");
  const card = page.locator(`[data-device-id="${state.devices[0].id}"]`);
  await expect(card).toContainText("Galaxy A15"); await expect(card).toContainText("Ada Driver"); await expect(card).toContainText("Rayong test site"); await expect(card).toContainText("Assigned");
  await screenshot(page, "inventory-cards-mobile"); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1366, height: 900 }); await screenshot(page, "inventory-cards-desktop");
  await page.getByRole("textbox", { name: "Search devices", exact: true }).fill("Ada Driver"); await expect(page.locator("[data-device-id]")).toHaveCount(1);
  await card.getByRole("button", { name: "View history", exact: true }).click(); await expect(page.locator("summary")).toHaveCount(1);
  expect(new URL(state.historyUrls.at(-1)!).searchParams.get("device")).toBe(state.devices[0].id);
  await expect(page.getByText("History for", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Show all phones", exact: true }).click(); await expect(page.locator("summary")).toHaveCount(2);
});

test("History separates parties and events, with phone groups, timeline and movement filters", async ({ page }) => {
  await setup(page); await page.goto("/preview"); await navigate(page, "History / Documents");
  await page.locator("summary").first().click(); await expect(page.locator('[data-transaction-id="event-2"]')).toContainText("Ada Driver"); await expect(page.locator('[data-transaction-id="event-2"]')).toContainText("Recorded by");
  await screenshot(page, "history-timeline-mobile"); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Timeline", exact: true }).click(); await expect(page.locator("summary")).toHaveCount(0); await expect(page.locator("[data-transaction-id]")).toHaveCount(2);
  await page.getByLabel("Filter movement type", { exact: true }).selectOption("return"); await expect(page.locator("[data-transaction-id]")).toHaveCount(1); await expect(page.locator("[data-transaction-id]")).toContainText("Ben Driver");
  await page.setViewportSize({ width: 1366, height: 900 }); await screenshot(page, "history-timeline-desktop");
});

test("Legacy admin bookmarks redirect to current directory screens", async ({ page }) => {
  await setup(page); await page.goto("/admin/sites"); await expect(page).toHaveURL(/\/preview\?manage=sites/); await expect(page.getByRole("heading", { name: "Directory", exact: true })).toBeVisible(); await expect(page.getByRole("button", { name: "Add site", exact: true })).toBeVisible();
  await page.goto("/admin/holders"); await expect(page).toHaveURL(/\/preview\?manage=people/); await expect(page.getByRole("button", { name: "Add person", exact: true })).toBeVisible();
  await screenshot(page, "directory-cards-mobile");
});
