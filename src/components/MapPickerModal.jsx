import { useEffect, useRef, useState } from "react";

const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

function loadLeafletAssets() {
  if (!document.querySelector(`link[href="${LEAFLET_CSS_URL}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = LEAFLET_CSS_URL;
    document.head.appendChild(link);
  }

  if (window.L) {
    return Promise.resolve(window.L);
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${LEAFLET_JS_URL}"]`);

    if (existingScript) {
      if (window.L) {
        resolve(window.L);
        return;
      }

      const handleLoad = () => resolve(window.L);
      existingScript.addEventListener("load", handleLoad, { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export default function MapPickerModal({
  open,
  initialCoords,
  onClose,
  onConfirm,
}) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const markerRef = useRef(null);
  const [selectedCoords, setSelectedCoords] = useState(initialCoords);
  const [isMapReady, setIsMapReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const { latitude, longitude } = selectedCoords;

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await response.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setSearchResults([]);
      setLoadError("Location search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLoadError("Geolocation is not supported on this device.");
      return;
    }

    setIsDetectingLocation(true);
    setLoadError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSelectedCoords({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        });
        setIsDetectingLocation(false);
      },
      () => {
        setLoadError("Current location could not be detected.");
        setIsDetectingLocation(false);
      }
    );
  };

  useEffect(() => {
    setSelectedCoords(initialCoords);
  }, [initialCoords]);

  useEffect(() => {
    if (!open || !containerRef.current) return undefined;

    let isMounted = true;
    setIsMapReady(false);
    setLoadError("");

    loadLeafletAssets()
      .then((L) => {
        if (!isMounted || !containerRef.current) return;

        mapRef.current = L.map(containerRef.current).setView(
          [latitude, longitude],
          13
        );

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(mapRef.current);

        mapRef.current.on("click", (event) => {
          const nextCoords = {
            latitude: Number(event.latlng.lat.toFixed(6)),
            longitude: Number(event.latlng.lng.toFixed(6)),
          };

          setSelectedCoords(nextCoords);
        });

        setIsMapReady(true);
      })
      .catch(() => {
        if (isMounted) {
          setLoadError("The map could not be loaded. Please try again.");
        }
      });

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
    };
  }, [open, latitude, longitude]);

  useEffect(() => {
    if (!mapRef.current || !window.L) return;

    if (!markerRef.current) {
      markerRef.current = window.L.marker([
        latitude,
        longitude,
      ]).addTo(mapRef.current);
    } else {
      markerRef.current.setLatLng([
        latitude,
        longitude,
      ]);
    }

    mapRef.current.setView(
      [latitude, longitude],
      mapRef.current.getZoom()
    );
  }, [latitude, longitude]);

  useEffect(() => {
    if (!open) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-3xl rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Set Location From Map</h2>
            <p className="mt-1 text-sm text-slate-500">
              Search a place or click anywhere on the map to place your location pin.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Search area, shop, city, or address..."
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400"
          />
          <button
            onClick={handleSearch}
            className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-sky-700"
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {isDetectingLocation ? "Detecting..." : "Use Current Location"}
          </button>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
          >
            Open in Google Maps
          </a>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-3 max-h-44 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                type="button"
                onClick={() => {
                  const nextCoords = {
                    latitude: Number(Number(result.lat).toFixed(6)),
                    longitude: Number(Number(result.lon).toFixed(6)),
                  };
                  setSelectedCoords(nextCoords);
                  setSearchQuery(result.display_name);
                  setSearchResults([]);
                }}
                className="block w-full rounded-xl bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-sky-50"
              >
                {result.display_name}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <div ref={containerRef} className="h-[380px] w-full bg-slate-100" />
        </div>

        {!isMapReady && !loadError && (
          <p className="mt-3 text-sm text-slate-500">Loading map...</p>
        )}

        {loadError && (
          <p className="mt-3 text-sm text-rose-600">{loadError}</p>
        )}

        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Selected coordinates</p>
            <p className="mt-1 font-semibold text-slate-800">
              {selectedCoords.latitude.toFixed(6)}, {selectedCoords.longitude.toFixed(6)}
            </p>
          </div>
          <button
            onClick={() => onConfirm(selectedCoords)}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Use This Location
          </button>
        </div>
      </div>
    </div>
  );
}
