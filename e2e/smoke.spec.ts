import { test, expect } from "@playwright/test";

// One smoke test per the spec: the platform loads, apps are registered, and
// the mock-SSO persona switcher works.
test("platform home renders registry and persona switcher", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "InternalOps" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "KYC Review Queue" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Refunds" })).toBeVisible();
  await expect(page.getByText("MOCK SSO")).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/home.png", fullPage: true });
});
