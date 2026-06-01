export function adminProductFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);

  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }

  return fetch(input, {
    ...init,
    credentials: "include",
    headers,
  });
}
