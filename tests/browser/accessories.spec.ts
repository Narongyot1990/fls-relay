import { setRole } from "./helpers/profile";
import { test, expect, type Page } from "@playwright/test";
import type { InventoryItem } from "../../lib/inventory";

async function setup(page: Page, recorded = true) {
  const siteId = "aaaaaaaaaaaaaaaaaaaaaaaa", driverId = "dddddddddddddddddddddddd";
  const device = (id: string, label: string): InventoryItem => ({ id, deviceId: label, deviceName: "", model: "Test phone", imei: "", serial: "", phoneNumber: "", status: "in_site_stock", siteId, holderId: null, mdm: {} });
  const state = {
    devices: [{ ...device("111111111111111111111111", "PHONE-OLD"), status: "assigned", holderId: driverId, ...(recorded ? { assignment: { id: "333333333333333333333333", at: "2026-11-09T00:00:00Z", accessories: [0, 1] } } : {}) }, device("222222222222222222222222", "PHONE-NEW")],
    writes: [] as Record<string, unknown>[],
  };
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url()), request = route.request();
    const json = (data: unknown) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
    if (url.pathname === "/api/inventory") return json({ devices: state.devices, assignedDevices: state.devices.filter((item) => item.holderId), sites: [{ id: siteId, code: "QA", name: "Test site", active: true }], holders: [{ id: driverId, employeeNo: "QA-01", name: "Accessory Driver", type: "driver", siteId, active: true }], leaders: [], assignedSite: null });
    if (url.pathname === "/api/inventory/history") return json({ transactions: [
      { id: "history-return", type: "return", deviceId: state.devices[0].id, deviceLabel: "PHONE-OLD", model: "Test phone", issuedAccessories: [0, 1], returnedAccessories: [0], accessoryNotes: "USB cable lost", actorRole: "implementation", at: "2026-11-09T03:00:00Z" },
      { id: "history-issue", type: "issue", deviceId: state.devices[0].id, deviceLabel: "PHONE-OLD", model: "Test phone", accessories: [0, 1], actorRole: "implementation", at: "2026-11-08T03:00:00Z" },
    ] });
    if (request.method() === "POST" && ["/api/inventory/return", "/api/inventory/exchange"].includes(url.pathname)) { state.writes.push(request.postDataJSON()); return json({ recorded: true }); }
    return route.fulfill({ status: 501, contentType: "application/json", body: JSON.stringify({ error: "Unexpected test request" }) });
  });
  await page.goto("/preview"); await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" }); await setRole(page, "implementation");
  return state;
}

async function open(page: Page, name: string) { await page.getByRole("navigation").getByRole("button", { name, exact: true }).click(); }
async function selectDriver(page: Page) { await page.getByRole("button", { name: /Accessory Driver QA-01/ }).click(); }

test("New generated icons and the compact FLS header load on mobile and desktop", async ({ page }) => {
  await setup(page);
  await expect(page.getByRole("img", { name: "FLS", exact: true })).toBeVisible();
  const logo = await page.getByRole("img", { name: "FLS", exact: true }).boundingBox(); expect(logo?.width).toBe(36);
  await expect(page.getByRole("navigation").locator("svg")).toHaveCount(0);
  expect(await page.getByRole("navigation").locator("[data-brand-icon]").count()).toBeGreaterThan(10);
  const response = await page.request.get("/brand/fls-icon-atlas.png"); expect(response.status()).toBe(200);
  expect((await page.request.get("/brand/fls-logo-source.jpg")).status()).toBe(200);
  await page.screenshot({ path: "test-results/fls-home-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.screenshot({ path: "test-results/fls-home-desktop.png", fullPage: true });
});

test("Issued accessories are available in the driver details popup and transaction history", async ({ page }) => {
  await setup(page); await open(page, "Issue to driver");
  await page.getByRole("button", { name: "Phone details for Accessory Driver", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Charger adaptor"); await expect(page.getByRole("dialog")).toContainText("USB Cable");
  await expect(page.getByRole("dialog")).not.toContainText("Protective Case");
  await page.keyboard.press("Escape"); await page.getByRole("button", { name: "Back", exact: true }).click();
  await open(page, "History / Documents"); await page.locator("summary").click();
  await expect(page.getByText("Accessory notes: USB cable lost", { exact: true })).toBeVisible();
  await expect(page.getByText("Missing", { exact: true })).toBeVisible();
  await expect(page.getByText("Received", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/accessory-history-mobile.png", fullPage: true });
});

test("Partial accessory return requires a checked checklist and missing-item explanation", async ({ page }) => {
  const state = await setup(page); await open(page, "Return"); await selectDriver(page);
  const confirm = page.getByRole("button", { name: "Record return", exact: true });
  await expect(confirm).toBeDisabled();
  await page.getByRole("checkbox", { name: "Charger adaptor", exact: true }).check();
  await page.getByRole("checkbox", { name: "I checked the returned accessories", exact: true }).check();
  await expect(confirm).toBeDisabled(); expect(state.writes).toHaveLength(0);
  await page.getByLabel("Missing accessory notes (required)", { exact: true }).fill("USB cable lost");
  await expect(page.getByRole("checkbox", { name: "Protective Case", exact: true })).toHaveCount(0);
  await page.screenshot({ path: "test-results/accessory-return-mobile.png", fullPage: true });
  await confirm.click(); expect(state.writes[0]).toMatchObject({ assignmentId: "333333333333333333333333", returnedAccessories: [0], accessoriesChecked: true, accessoryNotes: "USB cable lost" });
});

test("Complete accessory return records both items without requiring missing notes", async ({ page }) => {
  const state = await setup(page); await open(page, "Return"); await selectDriver(page);
  await page.getByRole("checkbox", { name: "Charger adaptor", exact: true }).check(); await page.getByRole("checkbox", { name: "USB Cable", exact: true }).check();
  await page.getByRole("checkbox", { name: "I checked the returned accessories", exact: true }).check();
  await page.getByRole("button", { name: "Record return", exact: true }).click();
  expect(state.writes[0]).toMatchObject({ returnedAccessories: [0, 1], accessoryNotes: "", accessoriesChecked: true });
});

test("Exchange returns the old accessory kit and signs for an independent replacement kit", async ({ page }) => {
  const state = await setup(page); await open(page, "Exchange"); await selectDriver(page);
  await page.getByRole("button", { name: /PHONE-NEW/ }).click();
  const next = page.getByRole("button", { name: "Continue · Sign for replacement", exact: true }); await expect(next).toBeDisabled();
  await page.getByRole("checkbox", { name: "Charger adaptor", exact: true }).check(); await page.getByRole("checkbox", { name: "USB Cable", exact: true }).check(); await page.getByRole("checkbox", { name: "I checked the returned accessories", exact: true }).check();
  await next.click();
  await page.getByRole("checkbox", { name: "Protective Case", exact: true }).check();
  const canvas = page.locator("canvas"); await canvas.scrollIntoViewIfNeeded(); const box = await canvas.boundingBox();
  await page.mouse.move(box!.x + 25, box!.y + 25); await page.mouse.down(); await page.mouse.move(box!.x + 100, box!.y + 70, { steps: 8 }); await page.mouse.up();
  await page.getByRole("checkbox").last().check(); await page.getByRole("button", { name: "Submit · Confirm receipt", exact: true }).click();
  await expect(page.getByText("Handover recorded", { exact: true })).toBeVisible();
  expect(state.writes[0]).toMatchObject({ returnedAccessories: [0, 1], accessories: [2], accessoriesChecked: true });
});

test("Legacy assignments without accessory evidence explicitly remain unknown", async ({ page }) => {
  const state = await setup(page, false); await open(page, "Return"); await selectDriver(page);
  await expect(page.getByText("No accessory record on the original issue. Completeness cannot be verified.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Record return", exact: true }).click(); expect(state.writes[0].accessoriesChecked).toBe(false);
});
