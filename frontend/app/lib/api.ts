const apiOrigin = import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD ? "" : "http://localhost:8000");
const BASE_URL = apiOrigin.replace(/\/$/, "") + "/api/v1";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(BASE_URL + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.detail || `Request failed (${response.status})`, response.status);
  }
  return response.json();
}
