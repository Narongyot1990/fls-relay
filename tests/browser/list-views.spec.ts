import { expect, test, type Page } from "@playwright/test";
import type { InventoryItem } from "../../lib/inventory";
import { summarizeSites } from "../../lib/site-tracking";

async function fixture(page: Page) {
  const siteId = "aaaaaaaaaaaaaaaaaaaaaaaa", otherSite = "bbbbbbbbbbbbbbbbbbbbbbbb";
  const sites = [{ id: siteId, code: "QA_A", name: "QA Rayong logistics site", active: true }, { id: otherSite, code: "QA_B", name: "QA Chonburi site", active: true }];
  const people = [
    { id: "dddddddddddddddddddddddd", name: "QA Driver With Phone", employeeNo: "QA-001", type: "driver", siteId, active: true, phone: "0812345678" },
    { id: "eeeeeeeeeeeeeeeeeeeeeeee", name: "QA Driver Without Phone", employeeNo: "QA-002", type: "driver", siteId, active: true, phone: "" },
    { id: "ffffffffffffffffffffffff", name: "QA Site Leader", employeeNo: "QA-SL", type: "site_leader", siteId, active: true, phone: "" },
  ];
  const devices: InventoryItem[] = Array.from({ length: 8 }, (_, i) => ({ id: String(i + 1).padStart(24, "0"), deviceId: `QA-PHONE-${i + 1}-LONG-SERIAL-1234567890`, manufacturer: "Samsung", model: i === 0 ? "Galaxy A15" : "Galaxy A07", deviceName: `QA managed phone ${i + 1}`, imei: "", serial: `QA-SERIAL-${i + 1}`, phoneNumber: "0800000000", status: i === 0 ? "assigned" : i === 1 ? "in_site_stock" : "registered", siteId: i < 2 ? siteId : null, holderId: i === 0 ? people[0].id : null, updatedAt: "2026-11-12T03:00:00Z", mdm: { managedBy: "Intune" } }));
  const writes: string[] = [];
  await page.route("**/api/**", async (route) => {
    const req = route.request(), url = new URL(req.url());
    if (req.method() !== "GET") { writes.push(req.url()); return route.fulfill({ status: 409, json: { error: "QA write blocked" } }); }
    if (url.pathname === "/api/inventory") {
      const isLeader = req.headers()["x-inventory-role"] === "site_leader";
      const site = isLeader ? siteId : url.searchParams.get("site") || "all";
      return route.fulfill({ json: { devices: devices.filter((item) => site === "all" || (site === "central" ? item.siteId === null : item.siteId === site)), assignedDevices: devices.filter((item) => item.holderId), sites: isLeader ? sites.slice(0, 1) : sites, holders: people, leaders: people.filter((p) => p.type === "site_leader"), assignedSite: isLeader ? siteId : null, siteSummaries: summarizeSites(isLeader ? devices.filter((d) => d.siteId === siteId) : devices, isLeader ? sites.slice(0, 1) : sites, people, !isLeader) } });
    }
    if (url.pathname === "/api/inventory/history") return route.fulfill({ json: { transactions: [], hasMore: false } });
    return route.fulfill({ status: 501, json: { error: "Unexpected test request" } });
  });
  return { devices, people, sites, writes };
}
async function open(page: Page, action: string) {
  const nav = page.getByRole("navigation");
  if (!await nav.getByRole("button", { name: action, exact: true }).count()) await nav.getByRole("button", { name: "More", exact: true }).click();
  await nav.getByRole("button", { name: action, exact: true }).click();
}
async function toggle(page: Page, view: "Card" | "Table") { await page.getByRole("group", { name: "List view", exact: true }).getByRole("button", { name: view, exact: true }).click(); }
async function fits(page: Page) { expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
async function shot(page: Page, file: string) { await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" })); await page.addStyleTag({ content: "nextjs-portal {display:none!important}" }); await page.screenshot({ path: `test-results/${file}.png`, fullPage: true }); }

test("Inventory switches preserve filters, sorting, grouping, actions and saved preference", async ({ page }) => {
  const state = await fixture(page); await page.goto("/preview"); await open(page, "Devices");
  await page.getByRole("combobox", { name: "Filter device status", exact: true }).selectOption("assigned"); await page.getByLabel("Sort devices", { exact: true }).selectOption("model");
  await toggle(page, "Table"); await expect(page.getByRole("table")).toHaveCount(1); await expect(page.locator("[data-device-id]")).toHaveCount(1); await expect(page.locator("[data-assigned-site-group]")).toHaveCount(1);
  await expect(page.getByLabel("Sort devices", { exact: true })).toHaveValue("model");
  const detail = page.getByRole("button", { name: `Details for ${state.devices[0].deviceId}`, exact: true }); await detail.click(); await expect(detail).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("QA-SERIAL-1", { exact: true })).toBeVisible(); await expect(page.getByRole("button", { name: "Edit", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "View history", exact: true }).click(); await expect(page.getByText(state.devices[0].deviceId, { exact: true })).toBeVisible();
  await page.getByRole("banner").getByRole("button", { name: "Back to menu", exact: true }).click(); await open(page, "Devices");
  await expect(page.getByRole("button", { name: "Table", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("combobox", { name: "Filter device status", exact: true }).selectOption("all"); await page.getByRole("textbox").fill("QA-PHONE-2-"); await expect(page.locator("[data-device-id]")).toHaveCount(1);
  await toggle(page, "Card"); await expect(page.getByRole("article")).toHaveCount(1); await toggle(page, "Table"); await expect(page.locator("[data-device-id]")).toHaveCount(1);
  await page.reload(); await open(page, "Devices"); await expect(page.getByRole("button", { name: "Table", exact: true })).toHaveAttribute("aria-pressed", "true"); expect(state.writes).toHaveLength(0);
});

test("Inventory table fits phone, tablet and desktop with expandable technical details", async ({ page }) => {
  await fixture(page); await page.goto("/preview"); await open(page, "Devices"); await toggle(page, "Table");
  for (const width of [320, 390, 768, 1366]) {
    await page.setViewportSize({ width, height: 900 }); await fits(page); await expect(page.getByRole("table")).toBeVisible();
    if (width === 390 || width === 1366) await shot(page, `inventory-table-${width === 390 ? "mobile" : "desktop"}`);
  }
  await page.setViewportSize({ width: 320, height: 844 }); await page.getByRole("button", { name: /^Details for QA-PHONE-1-/ }).click(); await fits(page); await expect(page.getByText("QA-SERIAL-1", { exact: true })).toBeVisible();
  const detailId = await page.getByRole("button", { name: /^Details for QA-PHONE-1-/ }).getAttribute("aria-controls");
  const expandedCell = page.locator(`[id="${detailId}"] > td`);
  await expect(expandedCell).toHaveAttribute("colspan", "3"); await page.setViewportSize({ width: 1366, height: 900 }); await expect(expandedCell).toHaveAttribute("colspan", "6"); await fits(page);
  await page.setViewportSize({ width: 320, height: 844 }); await expect(expandedCell).toHaveAttribute("colspan", "3"); await fits(page);
});

test("People and sites have independent preferences, retained filters and management actions", async ({ page }) => {
  const state = await fixture(page); await page.goto("/preview?manage=people"); await toggle(page, "Table");
  await page.getByRole("combobox", { name: "Person type", exact: true }).selectOption("driver"); await expect(page.getByRole("table").getByRole("heading")).toHaveCount(2);
  await page.getByRole("textbox").fill("QA-002"); await expect(page.getByRole("table").getByRole("heading")).toHaveCount(1);
  await page.getByRole("button", { name: "Details for QA Driver Without Phone", exact: true }).click(); await page.getByRole("button", { name: "Edit", exact: true }).click(); await expect(page.getByRole("form", { name: "Edit person", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click(); await page.getByRole("textbox").clear();
  const detailCell = await page.getByRole("button", { name: "Details for QA Driver Without Phone", exact: true }).boundingBox();
  const tableBox = await page.getByRole("table").boundingBox();
  expect(detailCell!.x).toBeGreaterThan(tableBox!.x + tableBox!.width - 65);
  await shot(page, "people-table-mobile"); await page.setViewportSize({ width: 1366, height: 900 }); await shot(page, "people-table-desktop");
  await page.getByRole("button", { name: "Sites", exact: true }).click(); await expect(page.getByRole("button", { name: "Card", exact: true })).toHaveAttribute("aria-pressed", "true");
  await toggle(page, "Table"); await page.getByRole("button", { name: `Details for ${state.sites[0].name}`, exact: true }).click(); await expect(page.getByRole("button", { name: "View site inventory", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "View site inventory", exact: true }).click(); await expect(page.locator("[data-device-id]")).toHaveCount(2); expect(state.writes).toHaveLength(0);
});

test("Driver and phone selection survive switching views and the signing step stays guarded", async ({ page }) => {
  const state = await fixture(page); await page.goto("/preview"); await open(page, "Issue to driver");
  await toggle(page, "Table"); await expect(page.getByRole("table")).toContainText("QA Driver Without Phone"); await expect(page.getByRole("table")).not.toContainText("QA Driver With Phone");
  await page.getByRole("button", { name: "QA Driver Without Phone", exact: true }).click(); await toggle(page, "Card"); await expect(page.getByRole("button", { name: /QA Driver Without Phone QA-002/ })).toHaveAttribute("aria-pressed", "true");
  await toggle(page, "Table"); await page.getByRole("button", { name: "Next: choose a phone", exact: true }).click(); await toggle(page, "Table");
  await page.getByRole("button", { name: `Select phone ${state.devices[1].deviceId}`, exact: true }).click(); await toggle(page, "Card"); await expect(page.getByRole("button", { name: new RegExp(state.devices[1].deviceId) })).toHaveAttribute("aria-pressed", "true");
  await toggle(page, "Table"); await fits(page); await page.getByRole("button", { name: "Hand over · Open agreement", exact: true }).click();
  await expect(page.getByRole("button", { name: "Submit · Confirm receipt", exact: true })).toBeDisabled(); expect(state.writes).toHaveLength(0);
});

test("Assigned driver table opens phone details without selecting and keeps Return selection", async ({ page }) => {
  const state = await fixture(page); await page.goto("/preview"); await open(page, "Return"); await toggle(page, "Table");
  await page.getByRole("button", { name: "Details for QA Driver With Phone", exact: true }).click(); await page.getByRole("button", { name: "Phone details for QA Driver With Phone", exact: true }).click(); await expect(page.getByRole("dialog")).toContainText("QA-SERIAL-1"); await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Next · Return details", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "QA Driver With Phone", exact: true }).click(); await toggle(page, "Card"); await page.getByRole("button", { name: "Next · Return details", exact: true }).click(); await expect(page.getByText(state.devices[0].deviceId, { exact: true })).toBeVisible(); expect(state.writes).toHaveLength(0);
});

test("Exchange supports the same table selectors without losing the replacement", async ({ page }) => {
  const state = await fixture(page); await page.goto("/preview"); await open(page, "Exchange"); await toggle(page, "Table"); await page.getByRole("button", { name: "QA Driver With Phone", exact: true }).click();
  await page.getByRole("button", { name: "Next · Condition & replacement", exact: true }).click(); await toggle(page, "Table"); await page.getByRole("button", { name: `Select phone ${state.devices[1].deviceId}`, exact: true }).click();
  await toggle(page, "Card"); await toggle(page, "Table"); await page.getByRole("button", { name: "Continue · Sign for replacement", exact: true }).click();
  await expect(page.getByRole("button", { name: "Submit · Confirm receipt", exact: true })).toBeDisabled(); expect(state.writes).toHaveLength(0);
});

test("Thai table controls and empty filtered results fit small screens", async ({ page }) => {
  await fixture(page); await page.setViewportSize({ width: 320, height: 844 }); await page.goto("/preview?manage=people"); await page.getByRole("button", { name: "TH", exact: true }).click();
  await page.getByRole("group", { name: "มุมมองรายการ", exact: true }).getByRole("button", { name: "ตาราง", exact: true }).click(); await fits(page);
  await expect(page.getByRole("columnheader", { name: "บุคลากร", exact: true })).toBeVisible(); await expect(page.getByRole("columnheader", { name: "สถานะ", exact: true })).toBeVisible();
  await expect(page.getByRole("table")).not.toContainText("???");
  await page.getByRole("button", { name: "รายละเอียด QA Driver With Phone", exact: true }).click(); await fits(page); await expect(page.getByRole("button", { name: "แก้ไข", exact: true })).toBeVisible();
  await page.getByRole("textbox").fill("no-match-qa"); await expect(page.getByText("ไม่มีรายการที่ตรงกับการค้นหาและตัวกรอง", { exact: true })).toBeVisible(); await fits(page);
});

test("Inventory controls use three mobile rows and one desktop row without duplicate scope or summaries", async ({ page }) => {
  const state = await fixture(page); await page.goto("/preview"); await open(page, "Devices"); await toggle(page, "Table");
  const toolbar = page.getByTestId("inventory-toolbar");
  await expect(toolbar.locator("[data-toolbar-row]")).toHaveCount(3);
  await expect(page.getByTestId("workspace-scope")).toHaveCount(1); await expect(page.getByRole("banner").getByTestId("workspace-scope")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Track by site", exact: true })).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "Filter device status", exact: true }).getByRole("option", { name: "In stock · 7", exact: true })).toHaveCount(1);
  for (const width of [320, 390, 768, 1366]) {
    await page.setViewportSize({ width, height: 844 }); await fits(page);
    const box = await toolbar.boundingBox(), first = await page.locator("[data-device-id]").first().boundingBox();
    expect(box!.height).toBeLessThan(width >= 1024 ? 65 : 160); expect(first!.y).toBeLessThan(330);
    if (width === 390 || width === 1366) await shot(page, `compact-inventory-${width === 390 ? "mobile" : "desktop"}`);
  }
  await page.setViewportSize({ width: 320, height: 844 }); await page.getByRole("button", { name: "TH", exact: true }).click(); await fits(page);
  expect((await toolbar.boundingBox())!.height).toBeLessThan(160); expect(state.writes).toHaveLength(0);
});
