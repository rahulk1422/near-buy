const PROD_API_URL = "https://near-buy-production.up.railway.app";

function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  if (envUrl) return envUrl;

  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    const isLocalHost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1";

    if (isLocalHost) {
      return "http://localhost:5000";
    }
  }

  return PROD_API_URL;
}

export const API_BASE_URL = getApiBaseUrl();
