"use client";

/** An API error with a message that is safe to show the user. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const SESSION_KEY = "smart-rounding.session";

/** Session ended on the server: drop the local copy and go to sign-in. */
export function handleSignedOut(): void {
  window.localStorage.removeItem(SESSION_KEY);
  window.location.assign("/?expired=1");
}

/**
 * Call the backend from the browser. Same-origin `/api/v1/*` (proxied by
 * Next.js), so the HttpOnly session cookie travels automatically.
 */
export async function apiFetch<T>(
  path: string,
  init: Readonly<{ method?: string; body?: unknown }> = {},
): Promise<T> {
  const request: RequestInit = {
    method: init.method ?? "GET",
    credentials: "same-origin",
  };
  if (init.body !== undefined) {
    request.headers = { "content-type": "application/json" };
    request.body = JSON.stringify(init.body);
  }
  const response = await fetch(`/api/v1${path}`, request);
  if (response.status === 204) return undefined as T;
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/auth/login"))
      handleSignedOut();
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "Something went wrong. Please try again.";
    throw new ApiError(response.status, message);
  }
  return payload as T;
}
