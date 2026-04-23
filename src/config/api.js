function normalizeBaseUrl(value) {
  return value?.replace(/\/+$/, "") || "";
}

function getApiBaseUrl() {
  const envUrl = normalizeBaseUrl(import.meta.env.VITE_API_URL?.trim());
  if (envUrl) return envUrl;

  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    const isLocalHost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1";

    if (isLocalHost) {
      return "http://localhost:5000";
    }

    return normalizeBaseUrl(origin);
  }

  return "http://localhost:5000";
}

export const API_BASE_URL = getApiBaseUrl();
