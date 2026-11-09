import { expect, type Page } from "@playwright/test";

export async function setRole(page: Page, role: string) {
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Role", { exact: true }).selectOption(role);
  await dialog.getByRole("button", { name: "Apply profile", exact: true }).click();
  await expect(dialog).toBeHidden();
}
