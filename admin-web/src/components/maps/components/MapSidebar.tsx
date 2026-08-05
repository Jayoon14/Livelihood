import {
  History,
  Layers3,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { formatDistance, formatDuration } from "../format";
import type { SavedPlace, SearchResult } from "../types";

interface MapSidebarProps {
  searchText: string;
  results: SearchResult[];
  searching: boolean;
  locating: boolean;
  routing: boolean;
  searchHistory: SavedPlace[];
  selectedAddress: string;
  distance: number | null;
  duration: number | null;
  hasCurrentLocation: boolean;

  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onSelectSearchResult: (result: SearchResult) => void | Promise<void>;
  onCurrentLocationClick: () => void;
  onClearSearchHistory: () => void;
  onSelectHistoryPlace: (place: SavedPlace) => void | Promise<void>;
  onOpenLayers: () => void;
  onGetDirections: () => void;
}

export default function MapSidebar({
  searchText,
  results,
  searching,
  locating,
  routing,
  searchHistory,
  selectedAddress,
  distance,
  duration,
  hasCurrentLocation,
  onSearchChange,
  onClearSearch,
  onSelectSearchResult,
  onCurrentLocationClick,
  onClearSearchHistory,
  onSelectHistoryPlace,
  onOpenLayers,
  onGetDirections,
}: MapSidebarProps) {
  return (
    <aside className="relative z-20 hidden w-[320px] shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="border-b border-slate-200 px-5 py-5">
        <h2 className="text-xl font-bold text-slate-900">Navigation</h2>

        <p className="mt-1 text-sm leading-5 text-slate-500">
          Search a destination or choose a point on the map.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Search location
          </label>

          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600"
            />

            <input
              value={searchText}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Street, barangay, city..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />

            {searching ? (
              <LoaderCircle
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-600"
              />
            ) : searchText ? (
              <button
                type="button"
                onClick={onClearSearch}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            ) : null}
          </div>
        </div>

        {results.length > 0 && (
          <div className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
            {results.map((result) => (
              <button
                key={result.place_id}
                type="button"
                onClick={() => onSelectSearchResult(result)}
                className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-blue-50"
              >
                <span className="mt-0.5 rounded-full bg-blue-100 p-2 text-blue-600">
                  <MapPin size={16} />
                </span>

                <span className="line-clamp-2 text-sm leading-5 text-slate-700">
                  {result.display_name}
                </span>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onCurrentLocationClick}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
        >
          <span className="rounded-xl bg-blue-100 p-2.5 text-blue-600">
            {locating ? (
              <LoaderCircle size={18} className="animate-spin" />
            ) : (
              <LocateFixed size={18} />
            )}
          </span>

          <span>
            <span className="block text-sm font-semibold text-slate-900">
              Current location
            </span>

            <span className="block text-xs text-slate-500">
              {hasCurrentLocation
                ? "Recenter map to your GPS position"
                : "Use your device GPS"}
            </span>
          </span>
        </button>

        {searchHistory.length > 0 && (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={17} className="text-slate-500" />

                <p className="text-sm font-semibold text-slate-700">
                  Recent searches
                </p>
              </div>

              <button
                type="button"
                onClick={onClearSearchHistory}
                title="Clear search history"
                aria-label="Clear search history"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="space-y-1">
              {searchHistory.map((place) => (
                <button
                  key={`${place.latitude}-${place.longitude}-${place.address}`}
                  type="button"
                  onClick={() => onSelectHistoryPlace(place)}
                  className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-slate-100"
                >
                  <span className="mt-0.5 rounded-full bg-slate-100 p-2 text-slate-500">
                    <History size={15} />
                  </span>

                  <span className="min-w-0">
                    <span className="line-clamp-2 block text-sm leading-5 text-slate-700">
                      {place.address}
                    </span>

                    <span className="mt-1 block text-[11px] text-slate-400">
                      {place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-slate-700">
            Selected destination
          </p>

          <div className="rounded-2xl bg-slate-100 p-4">
            <div className="flex items-start gap-3">
              <MapPin size={18} className="mt-0.5 shrink-0 text-blue-600" />

              <p className="text-sm leading-6 text-slate-700">
                {selectedAddress || "No destination selected yet."}
              </p>
            </div>
          </div>
        </div>

      </div>
      <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.06)]">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onOpenLayers}
            className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
          >
            <Layers3 size={18} />
            Layers
          </button>

          <button
            type="button"
            onClick={onGetDirections}
            disabled={routing}
            className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-3 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {routing ? (
              <LoaderCircle size={18} className="animate-spin" />
            ) : (
              <Navigation size={18} />
            )}
            {routing ? "Routing..." : "Route"}
          </button>
        </div>

        {distance !== null && duration !== null && (
          <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white p-2.5">
                <p className="text-[11px] text-slate-500">Distance</p>
                <p className="mt-0.5 text-sm font-bold text-slate-900">
                  {formatDistance(distance)}
                </p>
              </div>

              <div className="rounded-xl bg-white p-2.5">
                <p className="text-[11px] text-slate-500">Estimated time</p>
                <p className="mt-0.5 text-sm font-bold text-slate-900">
                  {formatDuration(duration)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
