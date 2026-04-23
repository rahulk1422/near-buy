const DEFAULT_RAILWAY_API_URL = "https://near-buy-production.up.railway.app";

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

    if (hostname.endsWith("vercel.app")) {
      return DEFAULT_RAILWAY_API_URL;
    }

    return normalizeBaseUrl(origin);
  }

  return DEFAULT_RAILWAY_API_URL;
}

export const API_BASE_URL = getApiBaseUrl();
