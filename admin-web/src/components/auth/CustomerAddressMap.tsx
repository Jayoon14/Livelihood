import { useEffect, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  MapPin,
  Search,
  CheckCircle2,
  Loader2,
} from "lucide-react";

import { toast } from "sonner";

// Fix Leaflet marker icons when using Vite
delete (L.Icon.Default.prototype as unknown as {
  _getIconUrl?: unknown;
})._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface CustomerAddressMapProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (
    latitude: number,
    longitude: number,
    address?: string,
  ) => void;
}

const DEFAULT_CENTER: [number, number] = [
  14.2471,
  121.1367,
];

// =========================
// MAP CENTER CONTROLLER
// =========================

function MapCenterController({
  latitude,
  longitude,
}: {
  latitude: number | null;
  longitude: number | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (
      latitude !== null &&
      longitude !== null
    ) {
      map.setView(
        [latitude, longitude],
        Math.max(map.getZoom(), 16),
        {
          animate: true,
        },
      );
    }
  }, [latitude, longitude, map]);

  return null;
}

// =========================
// MAP CLICK HANDLER
// =========================

function LocationMarker({
  latitude,
  longitude,
  onLocationChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (
    latitude: number,
    longitude: number,
  ) => void;
}) {
  useMapEvents({
    click(event) {
      onLocationChange(
        event.latlng.lat,
        event.latlng.lng,
      );
    },
  });

  if (
    latitude === null ||
    longitude === null
  ) {
    return null;
  }

  return (
    <Marker
      position={[
        latitude,
        longitude,
      ]}
    />
  );
}

// =========================
// REVERSE GEOCODING
// =========================

async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        latitude,
      )}&lon=${encodeURIComponent(
        longitude,
      )}&zoom=18&addressdetails=1`,
      {
        headers: {
          Accept:
            "application/json",
          "Accept-Language":
            "en",
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return data?.display_name ?? null;
  } catch (error) {
    console.error(
      "Reverse geocoding failed:",
      error,
    );

    return null;
  }
}

// =========================
// SEARCH ADDRESS
// =========================

async function searchAddress(
  query: string,
): Promise<SearchResult[]> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
      query,
    )}&countrycodes=ph&limit=5&addressdetails=1`,
    {
      headers: {
        Accept:
          "application/json",
        "Accept-Language":
          "en",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      "Unable to search the address.",
    );
  }

  return response.json();
}

export default function CustomerAddressMap({
  latitude,
  longitude,
  onLocationChange,
}: CustomerAddressMapProps) {
  const [search, setSearch] =
    useState("");

  const [searching, setSearching] =
    useState(false);

  const [results, setResults] =
    useState<SearchResult[]>([]);

  const [resolvingAddress, setResolvingAddress] =
    useState(false);

  const [selectedAddress, setSelectedAddress] =
    useState("");

  // =========================
  // SELECT LOCATION
  // =========================

  async function selectLocation(
    lat: number,
    lon: number,
    providedAddress?: string,
  ) {
    setResolvingAddress(true);

    try {
      let address = providedAddress;

      if (!address) {
        address =
          (await reverseGeocode(
            lat,
            lon,
          )) ?? "";
      }

      setSelectedAddress(address);

      onLocationChange(
        lat,
        lon,
        address,
      );
    } finally {
      setResolvingAddress(false);
    }
  }

  // =========================
  // SEARCH
  // =========================

  async function handleSearch() {
    const query = search.trim();

    if (!query) {
      toast.warning(
        "Enter an address to search.",
      );
      return;
    }

    try {
      setSearching(true);
      setResults([]);

      const data =
        await searchAddress(query);

      if (!data.length) {
        toast.warning(
          "No matching address was found.",
        );
        return;
      }

      setResults(data);
    } catch (error) {
      console.error(
        "Address search error:",
        error,
      );

      toast.error(
        "Unable to search the address. Please try again.",
      );
    } finally {
      setSearching(false);
    }
  }

  // =========================
  // CURRENT LOCATION
  // =========================

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error(
        "Your browser does not support location services.",
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await selectLocation(
          position.coords.latitude,
          position.coords.longitude,
        );
      },
      () => {
        toast.error(
          "Unable to get your current location. Please allow location access or select your address manually.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }

  const hasLocation =
    latitude !== null &&
    longitude !== null;

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      {/* HEADER */}
      <div className="border-b border-slate-200 p-4 dark:border-slate-700">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[#2937f0] dark:bg-indigo-500/10 dark:text-indigo-300">
            <MapPin className="h-5 w-5" />
          </div>

          <div>
            <h4 className="font-black text-slate-900 dark:text-white">
              Verify your address location
            </h4>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Search your address, then select the
              exact location on the map. You can also
              click directly on the map to adjust the
              pin.
            </p>
          </div>
        </div>
      </div>

      {/* SEARCH */}
      <div className="border-b border-slate-200 p-4 dark:border-slate-700">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-800">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSearch();
                }
              }}
              placeholder="Search your complete address"
              className="w-full bg-transparent py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              void handleSearch();
            }}
            disabled={searching}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2937f0] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#202dcc] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {searching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Search
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={useCurrentLocation}
          className="mt-3 text-xs font-bold text-[#2937f0] hover:underline dark:text-indigo-300"
        >
          Use my current location
        </button>
      </div>

      {/* SEARCH RESULTS */}
      {results.length > 0 && (
        <div className="border-b border-slate-200 dark:border-slate-700">
          {results.map(
            (result, index) => (
              <button
                type="button"
                key={`${result.lat}-${result.lon}-${index}`}
                onClick={() => {
                  const lat =
                    Number(result.lat);

                  const lon =
                    Number(result.lon);

                  void selectLocation(
                    lat,
                    lon,
                    result.display_name,
                  );

                  setResults([]);
                }}
                className="flex w-full items-start gap-3 border-b border-slate-100 p-4 text-left transition last:border-b-0 hover:bg-indigo-50 dark:border-slate-800 dark:hover:bg-slate-800"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2937f0]" />

                <span className="text-sm leading-5 text-slate-700 dark:text-slate-200">
                  {result.display_name}
                </span>
              </button>
            ),
          )}
        </div>
      )}

      {/* MAP */}
      <div className="h-[360px] w-full">
        <MapContainer
          center={
            hasLocation
              ? [
                  latitude!,
                  longitude!,
                ]
              : DEFAULT_CENTER
          }
          zoom={hasLocation ? 17 : 12}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapCenterController
            latitude={latitude}
            longitude={longitude}
          />

          <LocationMarker
            latitude={latitude}
            longitude={longitude}
            onLocationChange={(
              lat,
              lon,
            ) => {
              void selectLocation(
                lat,
                lon,
              );
            }}
          />
        </MapContainer>
      </div>

      {/* SELECTED LOCATION */}
      <div className="border-t border-slate-200 p-4 dark:border-slate-700">
        {hasLocation ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />

              <div className="min-w-0">
                <p className="text-sm font-black text-emerald-800 dark:text-emerald-300">
                  Location selected
                </p>

                {resolvingAddress ? (
                  <div className="mt-2 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Reading address...
                  </div>
                ) : (
                  <>
                    {selectedAddress && (
                      <p className="mt-1 text-xs leading-5 text-emerald-700 dark:text-emerald-400">
                        {selectedAddress}
                      </p>
                    )}

                    <p className="mt-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-500">
                      Coordinates:{" "}
                      {latitude?.toFixed(6)},{" "}
                      {longitude?.toFixed(6)}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            Please search for your address or click
            your exact location on the map before
            creating your account.
          </div>
        )}
      </div>
    </div>
  );
}