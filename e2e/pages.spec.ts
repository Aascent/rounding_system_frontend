import {
  USERS,
  expect,
  expectNoHorizontalOverflow,
  signInAs,
  test,
} from "./helpers";

const PROVIDER_PAGES = [
  "/provider",
  "/provider/patient-list",
  "/provider/reports",
  "/account/password",
];
const PHYSICIAN_PAGES = [...PROVIDER_PAGES, "/provider/np-list"];
const ADMIN_PAGES = [
  "/admin",
  "/admin/users",
  "/admin/thresholds",
  "/admin/rules",
  "/admin/keywords",
  "/admin/facilities",
  "/admin/audit",
  "/admin/system",
  "/account/password",
];

for (const [role, email, pages] of [
  ["physician", USERS.physician, PHYSICIAN_PAGES],
  ["nurse practitioner", USERS.np, PROVIDER_PAGES],
  ["admin", USERS.admin, ADMIN_PAGES],
] as const) {
  test(`every ${role} page renders and fits a phone and a desktop`, async ({
    page,
  }) => {
    await signInAs(page, email);
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      for (const path of pages) {
        await page.goto(path);
        await expect(page).toHaveURL(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(page.getByText("Something went wrong")).toHaveCount(0);
        await expectNoHorizontalOverflow(page);
      }
    }
  });
}

test("a physician opens a patient from the list and adds a visit note", async ({
  page,
}) => {
  await signInAs(page, USERS.physician);
  await page.goto("/provider/patient-list");
  await page.locator('a[href^="/patients/"]').first().click();
  await expect(page).toHaveURL(/\/patients\//);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const note = `Reviewed in browser test ${Date.now()}.`;
  await page.locator("#visit-note-text").fill(note);
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByText(note)).toBeVisible();
  await page.reload();
  await expect(page.getByText(note)).toBeVisible();
});

test("the patient list filters and pages through the URL", async ({ page }) => {
  await signInAs(page, USERS.physician);
  await page.goto("/provider/patient-list?visit=TODAY");
  await expect(page.locator('a[href^="/patients/"]').first()).toBeVisible();
  await page.goto("/provider/patient-list?page=2");
  await expect(page.locator('a[href^="/patients/"]').first()).toBeVisible();
});

test("an admin runs a manual sync", async ({ page }) => {
  await signInAs(page, USERS.admin);
  await page.goto("/admin/system");
  await page.getByRole("button", { name: /sync/i }).first().click();
  await expect(
    page.getByText(/sync (started|running|completed)/i).first(),
  ).toBeVisible();
});
