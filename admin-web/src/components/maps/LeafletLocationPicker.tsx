import { useEffect, useRef, useState } from "react";
import {
  LayersControl,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import {
  Crosshair,
  Layers3,
  LoaderCircle,
  MapPin,
  Navigation,
  Search,
} from "lucide-react";

import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LocationPickerProps {
  onLocationSelect: (
    latitude: number,
    longitude: number,
    address: string,
  ) => void;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

type Position = [number, number];

const DEFAULT_POSITION: Position = [14.2786, 121.1251];

async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
    );

    if (!response.ok) {
      throw new Error("Unable to retrieve the selected address.");
    }

    const data = await response.json();

    return data.display_name ?? "Selected location";
  } catch (error) {
    console.error("Reverse geocoding error:", error);

    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }
}


function RecenterMap({ position }: { position: Position }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(position, 17, {
      duration: 1,
    });
  }, [map, position]);

  return null;
}

function MapClickHandler({
  onSelect,
}: {
  onSelect: (latitude: number, longitude: number) => Promise<void>;
}) {
  useMapEvents({
    async click(event) {
      await onSelect(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function FloatingMapControls({
  onCurrentLocation,
}: {
  onCurrentLocation: () => void;
}) {
  const map = useMap();

  return (
    <div className="absolute bottom-20 right-4 z-[1000] flex flex-col gap-2">
      <button
        type="button"
        onClick={onCurrentLocation}
        title="Use current location"
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-lg transition hover:bg-gray-100"
      >
        <Crosshair size={21} />
      </button>

      <button
        type="button"
        onClick={() => map.zoomIn()}
        title="Zoom in"
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-xl font-bold shadow-lg transition hover:bg-gray-100"
      >
        +
      </button>

      <button
        type="button"
        onClick={() => map.zoomOut()}
        title="Zoom out"
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-xl font-bold shadow-lg transition hover:bg-gray-100"
      >
        −
      </button>
    </div>
  );
}

export default function LocationPicker({
  onLocationSelect,
}: LocationPickerProps) {
  const [position, setPosition] = useState<Position>(DEFAULT_POSITION);

  const [selectedAddress, setSelectedAddress] = useState("");
  const [editableAddress, setEditableAddress] = useState("");
  const [searchText, setSearchText] = useState("");

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const [loadingLocation, setLoadingLocation] = useState(true);
  const [searching, setSearching] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [showLayersHint, setShowLayersHint] = useState(false);
  const [locationError, setLocationError] = useState("");

  const searchTimeout = useRef<number | null>(null);

  async function selectLocation(
    latitude: number,
    longitude: number,
    providedAddress?: string,
  ) {
    const address =
      providedAddress ?? (await reverseGeocode(latitude, longitude));

    setPosition([latitude, longitude]);
    setSelectedAddress(address);
    setEditableAddress(address);
    setSearchText(address);
    setSearchResults([]);

    onLocationSelect(latitude, longitude, address);
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setLoadingLocation(false);
      return;
    }

    setLoadingLocation(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      async (location) => {
        await selectLocation(
          location.coords.latitude,
          location.coords.longitude,
        );

        setLoadingLocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);

        setLocationError(
          "Unable to get your current location. You can search or click the map instead.",
        );

        setLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  }

  useEffect(() => {
    useCurrentLocation();
  }, []);

  function searchAddress(value: string) {
    setSearchText(value);

    if (searchTimeout.current !== null) {
      window.clearTimeout(searchTimeout.current);
    }

    if (value.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    searchTimeout.current = window.setTimeout(async () => {
      setSearching(true);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=ph&q=${encodeURIComponent(
            value,
          )}`,
        );

        if (!response.ok) {
          throw new Error("Address search failed.");
        }

        const data: SearchResult[] = await response.json();

        setSearchResults(data);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
  }

  function saveEditedAddress() {
    const value = editableAddress.trim();

    if (!value) {
      alert("Please enter a valid selected address.");
      return;
    }

    setSelectedAddress(value);
    setSearchText(value);

    onLocationSelect(position[0], position[1], value);
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
      <div className="relative h-[560px] w-full sm:h-[600px]">
        <MapContainer
          center={position}
          zoom={15}
          zoomControl={false}
          className="h-full w-full"
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Standard">
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer name="Terrain">
              <TileLayer
                attribution="Map tiles by OpenTopoMap"
                url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer name="Humanitarian">
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          <RecenterMap position={position} />

          <MapClickHandler
            onSelect={async (latitude, longitude) => {
              await selectLocation(latitude, longitude);
            }}
          />

          <Marker
            position={position}
            draggable
            eventHandlers={{
              async dragend(event) {
                const marker = event.target as L.Marker;
                const markerPosition = marker.getLatLng();

                await selectLocation(markerPosition.lat, markerPosition.lng);
              },
            }}
          />

          <FloatingMapControls onCurrentLocation={useCurrentLocation} />
        </MapContainer>

        <div className="absolute left-4 right-4 top-4 z-[1000] mx-auto max-w-2xl">
          <div className="flex h-14 items-center gap-3 rounded-2xl border border-white/80 bg-white/95 px-4 shadow-[0_10px_35px_rgba(15,23,42,0.20)] backdrop-blur-xl">
            <Search className="shrink-0 text-blue-600" size={21} />

            <input
              type="text"
              value={searchText}
              onChange={(event) => searchAddress(event.target.value)}
              placeholder="Search barangay, street, landmark..."
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
            />

            {searching ? (
              <LoaderCircle size={20} className="animate-spin text-blue-600" />
            ) : (
              <button
                type="button"
                onClick={useCurrentLocation}
                title="Use current location"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition hover:bg-blue-100"
              >
                <Crosshair size={19} />
              </button>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
              {searchResults.map((result) => (
                <button
                  key={result.place_id}
                  type="button"
                  onClick={() =>
                    selectLocation(
                      Number(result.lat),
                      Number(result.lon),
                      result.display_name,
                    )
                  }
                  className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <MapPin size={18} />
                  </span>

                  <span className="line-clamp-2 pt-1 text-sm leading-5 text-slate-700">
                    {result.display_name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

       <div className="absolute left-4 top-24 z-[900] flex flex-col gap-2">
        <button
            type="button"
            onClick={() => setShowDirections((current) => !current)}
            title="Directions"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/80 bg-white/95 text-slate-700 shadow-xl backdrop-blur transition hover:bg-blue-50 hover:text-blue-600"
        >
            <Navigation size={20} />
        </button>

        <button
            type="button"
            onClick={() => setShowLayersHint((current) => !current)}
            title="Map layers"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/80 bg-white/95 text-slate-700 shadow-xl backdrop-blur transition hover:bg-blue-50 hover:text-blue-600"
        >
            <Layers3 size={20} />
        </button>
        </div>

                {showDirections && (
          <div className="absolute left-4 top-48 z-[1000] w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">Directions</h3>

              <button
                type="button"
                onClick={() => setShowDirections(false)}
                className="text-gray-500 hover:text-gray-900"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border px-3 py-2 text-sm text-gray-600">
                Current location
              </div>

              <div className="rounded-xl border px-3 py-2 text-sm text-gray-600">
                {selectedAddress || "Selected service location"}
              </div>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              Route line, distance, and ETA will be connected in the next step.
            </p>
          </div>
        )}

        {showLayersHint && (
          <div className="absolute left-4 top-48 z-[1000] max-w-sm rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
            <div className="mb-2 flex items-center justify-between gap-8">
              <h3 className="font-bold">Map layers</h3>

              <button
                type="button"
                onClick={() => setShowLayersHint(false)}
                className="text-gray-500 hover:text-gray-900"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-gray-600">
              Use the layers button at the upper-right side of the map to switch
              between Standard, Terrain, and Humanitarian views.
            </p>
          </div>
        )}

        {loadingLocation && (
          <div className="absolute inset-0 z-[1100] flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-xl">
              <LoaderCircle className="animate-spin text-blue-600" />

              <span className="font-medium">
                Getting your current location...
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 p-4">
        <label className="mb-2 block font-semibold">Selected Address</label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={editableAddress}
            onChange={(event) => setEditableAddress(event.target.value)}
            placeholder="Type or edit the selected address"
            className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
          />

          <button
            type="button"
            onClick={saveEditedAddress}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Use Address
          </button>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-xl bg-blue-50 p-3">
          <MapPin size={20} className="mt-0.5 shrink-0 text-blue-600" />

          <div>
            <p className="font-semibold text-blue-900">
              Selected service location
            </p>

            <p className="mt-1 text-sm text-blue-800">
              {selectedAddress ||
                "Search an address, use your current location, or click the map."}
            </p>

            <p className="mt-2 text-xs text-blue-600">
              Latitude: {position[0].toFixed(6)} · Longitude:{" "}
              {position[1].toFixed(6)}
            </p>
          </div>
        </div>

        {locationError && (
          <p className="mt-3 rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800">
            {locationError}
          </p>
        )}
      </div>
    </div>
  );
}
