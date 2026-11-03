import { PASSWORD, USERS, expect, signIn, test } from "./helpers";

test("a wrong password shows one generic error", async ({ page }) => {
  await signIn(page, USERS.physician, "not-the-password");
  await expect(
    page.getByText(
      "The email, password, or MFA code is incorrect. 4 attempts left before sign-in is paused for 15 minutes.",
    ),
  ).toBeVisible();
  await expect(page).toHaveURL("/");
});

test("each role lands on its own dashboard", async ({ page }) => {
  for (const [email, path] of [
    [USERS.physician, "/provider"],
    [USERS.np, "/provider"],
    [USERS.admin, "/admin"],
  ] as const) {
    await signIn(page, email);
    await expect(page).toHaveURL(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.locator("#login-email")).toBeVisible();
  }
});

test("signing out forgets the remembered email", async ({ page }) => {
  await page.goto("/");
  await page.locator("#login-email").fill(USERS.physician);
  await page.locator("#login-password").fill(PASSWORD);
  await page.locator("#login-mfa").fill("123456");
  await page.locator("#login-remember").check();
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/provider");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.locator("#login-email")).toHaveValue("");
  await page.reload();
  await expect(page.locator("#login-email")).toHaveValue("");
  expect(
    await page.evaluate(() =>
      window.localStorage.getItem("smart-rounding.remembered-email"),
    ),
  ).toBeNull();
});

test("protected pages need a session", async ({ page }) => {
  await page.goto("/provider");
  // Never signed in: plain sign-in, no "session ended" notice.
  await expect(page).toHaveURL("/");
  await expect(page.locator("#login-email")).toBeVisible();
  await expect(page.getByText("Your session ended")).toHaveCount(0);
  const response = await page.request.get("/api/v1/provider/dashboard");
  expect(response.status()).toBe(401);
});

test("a session that ends on the server says so", async ({ page }) => {
  await signIn(page, USERS.physician);
  await expect(page).toHaveURL("/provider");
  // Simulate expiry/revocation: the browser still sends a cookie the server no longer accepts.
  await page
    .context()
    .addCookies([
      { name: "sr_session", value: "ended", url: "http://localhost:3100" },
    ]);
  await page.goto("/provider/patient-list");
  await expect(page).toHaveURL("/?expired=1");
  await expect(
    page.getByText("Your session ended. Please sign in again."),
  ).toBeVisible();
});

test("the server refuses admin data to a nurse practitioner", async ({
  page,
}) => {
  await signIn(page, USERS.np);
  await expect(page).toHaveURL("/provider");
  // The page redirects, but the real control is the API.
  await page.goto("/admin");
  await expect(page).toHaveURL("/provider");
  const response = await page.request.get("/api/v1/admin/users");
  expect(response.status()).toBe(403);
});

test("an admin reset forces a new password before anything else", async ({
  page,
  browser,
}) => {
  await signIn(page, USERS.admin);
  await expect(page).toHaveURL("/admin");
  await page.goto("/admin/users");
  const row = page.getByRole("row").filter({ hasText: USERS.np });
  await row.getByRole("button", { name: "Reset password" }).click();
  const notice = page.getByText(/Temporary password for .*: \S+ — share it/);
  await expect(notice).toBeVisible();
  const temporary = /: (\S+) — share it/.exec(
    (await notice.textContent()) ?? "",
  )?.[1];
  expect(temporary).toBeTruthy();

  const np = await browser.newPage();
  await signIn(np, USERS.np, temporary);
  await expect(
    np.getByRole("heading", { name: "Set a new password" }),
  ).toBeVisible();
  expect((await np.request.get("/api/v1/provider/dashboard")).status()).toBe(
    403,
  );

  await np.locator("#current-password").fill(temporary!);
  await np.locator("#new-password").fill("Temporary-2-new!");
  await np.locator("#confirm-password").fill("does-not-match");
  await np.getByRole("button", { name: "Change password" }).click();
  await expect(np.getByText("The passwords do not match.")).toBeVisible();

  await np.locator("#confirm-password").fill("Temporary-2-new!");
  await np.getByRole("button", { name: "Change password" }).click();
  await expect(np).toHaveURL("/provider");
  expect((await np.request.get("/api/v1/provider/dashboard")).status()).toBe(
    200,
  );

  // Put the demo password back through the voluntary change page.
  await np.goto("/account/password");
  await np.locator("#current-password").fill("Temporary-2-new!");
  await np.locator("#new-password").fill(PASSWORD);
  await np.locator("#confirm-password").fill(PASSWORD);
  await np.getByRole("button", { name: "Change password" }).click();
  await expect(np.getByRole("status")).toHaveText(
    "Your password has been changed.",
  );
  await np.close();

  await page.goto("/admin/audit");
  await expect(page.getByText("Changed own password").first()).toBeVisible();
});

test("Stay signed in works with one click while the server wakes up", async ({
  page,
}) => {
  await page.clock.install();
  await signIn(page, USERS.physician);
  await expect(page).toHaveURL("/provider");
  // Idle until the warning (a minute before the 30-minute timeout).
  await page.clock.fastForward("29:10");
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("Are you still there?");

  // The first session refresh fails as if the API were still asleep.
  let failed = false;
  await page.route("**/api/v1/auth/session", async (route) => {
    if (failed) {
      // The real refresh, with its expiry moved onto the page's fast-forwarded clock.
      const response = await route.fetch();
      const body = (await response.json()) as { idleExpiresAt: string };
      const shifted = Date.parse(body.idleExpiresAt) + (29 * 60 + 10) * 1000;
      return route.fulfill({
        response,
        json: { ...body, idleExpiresAt: new Date(shifted).toISOString() },
      });
    }
    failed = true;
    return route.abort("timedout");
  });
  await dialog.getByRole("button", { name: "Stay signed in" }).click();
  await expect(dialog).toBeHidden();
  expect(failed).toBe(true);
  await expect(page).toHaveURL("/provider");
});
