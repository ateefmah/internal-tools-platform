import { test, expect } from "@playwright/test";

// One smoke test per the spec: the scaffolded app boots and renders.
test("home page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "InternalOps" })).toBeVisible();
});
