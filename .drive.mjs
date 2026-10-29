import { chromium } from "@playwright/test";
const browser = await chromium.connectOverCDP("http://localhost:29229");
const ctx = browser.contexts()[0];
const page = await ctx.newPage();
await page.setViewportSize({ width: 1400, height: 1000 });
const as = async (uid) => {
  await ctx.addCookies([{ name: "persona_uid", value: uid, url: "http://localhost:3000" }]);
  await page.goto("http://localhost:3000/vendor-contracts");
};
const row = (id) => page.locator("tr", { has: page.locator(`td.mono:text-is("${id}")`) });
// Tom (ops) requests renewal of vc-6001
await as("u-tom");
await row("vc-6001").locator('input[name="note"]').fill("Core hosting, no alternative");
await row("vc-6001").getByRole("button", { name: "Request sign-off" }).click();
await page.waitForLoadState("networkidle");
// Dana (engineer) requests cancel on vc-6004 then tries to sign off herself -> blocked
await as("u-dana");
await row("vc-6004").locator("select").selectOption("cancel");
await row("vc-6004").locator('input[name="note"]').fill("Unused seats");
await row("vc-6004").getByRole("button", { name: "Request sign-off" }).click();
await page.waitForTimeout(1500);
await page.goto("http://localhost:3000/vendor-contracts");
await row("vc-6004").getByRole("button", { name: "Sign off" }).click();
await page.waitForTimeout(2500);
await page.screenshot({ path: "/home/ubuntu/blocked-self-signoff.png", fullPage: true });
console.log("blocked text:", (await page.locator("body").innerText()).match(/Maker-checker[^\n]*/)?.[0]);
// Fay (finance) signs off Tom's renewal
await as("u-fay");
await row("vc-6001").getByRole("button", { name: "Sign off" }).click();
await page.waitForTimeout(1500);
await page.goto("http://localhost:3000/vendor-contracts");
await page.screenshot({ path: "/home/ubuntu/vendor-contracts.png", fullPage: true });
await page.goto("http://localhost:3000/audit");
console.log((await page.locator("table").innerText()).split("\n").slice(0, 6).join("\n"));
await page.close();
