import { test, expect } from "@playwright/test";
test("driver can choose a vehicle and compare a route on a phone", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "My journey" })).toBeVisible();
  await page.getByLabel("Your vehicle").selectOption("NL-MED-01");
  await expect(page.getByText("60 boxes · Medical kits")).toBeVisible();
  await page.screenshot({
    path: "../../artifacts/driver-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page
    .getByRole("button", { name: "Check route", exact: true })
    .first()
    .click();
  await page.getByLabel("Loaded vehicle weight").fill("12");
  await page.getByRole("button", { name: "Check this route" }).click();
  await expect(
    page.getByText(/Alternative route found|Route available/),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Siliguri.*Gangtok/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("field report survives offline reload and synchronizes once", async ({
  page,
  context,
  request,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "My journey" })).toBeVisible();
  await expect(page.getByLabel("Your vehicle").locator("option")).toHaveCount(
    6,
  );
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole("button", { name: "Report a problem", exact: true })
    .click();
  await page.getByLabel("Latitude", { exact: true }).fill("25.75");
  await page.getByLabel("Longitude", { exact: true }).fill("93.82");
  const note = `Browser offline report ${Date.now()}`;
  await page.getByLabel("What happened?").fill(note);
  await page.getByRole("button", { name: "Save report" }).click();
  await expect(page.getByText("1 report(s) waiting to send")).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Report a problem", exact: true })
    .click();
  await expect(page.getByText("1 report(s) waiting to send")).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText("1 report(s) waiting to send")).toHaveCount(0, {
    timeout: 20000,
  });
  const incidents = await (await request.get("/api/incidents")).json();
  expect(
    incidents.incidents.filter((i) => i.description === note),
  ).toHaveLength(1);
});
test("dispatch desk exposes stock, district access and report review", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Dispatch desk", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Add a delivery" }),
  ).toBeVisible();
  await expect(page.getByText("Medical kits · 40 boxes")).toBeVisible();
  await page.screenshot({
    path: "../../artifacts/dispatch-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "District access", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Gangtok", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Reports & roads", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Verified road status" }),
  ).toBeVisible();
});
test("language preference persists and provider failure is understandable", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("hi");
  await expect(
    page.getByRole("heading", { name: "मेरी यात्रा" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "मेरी यात्रा" }),
  ).toBeVisible();
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await page.getByRole("button", { name: "Road alerts", exact: true }).click();
  await page.getByRole("button", { name: "Enable road notifications" }).click();
  await expect(
    page.getByText(
      "Notifications need the administrator’s VAPID configuration.",
    ),
  ).toBeVisible();
});
