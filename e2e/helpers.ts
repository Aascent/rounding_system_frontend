import { test as base, expect, type Page } from "@playwright/test";

/** `test` that also fails on any uncaught error in the page (a crashed render, a bad script). */
export const test = base.extend<{ pageErrors: void }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await use();
      expect(errors, "uncaught page errors").toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

export const PASSWORD = "Demo123!";
export const MFA = "123456";
export const USERS = {
  physician: "provider@smart-rounding.test",
  np: "np@smart-rounding.test",
  admin: "admin@smart-rounding.test",
} as const;

export async function signIn(
  page: Page,
  email: string,
  password: string = PASSWORD,
): Promise<void> {
  await page.goto("/");
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.locator("#login-mfa").fill(MFA);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** Sign in and wait until the app has left the sign-in page. */
export async function signInAs(page: Page, email: string): Promise<void> {
  await signIn(page, email);
  await page.waitForURL((url) => url.pathname !== "/");
}

/** The page fits the viewport: nothing forces sideways scrolling. */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow, `${page.url()} overflows horizontally`).toBeLessThanOrEqual(
    0,
  );
}
