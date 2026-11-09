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
    deleteRequests: 0, siteRequests: 0, personRequests: 0, patchRequests: 0,
    deleteGate: undefined as Promise<void> | undefined, siteGate: undefined as Promise<void> | undefined,
    readGate: undefined as Promise<void> | undefined, patchGate: undefined as Promise<void> | undefined,
    previewGate: undefined as Promise<void> | undefined, rejectDelete: false,
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
    return json(501, { error: "Unexpected browser-test API request; blocked" });
  });
  return state;
}
async function tab(page: Page, name: string) { await page.getByRole("navigation").getByRole("button", { name, exact: true }).click(); }

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
  await page.goto("/preview"); await tab(page, "Directory");
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
  await page.goto("/preview"); await tab(page, "Directory");
  await page.getByRole("button", { name: "Add person", exact: true }).click();
  const form = page.getByRole("form", { name: "Add person" });
  await form.getByLabel("Full name", { exact: true }).fill("Browser Site Leader");
  await form.getByLabel("FLS Employee ID", { exact: true }).fill("QA-LEADER-01");
  await form.getByLabel("Person type", { exact: true }).selectOption("site_leader");
  await form.getByLabel("Assigned site", { exact: true }).selectOption(state.sites[0].id);
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Browser Site Leader", exact: true })).toBeVisible();
  expect(state.people[0].siteId).toBe(state.sites[0].id);
  await page.getByLabel("Role", { exact: true }).selectOption("site_leader");
  await expect(page.getByLabel("Operator", { exact: true })).toHaveValue(state.people[0].id);
  expect(state.personRequests).toBe(1);
});

test("People cannot be saved without a real active site", async ({ page }) => {
  const state = await harness(page); state.sites = [];
  await page.goto("/preview"); await tab(page, "Directory");
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
