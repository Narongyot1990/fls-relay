import { test, expect, type Page } from "@playwright/test";
import { summarizeSites } from "../../lib/site-tracking";
import { setRole } from "./helpers/profile";

async function setup(page: Page, oneUnassigned = false) {
  const sites = [{ id: "aaaaaaaaaaaaaaaaaaaaaaaa", code: "CPO_CHO", name: "CPOCHO", active: true }, { id: "bbbbbbbbbbbbbbbbbbbbbbbb", code: "CPO_MTP", name: "CPOMTP", active: true }];
  const drivers = sites.flatMap((site, index) => Array.from({ length: 6 }, (_, number) => ({ id: `${index + 1}${number}`.padStart(24, "0"), name: `QA ${site.code} Driver ${number + 1}`, employeeNo: `QA-${index}-${number}`, type: "driver", active: true, siteId: site.id, phone: "" })));
  const leaders = sites.map((site, index) => ({ id: String(index + 91).padStart(24, "0"), name: `QA ${site.code} Leader`, employeeNo: `QA-SL-${index}`, type: "site_leader", active: true, siteId: site.id, phone: "" }));
  const phone = (index: number, siteId: string | null, holderId: string | null) => ({ id: String(index + 100).padStart(24, "0"), deviceId: `QA-PHONE-${index + 1}`, deviceName: "QA phone", manufacturer: "Samsung", model: "QA model", imei: "", serial: `QA-SERIAL-${index + 1}`, phoneNumber: "", siteId, holderId, status: holderId ? "assigned" : siteId ? "in_site_stock" : "registered", updatedAt: "2026-11-09T06:00:00Z", mdm: {} });
  const devices = [...drivers.map((driver, n) => phone(n, driver.siteId, oneUnassigned && n === 0 ? null : driver.id)), ...Array.from({ length: 16 }, (_, n) => phone(n + 12, null, null))];
  const state = { reads: [] as string[], writes: 0 };
  await page.route("**/api/**", (route) => {
    const request = route.request(), url = new URL(request.url());
    const json = (status: number, data: unknown) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (request.method() !== "GET") { state.writes++; return json(501, { error: "Writes are blocked in this test" }); }
    state.reads.push(url.href);
    const role = request.headers()["x-inventory-role"], actor = request.headers()["x-inventory-leader"];
    const assignedSite = role === "site_leader" ? leaders.find((leader) => leader.id === actor)?.siteId || null : null;
    const requestedSite = assignedSite || url.searchParams.get("site") || "all";
    const matches = (siteId: string | null) => requestedSite === "all" || (requestedSite === "central" ? siteId === null : siteId === requestedSite);
    if (url.pathname === "/api/inventory") return json(200, {
      devices: devices.filter((item) => matches(item.siteId)), sites: sites.filter((site) => !assignedSite || site.id === assignedSite), holders: [...drivers, ...leaders].filter((item) => requestedSite === "central" || matches(item.siteId)), leaders, assignedSite,
      siteSummaries: summarizeSites(devices.filter((item) => !assignedSite || item.siteId === assignedSite), sites.filter((item) => !assignedSite || item.id === assignedSite), drivers.filter((driver) => !assignedSite || driver.siteId === assignedSite), !assignedSite),
    });
    if (url.pathname === "/api/inventory/history") return json(200, { hasMore: false, transactions: devices.filter((item) => item.status === "assigned" && matches(item.siteId)).map((item) => ({ id: `event-${item.id}`, deviceId: item.id, deviceLabel: item.deviceId, model: item.model, type: "issue", fromHolderName: null, fromSiteName: null, toHolderName: drivers.find((driver) => driver.id === item.holderId)?.name, toSiteName: sites.find((site) => site.id === item.siteId)?.name, actorRole: "implementation", at: "2026-11-09T06:00:00Z", accessories: [] })) });
    return json(501, { error: "Unexpected browser-test request" });
  });
  await page.goto("/preview"); await expect(page.getByRole("button", { name: "Profile", exact: true })).toBeEnabled();
  return { sites, state };
}
async function open(page: Page, name: string) {
  const nav = page.getByRole("navigation");
  if (!(await nav.getByRole("button", { name, exact: true }).count())) await nav.getByRole("button", { name: /^(More|เมนูเพิ่มเติม)$/, exact: true }).click();
  await nav.getByRole("button", { name, exact: true }).click();
}
async function shot(page: Page, name: string) { await page.addStyleTag({ content: "nextjs-portal { display:none !important; }" }); await page.screenshot({ path: `test-results/${name}.png`, fullPage: true }); }

test("Site tracking compares six assigned phones per site and separate central stock", async ({ page }) => {
  const { sites, state } = await setup(page); await open(page, "Site tracking");
  for (const site of sites) {
    const card = page.locator(`[data-site-tracking-id="${site.id}"]`);
    await expect(card.getByRole("button", { name: "Assigned 6", exact: true })).toBeVisible();
    await expect(card).toContainText("6 / 6"); await expect(card).toContainText(site.code);
  }
  await expect(page.locator('[data-site-tracking-id="central"]').getByRole("button", { name: "Stock 16", exact: true })).toBeVisible();
  await shot(page, "site-tracking-mobile"); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1366, height: 900 }); await shot(page, "site-tracking-desktop"); expect(state.writes).toBe(0);
});

test("Assigned automatically groups by site and visible site counts drill down without resetting status", async ({ page }) => {
  const { sites, state } = await setup(page); await open(page, "Devices"); await page.getByRole("combobox", { name: "Filter device status", exact: true }).selectOption("assigned");
  await expect(page.locator("[data-assigned-site-group]")).toHaveCount(2); await expect(page.locator("[data-device-id]")).toHaveCount(12);
  for (const site of sites) await expect(page.locator(`[data-assigned-site-group="${site.id}"] [data-device-id]`)).toHaveCount(6);
  await shot(page, "assigned-by-site-mobile");
  await page.getByRole("button", { name: "Change scope", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: /CPOCHO CPO_CHO 6/ }).click();
  await expect(page.locator("[data-device-id]")).toHaveCount(6); await expect(page.getByRole("combobox", { name: "Filter device status", exact: true })).toHaveValue("assigned");
  await expect(page.getByTestId("workspace-scope")).toContainText("CPOCHO");
  await page.getByRole("button", { name: "Change scope", exact: true }).click(); await page.getByRole("dialog").getByRole("button", { name: /CPOMTP CPO_MTP 6/ }).click();
  await expect(page.locator("[data-device-id]")).toHaveCount(6); await expect(page.locator("[data-device-id]").first()).toContainText("QA CPO_MTP Driver");
  await page.getByRole("button", { name: "Change scope", exact: true }).click(); await page.getByRole("dialog").getByRole("button", { name: "All sites", exact: true }).click(); await expect(page.locator("[data-assigned-site-group]")).toHaveCount(2);
  await page.setViewportSize({ width: 1366, height: 900 }); await shot(page, "assigned-by-site-desktop"); expect(state.writes).toBe(0);
});

test("Site dashboard Assigned and History actions open the exact site", async ({ page }) => {
  const { sites, state } = await setup(page); await open(page, "Site tracking");
  await page.locator(`[data-site-tracking-id="${sites[0].id}"]`).getByRole("button", { name: "Assigned 6", exact: true }).click();
  await expect(page.locator("[data-device-id]")).toHaveCount(6); await expect(page.getByTestId("workspace-scope")).toContainText("CPOCHO");
  await page.getByRole("banner").getByRole("button", { name: "Back to menu", exact: true }).click(); await open(page, "Site tracking");
  await expect(page.locator("[data-site-tracking-id]")).toHaveCount(1);
  await page.locator(`[data-site-tracking-id="${sites[0].id}"]`).getByRole("button", { name: "Site history", exact: true }).click();
  await expect(page.locator("summary")).toHaveCount(6);
  expect(new URL(state.reads.filter((url) => url.includes("/history?")).at(-1)!).searchParams.get("site")).toBe(sites[0].id);
  expect(state.writes).toBe(0);
});

test("Site Leader summaries and drill-downs remain restricted to the operator's own site", async ({ page }) => {
  const { sites, state } = await setup(page); await setRole(page, "site_leader"); await open(page, "Site tracking");
  await expect(page.locator("[data-site-tracking-id]")).toHaveCount(1); await expect(page.locator(`[data-site-tracking-id="${sites[0].id}"]`)).toBeVisible();
  await expect(page.getByRole("button", { name: "Change scope", exact: true })).toHaveCount(0); await expect(page.getByRole("button", { name: /CPOMTP/ })).toHaveCount(0);
  await page.locator(`[data-site-tracking-id="${sites[0].id}"]`).getByRole("button", { name: "Assigned 6", exact: true }).click();
  await expect(page.locator("[data-device-id]")).toHaveCount(6); await expect(page.locator("[data-device-id]").first()).toContainText("QA CPO_CHO Driver"); expect(state.writes).toBe(0);
});

test("Site cards expose unissued drivers and distinguish ready stock from assignments", async ({ page }) => {
  const { sites } = await setup(page, true); await open(page, "Site tracking");
  const card = page.locator(`[data-site-tracking-id="${sites[0].id}"]`);
  await expect(card.getByRole("button", { name: "Assigned 5", exact: true })).toBeVisible(); await expect(card).toContainText("5 / 6"); await expect(card).toContainText("Without a phone: 1");
  await card.getByRole("button", { name: "Stock 1", exact: true }).click();
  await expect(page.locator("[data-device-id]")).toHaveCount(1); await expect(page.locator("[data-device-id]")).toContainText("Unassigned");
  await expect(page.getByRole("combobox", { name: "Filter device status", exact: true })).toHaveValue("stock");
});

test("Thai site tracking labels and refresh preserve the selected scope", async ({ page }) => {
  const { sites, state } = await setup(page); await page.getByRole("button", { name: "TH", exact: true }).click(); await open(page, "ติดตามรายไซต์");
  await page.getByRole("region", { name: "เลือกไซต์ที่ต้องการติดตาม", exact: true }).getByRole("button", { name: /CPOCHO CPO_CHO 6/ }).click();
  await expect(page.locator("[data-site-tracking-id]")).toHaveCount(1); await page.getByRole("button", { name: "อัปเดตยอด", exact: true }).click();
  await expect(page.locator(`[data-site-tracking-id="${sites[0].id}"]`)).toBeVisible(); await expect(page.getByTestId("workspace-scope")).toContainText("CPOCHO");
  expect(state.writes).toBe(0);
});
