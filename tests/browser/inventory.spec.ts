import { setRole } from "./helpers/profile";
import { test, expect, type Page } from "@playwright/test";
import type { InventoryItem } from "../../lib/inventory";
import type { DirectoryPerson, DirectorySite } from "../../lib/directory";

// Every API request is intercepted: these fixtures never seed or mutate MongoDB.
function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => { release = resolve; });
  return { promise, release };
}
async function harness(page: Page) {
  const state = {
    devices: Array.from({ length: 35 }, (_, index): InventoryItem => ({ id: (index + 1).toString(16).padStart(24, "0"), deviceId: `TEST-${String(index + 1).padStart(3, "0")}`, deviceName: "Browser fixture", model: "", imei: "", serial: "", phoneNumber: "", status: "registered", siteId: null, holderId: null, mdm: {} })),
    sites: [{ id: "aaaaaaaaaaaaaaaaaaaaaaaa", code: "QA", name: "Browser test site", active: true }] as DirectorySite[],
    people: [] as DirectoryPerson[],
    deleteRequests: 0, siteRequests: 0, personRequests: 0, patchRequests: 0, transferRequests: 0, historyRequests: 0,
    returnRequests: [] as Record<string, unknown>[], exchangeRequests: [] as Record<string, unknown>[], issueRequests: [] as Record<string, unknown>[], history: [] as Record<string, unknown>[],
    deleteGate: undefined as Promise<void> | undefined, siteGate: undefined as Promise<void> | undefined,
    readGate: undefined as Promise<void> | undefined, patchGate: undefined as Promise<void> | undefined,
    previewGate: undefined as Promise<void> | undefined, transferGate: undefined as Promise<void> | undefined, rejectDelete: false,
  };
  await page.route("**/api/**", async (route) => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    const json = (status: number, body: unknown) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/api/inventory" && method === "GET") {
      await state.readGate;
      return json(200, { devices: state.devices, sites: state.sites, holders: state.people,
        leaders: state.people.filter((person) => person.type === "site_leader"), assignedSite: null });
    }
    if (url.pathname.startsWith("/api/inventory/") && method === "DELETE") {
      state.deleteRequests++;
      await state.deleteGate;
      if (state.rejectDelete) return json(409, { error: "Only unused, unassigned registrations without custody history can be deleted" });
      state.devices = state.devices.filter((device) => device.id !== url.pathname.split("/").at(-1));
      return json(200, { deleted: true });
    }
    if (url.pathname.startsWith("/api/inventory/") && method === "PATCH") {
      state.patchRequests++; await state.patchGate;
      const fields = request.postDataJSON();
      state.devices = state.devices.map((device) => device.id === url.pathname.split("/").at(-1) ? { ...device, ...fields } : device);
      return json(200, { device: state.devices[0] });
    }
    if (url.pathname === "/api/inventory/sites" && method === "POST") {
      state.siteRequests++; await state.siteGate;
      const body = request.postDataJSON() as { code: string; name: string };
      const site = { id: "bbbbbbbbbbbbbbbbbbbbbbbb", ...body, active: true };
      state.sites.push(site); return json(201, { site });
    }
    if (url.pathname === "/api/inventory/people" && method === "POST") {
      state.personRequests++;
      const body = request.postDataJSON() as Omit<DirectoryPerson, "id" | "active">;
      const person = { id: "cccccccccccccccccccccccc", ...body, active: true };
      state.people.push(person); return json(201, { person });
    }
    if (url.pathname === "/api/inventory/import/preview" && method === "POST") {
      await state.previewGate;
      return json(200, { filename: "fixture.csv", sheet: "CSV", sheets: [], headers: ["Device name"], identifier: "Device name", rows: [], databaseChecked: true });
    }
    if (url.pathname === "/api/inventory/transfer" && method === "POST") {
      state.transferRequests++; await state.transferGate;
      const body = request.postDataJSON() as { deviceIds: string[]; toSiteId: string };
      state.devices = state.devices.map((device) => body.deviceIds.includes(device.id) ? { ...device, status: "in_transit", siteId: body.toSiteId } : device);
      return json(200, { devices: state.devices.filter((device) => body.deviceIds.includes(device.id)) });
    }
    if (url.pathname === "/api/inventory/history" && method === "GET") {
      state.historyRequests++;
      return json(200, { transactions: state.history });
    }
    if (url.pathname === "/api/inventory/return" && method === "POST") {
      const body = request.postDataJSON(); state.returnRequests.push(body);
      state.devices = state.devices.map((device) => device.id === body.deviceId ? { ...device, status: body.condition === "damaged" ? "damaged" : "in_site_stock", holderId: null } : device);
      return json(200, { device: state.devices.find((device) => device.id === body.deviceId) });
    }
    if (["/api/inventory/issue", "/api/inventory/exchange"].includes(url.pathname) && method === "POST") {
      const body = request.postDataJSON();
      (url.pathname.endsWith("exchange") ? state.exchangeRequests : state.issueRequests).push(body);
      return json(201, { recorded: true });
    }
    return json(501, { error: "Unexpected browser-test API request; blocked" });
  });
  return state;
}
async function tab(page: Page, name: string) {
  const nav = page.getByRole("navigation");
  if (!(await nav.getByRole("button", { name, exact: true }).count())) await nav.getByRole("button", { name: /^(More|เมนูเพิ่มเติม)$/, exact: true }).click();
  await nav.getByRole("button", { name, exact: true }).click();
}

test("Delete opens immediately from a long list without clicking Edit; Cancel does not delete", async ({ page }) => {
  const state = await harness(page);
  await page.goto("/preview"); await tab(page, "Devices");
  await page.getByRole("button", { name: "Delete unused registration", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Delete TEST-001/)).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0); expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toBeHidden(); expect(state.deleteRequests).toBe(0);
  await expect(page.getByRole("heading", { name: "Edit device details" })).toHaveCount(0);
});

test("Delete shows loading, prevents duplicate requests and updates the list", async ({ page }) => {
  const state = await harness(page), pending = gate(); state.deleteGate = pending.promise;
  await page.goto("/preview"); await tab(page, "Devices");
  await page.getByRole("button", { name: "Delete unused registration", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Confirm deletion", exact: true }).click();
  try {
    await expect(dialog.getByRole("button", { name: "Deleting…", exact: true })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Deleting…", exact: true })).toHaveAttribute("aria-busy", "true");
    await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeDisabled();
    expect(state.deleteRequests).toBe(1);
  } finally { pending.release(); }
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { name: "TEST-001", exact: true })).toHaveCount(0);
  await expect(page.getByText("Unused registration deleted.", { exact: true })).toBeVisible();
});

test("Delete failures stay visible inside the dialog with retry/cancel available", async ({ page }) => {
  const state = await harness(page); state.rejectDelete = true;
  await page.goto("/preview"); await tab(page, "Devices");
  await page.getByRole("button", { name: "Delete unused registration", exact: true }).first().click();
  const dialog = page.getByRole("dialog"); await dialog.getByRole("button", { name: "Confirm deletion", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("custody history");
  await expect(dialog.getByRole("button", { name: "Confirm deletion", exact: true })).toBeEnabled();
  expect(state.devices).toHaveLength(35);
});

test("Initial reads and Save have visible loading states", async ({ page }) => {
  const state = await harness(page), read = gate(); state.readGate = read.promise;
  await page.goto("/preview");
  try { await expect(page.getByRole("status")).toContainText("Loading records"); }
  finally { read.release(); }
  await tab(page, "Devices"); await page.getByRole("button", { name: "Edit", exact: true }).first().click();
  const save = gate(); state.patchGate = save.promise;
  await page.getByLabel("Model", { exact: true }).fill("Reviewed model");
  await page.getByRole("button", { name: "Save to database", exact: true }).click();
  try { await expect(page.getByRole("button", { name: "Saving…", exact: true })).toBeDisabled(); }
  finally { save.release(); }
  await expect(page.getByText("Device details saved.", { exact: true })).toBeVisible();
  expect(state.patchRequests).toBe(1);
});

test("Add site saves only on submit and shows a pending button", async ({ page }) => {
  const state = await harness(page), pending = gate(); state.siteGate = pending.promise;
  await page.goto("/preview"); await tab(page, "Create");
  await page.getByRole("button", { name: "Sites", exact: true }).click();
  await page.getByRole("button", { name: "Add site", exact: true }).click();
  const form = page.getByRole("form", { name: "Add site" });
  await form.getByLabel("Site name", { exact: true }).fill("New browser site");
  await form.getByLabel("Site code", { exact: true }).fill("QA-NEW");
  expect(state.siteRequests).toBe(0);
  await form.getByRole("button", { name: "Save", exact: true }).click();
  try { await expect(form.getByRole("button", { name: "Saving…", exact: true })).toBeDisabled(); }
  finally { pending.release(); }
  await expect(page.getByRole("heading", { name: "New browser site", exact: true })).toBeVisible();
  expect(state.siteRequests).toBe(1);
});

test("Add Site Leader links the selected site and appears in the role preview selector", async ({ page }) => {
  const state = await harness(page);
  await page.goto("/preview"); await tab(page, "Create");
  await page.getByRole("button", { name: "Add person", exact: true }).click();
  const form = page.getByRole("form", { name: "Add person" });
  await form.getByLabel("Full name", { exact: true }).fill("Browser Site Leader");
  await form.getByLabel("FLS Employee ID", { exact: true }).fill("QA-LEADER-01");
  await form.getByLabel("Person type", { exact: true }).selectOption("site_leader");
  await form.getByLabel("Assigned site", { exact: true }).selectOption(state.sites[0].id);
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Browser Site Leader", exact: true })).toBeVisible();
  expect(state.people[0].siteId).toBe(state.sites[0].id);
  await setRole(page, "site_leader");
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  await expect(page.getByRole("dialog").getByLabel("Operator", { exact: true })).toHaveValue(state.people[0].id);
  await page.keyboard.press("Escape");
  expect(state.personRequests).toBe(1);
});

test("People cannot be saved without a real active site", async ({ page }) => {
  const state = await harness(page); state.sites = [];
  await page.goto("/preview"); await tab(page, "Create");
  await page.getByRole("button", { name: "Add person", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
  await expect(page.getByText("There are no active sites. Create a site before adding people.", { exact: false })).toBeVisible();
  expect(state.personRequests).toBe(0);
});

test("CSV preview displays loading while the request is pending", async ({ page }) => {
  const state = await harness(page), pending = gate(); state.previewGate = pending.promise;
  await page.goto("/preview"); await tab(page, "Devices");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "Import file", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "fixture.csv", mimeType: "text/csv", buffer: Buffer.from("Device name\nBROWSER-ONLY") });
  await page.getByRole("button", { name: "Preview and validate (no writes)", exact: true }).click();
  try { await expect(page.getByRole("button", { name: "Working…", exact: true })).toHaveAttribute("aria-busy", "true"); }
  finally { pending.release(); }
  await expect(page.getByRole("button", { name: "Preview and validate (no writes)", exact: true })).toBeEnabled();
});

test("Transfer sends selected central-stock devices to a site and shows a pending state", async ({ page }) => {
  const state = await harness(page), pending = gate(); state.transferGate = pending.promise;
  await page.goto("/preview");
  await setRole(page, "implementation");
  await tab(page, "Transfer to Site Leader");
  await page.getByRole("checkbox", { name: /TEST-001/ }).check();
  await page.getByLabel("Destination site", { exact: true }).selectOption(state.sites[0].id);
  await page.getByRole("button", { name: "Transfer 1 device(s)", exact: true }).click();
  try { await expect(page.getByRole("button", { name: "Transferring…", exact: true })).toBeDisabled(); }
  finally { pending.release(); }
  await expect(page.getByText("Devices transferred.", { exact: true })).toBeVisible();
  expect(state.transferRequests).toBe(1);
});

test("History loads the real scoped ledger", async ({ page }) => {
  const state = await harness(page);
  await page.goto("/preview"); await tab(page, "History / Documents");
  await expect(page.getByText("No history in this scope yet.", { exact: true })).toBeVisible();
  expect(state.historyRequests).toBeGreaterThanOrEqual(1);
});

test("Manufacturer is visible in phone details and can be edited for future individual additions", async ({ page }) => {
  const state = await harness(page); state.devices[0].manufacturer = "Samsung";
  await page.goto("/preview"); await tab(page, "Devices");
  await page.getByRole("button", { name: "Edit", exact: true }).first().click();
  await expect(page.getByLabel("Manufacturer", { exact: true })).toHaveValue("Samsung");
  await page.getByLabel("Manufacturer", { exact: true }).fill("Updated manufacturer");
  await page.getByRole("button", { name: "Save to database", exact: true }).click();
  await expect(page.getByText("Device details saved.", { exact: true })).toBeVisible();
  expect(state.devices[0].manufacturer).toBe("Updated manufacturer");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByLabel("Manufacturer", { exact: true })).toBeVisible();
});

async function lifecycle(page: Page) {
  const state = await harness(page);
  state.people = [
    { id: "dddddddddddddddddddddddd", name: "Driver With Phone", employeeNo: "FLS-001", siteId: state.sites[0].id, type: "driver", active: true, phone: "" },
    { id: "eeeeeeeeeeeeeeeeeeeeeeee", name: "Driver Without Phone", employeeNo: "FLS-002", siteId: state.sites[0].id, type: "driver", active: true, phone: "" },
    { id: "ffffffffffffffffffffffff", name: "Site Leader Person", employeeNo: "FLS-SL", siteId: state.sites[0].id, type: "site_leader", active: true, phone: "" },
  ];
  state.devices = state.devices.slice(0, 4).map((device, index) => ({ ...device, model: `Model ${index + 1}`, siteId: state.sites[0].id,
    status: index === 0 ? "assigned" : index === 3 ? "damaged" : "in_site_stock", holderId: index === 0 ? state.people[0].id : null }));
  return state;
}

test("Inventory cards filter the list and combine with search on mobile and desktop", async ({ page }) => {
  await lifecycle(page); await page.goto("/preview"); await tab(page, "Devices");
  await page.getByRole("combobox", { name: "Filter device status", exact: true }).selectOption("assigned");
  await expect(page.getByRole("heading", { name: "TEST-001", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "TEST-002", exact: true })).toHaveCount(0);
  await page.getByRole("combobox", { name: "Filter device status", exact: true }).selectOption("stock");
  await expect(page.getByRole("heading", { name: /^TEST-/ })).toHaveCount(2);
  await page.getByRole("textbox").fill("TEST-003");
  await expect(page.getByRole("heading", { name: /^TEST-/ })).toHaveCount(1);
  await page.getByRole("textbox").clear();
  await page.getByRole("combobox", { name: "Filter device status", exact: true }).selectOption("all");
  await expect(page.getByRole("heading", { name: /^TEST-/ })).toHaveCount(4);
  await page.screenshot({ path: "test-results/inventory-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.screenshot({ path: "test-results/inventory-desktop.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("Issue shows assignment badges, toggles and phone details without selecting the driver", async ({ page }) => {
  await lifecycle(page); await page.goto("/preview"); await setRole(page, "implementation"); await tab(page, "Issue to driver");
  await page.getByRole("button", { name: "Has phone", exact: true }).click();
  await expect(page.getByRole("button", { name: /Driver Without Phone FLS/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Phone details for Driver With Phone", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Model 1");
  await expect(page.getByRole("dialog")).toContainText("TEST-001");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "No phone", exact: true }).click();
  await expect(page.getByRole("button", { name: /Driver With Phone FLS/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Driver Without Phone FLS/ })).toBeVisible();
});

for (const role of ["implementation", "site_leader"]) {
  test(`${role} can recall a phone with a required reason and damaged condition`, async ({ page }) => {
    const state = await lifecycle(page); await page.goto("/preview"); await setRole(page, role); await tab(page, "Return");
    await page.getByRole("button", { name: /Driver With Phone FLS/ }).click();
    await page.getByRole("button", { name: "Next · Return details", exact: true }).click();
    await page.getByRole("button", { name: "Recall phone", exact: true }).click();
    const next = page.getByRole("button", { name: "Next · Confirm", exact: true });
    await expect(next).toBeDisabled();
    await page.getByLabel("Recall reason (required)").fill("Employment ended");
    await page.getByText("Damaged", { exact: true }).click();
    await next.click();
    await page.getByRole("button", { name: "Confirm recall and receipt", exact: true }).click();
    await expect(page.getByText("Return recorded.", { exact: true })).toBeVisible();
    expect(state.returnRequests).toHaveLength(1);
    expect(state.returnRequests[0]).toMatchObject({ recall: true, reason: "Employment ended", condition: "damaged", deviceId: state.devices[0].id });
    expect(state.devices[0].status).toBe("damaged"); expect(state.devices[0].holderId).toBeNull();
  });
}

test("Exchange lists drivers immediately and requires the driver's new acknowledgement", async ({ page }) => {
  const state = await lifecycle(page); await page.goto("/preview"); await setRole(page, "site_leader"); await tab(page, "Exchange");
  await page.getByRole("button", { name: /Driver With Phone FLS/ }).click();
  await page.getByRole("button", { name: "Next · Condition & replacement", exact: true }).click();
  await page.getByRole("button", { name: /TEST-002/ }).click();
  await page.getByRole("button", { name: "Continue · Sign for replacement", exact: true }).click();
  const submit = page.getByRole("button", { name: "Submit · Confirm receipt", exact: true });
  await expect(submit).toBeDisabled(); expect(state.exchangeRequests).toHaveLength(0);
  await expect(page.getByRole("heading", { name: "Receipt signed by · Driver", exact: true }).locator("..")).toContainText("Driver With Phone");
  await expect(page.getByRole("heading", { name: "Issuing operator · Company representative", exact: true }).locator("..")).toContainText("Site Leader Person");
  const canvas = page.locator("canvas"); await canvas.scrollIntoViewIfNeeded(); const box = await canvas.boundingBox();
  await page.mouse.move(box!.x + 25, box!.y + 25); await page.mouse.down(); await page.mouse.move(box!.x + 100, box!.y + 70, { steps: 8 }); await page.mouse.up();
  await page.getByRole("checkbox").last().check();
  await submit.click();
  await expect(page.getByText("Handover recorded", { exact: true })).toBeVisible();
  expect(state.exchangeRequests).toHaveLength(1);
  expect(state.exchangeRequests[0]).toMatchObject({ driverId: state.people[0].id, returningDeviceId: state.devices[0].id, newDeviceId: state.devices[1].id, acknowledged: true, policyLanguage: "en" });
  expect(String(state.exchangeRequests[0].signature)).toMatch(/^data:image\/png;base64,/);
});

test("History groups by phone model, expands transactions and uses Thailand dates", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-09T03:30:00.000Z") });
  const state = await lifecycle(page);
  state.history = [
    { id: "event-2", deviceId: state.devices[0].id, deviceLabel: "TEST-001", model: "Model 1", type: "return", recall: true, reason: "Employment ended", fromHolderName: "Driver With Phone", toHolderName: null, actorRole: "it", at: "2026-11-08T03:30:00.000Z" },
    { id: "event-1", deviceId: state.devices[0].id, deviceLabel: "TEST-001", model: "Model 1", type: "issue", signerName: "Driver With Phone", actorRole: "site_leader", at: "2026-11-01T03:30:00.000Z" },
  ];
  await page.goto("/preview"); await tab(page, "History / Documents");
  const summary = page.locator("summary"); await expect(summary).toHaveCount(1); await expect(summary).toContainText("Model 1");
  await expect(summary).toContainText("08/Nov/2026 10:30");
  await expect(summary).toContainText("Last update 1d");
  await expect(page.getByText("Reason / notes: Employment ended", { exact: true })).toBeHidden();
  await summary.click(); await expect(page.getByText("Reason / notes: Employment ended", { exact: true })).toBeVisible();
  await expect(page.getByText("Receipt signed by · Driver: Driver With Phone", { exact: true })).toBeVisible();
  await summary.click(); await expect(page.getByText("Reason / notes: Employment ended", { exact: true })).toBeHidden();
});

test("Normal return can choose between multiple assigned phones and keeps the other assignment", async ({ page }) => {
  const state = await lifecycle(page);
  state.devices[1] = { ...state.devices[1], status: "assigned", holderId: state.people[0].id };
  await page.goto("/preview"); await setRole(page, "implementation"); await tab(page, "Return");
  await page.getByRole("button", { name: /Driver With Phone FLS/ }).click();
  await page.getByLabel("Returning phone", { exact: true }).selectOption(state.devices[1].id);
  await page.getByRole("button", { name: "Next · Return details", exact: true }).click();
  await page.getByRole("button", { name: "Next · Confirm", exact: true }).click();
  await page.getByRole("button", { name: "Record return", exact: true }).click();
  await expect(page.getByText("Return recorded.", { exact: true })).toBeVisible();
  expect(state.devices[0].status).toBe("assigned"); expect(state.devices[1].status).toBe("in_site_stock");
  expect(state.returnRequests[0]).toMatchObject({ deviceId: state.devices[1].id, recall: false });
});

test("Thai inventory labels and assignment toggles remain readable", async ({ page }) => {
  await lifecycle(page); await page.goto("/preview");
  await page.getByRole("button", { name: "TH", exact: true }).click();
  await page.getByRole("navigation").getByRole("button", { name: "อุปกรณ์", exact: true }).click();
  await page.getByRole("combobox", { name: "กรองสถานะโทรศัพท์", exact: true }).selectOption("assigned");
  await expect(page.getByRole("status", { name: "แสดง 1 จาก 4 เครื่อง", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/inventory-thai.png", fullPage: true });
});
