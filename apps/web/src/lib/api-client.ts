import { API_BASE_URL } from "./config";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

const SAFE_METHODS = new Set<HttpMethod>(["GET"]);

function getCookie(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

  const parts = document.cookie.split(";").map((cookie) => cookie.trim());
  const match = parts.find((cookie) => cookie.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

async function rawRequest(path: string, method: HttpMethod, body?: unknown) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (!SAFE_METHODS.has(method)) {
    const csrfToken = getCookie("jt_csrf");
    if (csrfToken) {
      headers["x-csrf-token"] = csrfToken;
    }
  }

  return fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined
  });
}

export async function apiRequest<T>(path: string, method: HttpMethod, body?: unknown): Promise<T> {
  let response = await rawRequest(path, method, body);

  if (response.status === 401 && path !== "/auth/refresh") {
    const refreshResponse = await rawRequest("/auth/refresh", "POST");
    if (refreshResponse.ok) {
      response = await rawRequest(path, method, body);
    }
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message ?? "Unexpected API error");
  }

  return payload as T;
}
