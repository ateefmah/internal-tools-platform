import { test, expect } from "@playwright/test";

// One smoke test per the spec: the app boots, mock sign-in works, home renders.
test("sign-in and home render", async ({ page }) => {
  await page.goto("/");
  // No persona cookie -> redirected to the mock-SSO sign-in.
  await expect(page.getByText(/Demo sign-in/)).toBeVisible();
  await page.getByRole("radio", { name: /Sam Rivera/ }).check();
  await page.getByRole("button", { name: /Sign in/ }).click();
  await expect(
    page.getByRole("heading", { name: "Internal tools, one platform" })
  ).toBeVisible();
});
