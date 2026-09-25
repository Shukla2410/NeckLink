export const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
export async function apiFetch(url, options = {}) {
  return globalThis.fetch(url, {
    ...options,
    credentials: "include",
    headers: { "X-Necklink-Client": "web", ...options.headers },
  });
}
export async function api(path, options = {}) {
  const response = await apiFetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await response
    .json()
    .catch(() => ({ message: "Server response unavailable" }));
  if (!response.ok)
    throw Object.assign(new Error(data.message || "Request failed"), {
      status: response.status,
    });
  return data;
}
