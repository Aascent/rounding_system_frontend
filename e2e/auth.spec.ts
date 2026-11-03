import { PASSWORD, USERS, expect, signIn, test } from "./helpers";

test("a wrong password shows one generic error", async ({ page }) => {
  await signIn(page, USERS.physician, "not-the-password");
  await expect(
    page.getByText("The email, password, or MFA code is incorrect."),
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
  // Sent back to sign in (with a "session ended" notice).
  await expect(page).toHaveURL(/:3100\/(\?.*)?$/);
  await expect(page.locator("#login-email")).toBeVisible();
  const response = await page.request.get("/api/v1/provider/dashboard");
  expect(response.status()).toBe(401);
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
