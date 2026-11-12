import { test, expect, type Page } from "@playwright/test";
import { setRole } from "./helpers/profile";

async function setup(page: Page, noLeaders = false) {
  const sites = [{ id: "aaaaaaaaaaaaaaaaaaaaaaaa", code: "NORTH", name: "North depot", active: true }, { id: "bbbbbbbbbbbbbbbbbbbbbbbb", code: "SOUTH", name: "South depot", active: true }];
  const leaders = noLeaders ? [] : [{ id: "cccccccccccccccccccccccc", name: "North Site Leader", employeeNo: "QA-SL-1", type: "site_leader", active: true, siteId: sites[0].id }, { id: "dddddddddddddddddddddddd", name: "South Site Leader", employeeNo: "QA-SL-2", type: "site_leader", active: true, siteId: sites[1].id }];
  const state = {
    requests: [] as { role: string; leader: string; site: string }[], writes: 0, writeGate: undefined as Promise<void> | undefined,
    devices: [0, 1, 2].map((index) => ({ id: String(index + 1).padStart(24, "0"), deviceId: `NAV-PHONE-${index + 1}`, model: "QA phone", deviceName: "", imei: "", serial: "", phoneNumber: "", status: index < 2 ? "in_site_stock" : "registered", siteId: sites[index]?.id || null, holderId: null, mdm: {} })),
  };
  await page.route("**/api/**", async (route) => {
    const request = route.request(), url = new URL(request.url());
    const json = (status: number, data: unknown) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (url.pathname === "/api/inventory" && request.method() === "GET") {
      const role = request.headers()["x-inventory-role"], leaderId = request.headers()["x-inventory-leader"] || "", site = url.searchParams.get("site") || "all";
      state.requests.push({ role, leader: leaderId, site });
      const assignedSite = role === "site_leader" ? leaders.find((item) => item.id === leaderId)?.siteId : null;
      const scope = assignedSite || site;
      const scoped = (id: string | null) => scope === "all" || (scope === "central" ? !id : id === scope);
      return json(200, { devices: state.devices.filter((device) => scoped(device.siteId)), sites: sites.filter((item) => !assignedSite || item.id === assignedSite), holders: leaders.filter((item) => scoped(item.siteId)), leaders, assignedSite });
    }
    if (/^\/api\/inventory\/[^/]+$/.test(url.pathname) && request.method() === "PATCH") {
      state.writes++; await state.writeGate;
      state.devices = state.devices.map((item) => item.id === url.pathname.split("/").at(-1) ? { ...item, ...request.postDataJSON() } : item);
      return json(200, { recorded: true });
    }
    return json(501, { error: "Unexpected browser-test request; blocked" });
  });
  await page.goto("/preview"); await expect(page.getByRole("button", { name: "Profile", exact: true })).toBeEnabled();
  return { state, sites, leaders };
}

async function screenshot(page: Page, name: string) {
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.screenshot({ path: `test-results/${name}.png`, fullPage: !(await page.getByRole("dialog").isVisible()) });
}

test("Profile opens from the navbar, applies role changes explicitly, and Cancel restores focus", async ({ page }) => {
  const { state } = await setup(page);
  await expect(page.getByRole("combobox", { name: "Role", exact: true })).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "View", exact: true })).toHaveCount(0);
  const trigger = page.getByRole("button", { name: "Profile", exact: true }); await trigger.focus(); await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog"); await dialog.getByLabel("Role", { exact: true }).selectOption("site_leader");
  await screenshot(page, "navbar-profile-mobile");
  expect(state.requests.at(-1)?.role).toBe("implementation");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click(); await expect(dialog).toBeHidden(); await expect(trigger).toBeFocused();
  await setRole(page, "implementation"); await expect(page.getByRole("navigation").getByRole("button", { name: "Devices", exact: true })).toBeEnabled();
  expect(state.requests.at(-1)?.role).toBe("implementation"); expect(state.writes).toBe(0);
});

test("The scope bar searches sites and filters phones without changing the profile", async ({ page }) => {
  const { state, sites } = await setup(page);
  await page.getByRole("navigation").getByRole("button", { name: "Devices", exact: true }).click();
  await expect(page.locator("[data-device-id]")).toHaveCount(3);
  await page.getByRole("button", { name: "Change scope", exact: true }).click();
  const dialog = page.getByRole("dialog"); await dialog.getByRole("textbox", { name: "Search sites", exact: true }).fill("SOUTH");
  await expect(dialog.getByRole("button", { name: /North depot/ })).toHaveCount(0);
  await screenshot(page, "navbar-scope-mobile");
  await dialog.getByRole("button", { name: /South depot/ }).click();
  await expect(page.getByTestId("workspace-scope")).toContainText("South depot"); await expect(page.locator("[data-device-id]")).toHaveCount(1);
  expect(state.requests.at(-1)).toMatchObject({ role: "implementation", site: sites[1].id });
  await page.getByRole("button", { name: "Change scope", exact: true }).click(); await page.getByRole("dialog").getByRole("button", { name: "Central stock", exact: true }).click();
  await expect(page.locator("[data-device-id]")).toHaveCount(1); await expect(page.getByRole("heading", { name: "NAV-PHONE-3", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Change scope", exact: true }).click(); await page.keyboard.press("Escape"); await expect(page.getByRole("button", { name: "Change scope", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Change scope", exact: true }).click(); await page.getByRole("dialog").getByRole("button", { name: "All sites", exact: true }).click();
  await expect(page.locator("[data-device-id]")).toHaveCount(3); expect(state.writes).toBe(0);
});

test("Site Leader profile selection changes operator and remains locked to that operator's site", async ({ page }) => {
  const { state, leaders } = await setup(page);
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  let dialog = page.getByRole("dialog"); await dialog.getByLabel("Role", { exact: true }).selectOption("site_leader"); await dialog.getByLabel("Operator", { exact: true }).selectOption(leaders[1].id); await dialog.getByRole("button", { name: "Apply profile", exact: true }).click();
  await expect(page.getByTestId("workspace-scope")).toContainText("South depot"); await expect(page.getByRole("button", { name: "Change scope", exact: true })).toHaveCount(0);
  expect(state.requests.at(-1)).toMatchObject({ role: "site_leader", leader: leaders[1].id, site: "all" });
  await page.getByRole("button", { name: "Profile", exact: true }).click(); dialog = page.getByRole("dialog"); await dialog.getByLabel("Operator", { exact: true }).selectOption(leaders[0].id); await dialog.getByRole("button", { name: "Apply profile", exact: true }).click();
  await expect(page.getByTestId("workspace-scope")).toContainText("North depot"); expect(state.requests.at(-1)?.leader).toBe(leaders[0].id);
  await setRole(page, "implementation"); await expect(page.getByRole("button", { name: "Change scope", exact: true })).toBeEnabled(); await expect(page.getByTestId("workspace-scope")).toContainText("All sites");
});

test("Profile prevents choosing a Site Leader without an active operator", async ({ page }) => {
  const { state } = await setup(page, true); await page.getByRole("button", { name: "Profile", exact: true }).click(); const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Role", { exact: true }).selectOption("site_leader"); await expect(dialog.getByRole("button", { name: "Apply profile", exact: true })).toBeDisabled();
  await expect(dialog).toContainText("No active Site Leader is available."); await page.keyboard.press("Escape"); expect(state.requests.at(-1)?.role).toBe("implementation");
});

test("Profile and scope controls are disabled during a pending save", async ({ page }) => {
  const { state } = await setup(page); await page.getByRole("navigation").getByRole("button", { name: "Devices", exact: true }).click(); await page.getByRole("button", { name: "Edit", exact: true }).first().click();
  let release!: () => void; state.writeGate = new Promise<void>((resolve) => { release = resolve; });
  await page.getByRole("button", { name: "Save to database", exact: true }).click();
  try { await expect(page.getByRole("button", { name: "Profile", exact: true })).toBeDisabled(); await expect(page.getByRole("button", { name: "Change scope", exact: true })).toBeDisabled(); } finally { release(); }
  await expect(page.getByRole("button", { name: "Profile", exact: true })).toBeEnabled(); expect(state.writes).toBe(1);
});

test("Navbar and scope remain compact in Thai on mobile and desktop", async ({ page }) => {
  await setup(page); await page.getByRole("button", { name: "TH", exact: true }).click();
  await expect(page.getByRole("button", { name: "โปรไฟล์", exact: true })).toBeVisible(); await expect(page.getByTestId("workspace-scope")).toContainText("ทุกไซต์");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await screenshot(page, "navbar-home-mobile");
  await page.setViewportSize({ width: 1366, height: 900 }); await screenshot(page, "navbar-home-desktop");
  await page.getByRole("button", { name: "โปรไฟล์", exact: true }).click(); await expect(page.getByRole("dialog").getByLabel("บทบาท", { exact: true })).toBeVisible(); await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "เปลี่ยนขอบเขต", exact: true }).click(); await expect(page.getByRole("dialog").getByRole("button", { name: "สต็อกส่วนกลาง", exact: true })).toBeVisible();
});
