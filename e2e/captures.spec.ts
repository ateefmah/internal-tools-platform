import { test, expect } from "@playwright/test";

// Captures the two control demonstrations required for the PR:
// a blocked self-approval and an audited PII reveal.

const FINANCE = {
  name: "persona",
  value: "finance-priya",
  url: "http://localhost:3000",
};

test("blocked self-approval is explained in plain words", async ({
  page,
  context,
}) => {
  await context.addCookies([FINANCE]);
  await page.goto("/refunds");
  // Priya tries to approve the refund she requested herself (seeded).
  await page.getByRole("button", { name: "Approve" }).first().click();
  await expect(
    page.getByText(/can't approve your own request/i)
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/blocked-self-approval.png",
    fullPage: true,
  });
});

test("PII reveal writes an audit entry", async ({ page, context }) => {
  await context.addCookies([FINANCE]);
  await page.goto("/refunds/1");
  await page.getByRole("link", { name: "reveal" }).click();
  await expect(
    page.getByText(/recorded in the audit log/i)
  ).toBeVisible();
  await expect(page.getByText("a.smith@example.test")).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/audited-pii-reveal.png",
    fullPage: true,
  });
});
