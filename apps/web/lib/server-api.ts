import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Call the backend from a Server Component, forwarding the user's session
 * cookie. A lapsed session sends the user to sign-in; 403/404 come back as
 * `undefined` so pages can show "not found" instead of leaking existence.
 */
export async function serverApi<T>(path: string): Promise<T | undefined> {
  const base = process.env.API_BASE_URL?.replace(/\/+$/, "");
  if (!base) throw new Error("API_BASE_URL is not configured");
  const cookieHeader = (await cookies()).toString();
  const response = await fetch(`${base}/api/v1${path}`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  }).catch((cause: unknown) => {
    throw new Error(
      `The API at ${base} is not reachable. Is it running (npm run dev:api)?`,
      { cause },
    );
  });
  if (response.status === 401) redirect("/?expired=1");
  if (response.status === 403 || response.status === 404) return undefined;
  if (!response.ok)
    throw new Error(`Backend request failed (${response.status})`);
  return (await response.json()) as T;
}

/** Like {@link serverApi}, but the value must exist. */
export async function serverApiRequired<T>(path: string): Promise<T> {
  const value = await serverApi<T>(path);
  if (value === undefined) redirect("/");
  return value;
}

/** Turn a rounding-list query into a query string (defaults omitted). */
export function toQueryString(query: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (value === "ALL" || value === false) continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}
