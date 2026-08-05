import {
  ChevronDown,
  Crosshair,
  LoaderCircle,
  MapPin,
  Search,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import type { SearchResult } from "../types";

interface MobileSearchProps {
  searchText: string;
  searching: boolean;
  locating: boolean;
  results: SearchResult[];

  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onCurrentLocation: () => void;
  onSelectResult: (result: SearchResult) => void | Promise<void>;
}

export default function MobileSearch({
  searchText,
  searching,
  locating,
  results,
  onSearchChange,
  onClearSearch,
  onCurrentLocation,
  onSelectResult,
}: MobileSearchProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (results.length > 0 || searching) {
      setOpen(true);
    }
  }, [results.length, searching]);

  const handleSelectResult = async (
    result: SearchResult,
  ): Promise<void> => {
    await onSelectResult(result);
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute bottom-3 left-3 z-30 inline-flex max-w-[calc(100%-5.5rem)] items-center gap-2 rounded-full border border-white/80 bg-white/95 px-4 py-3 text-sm font-bold text-slate-800 shadow-2xl backdrop-blur-xl transition hover:bg-white sm:bottom-5 sm:left-5 lg:hidden"
        aria-label="Open location search"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
          <Search size={17} />
        </span>

        <span className="truncate">
          {searchText || "Search service location"}
        </span>
      </button>
    );
  }

  return (
    <div className="absolute inset-x-2 bottom-2 z-40 lg:hidden sm:inset-x-4 sm:bottom-4">
      <div className="max-h-[58dvh] overflow-hidden rounded-3xl border border-white/80 bg-white/98 shadow-[0_24px_60px_rgba(15,23,42,0.35)] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900">
              Search service location
            </p>
            <p className="truncate text-xs text-slate-500">
              Search an address or use your GPS.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ml-3 rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
            aria-label="Close location search"
          >
            <ChevronDown size={19} />
          </button>
        </div>

        <div className="p-3 sm:p-4">
          <div className="flex min-h-13 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100">
            <Search size={19} className="shrink-0 text-blue-600" />

            <input
              value={searchText}
              onChange={(event) =>
                onSearchChange(event.target.value)
              }
              placeholder="Street, barangay, city, landmark..."
              className="min-w-0 flex-1 bg-transparent py-3 text-sm font-medium outline-none"
              autoFocus
            />

            {searching ? (
              <LoaderCircle
                className="shrink-0 animate-spin text-blue-600"
                size={19}
              />
            ) : searchText ? (
              <button
                type="button"
                onClick={onClearSearch}
                className="shrink-0 rounded-full p-2 text-slate-500 transition hover:bg-slate-200"
                aria-label="Clear location search"
              >
                <X size={17} />
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => {
              onCurrentLocation();
              setOpen(false);
            }}
            className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-left transition hover:bg-blue-100"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
              {locating ? (
                <LoaderCircle
                  className="animate-spin"
                  size={19}
                />
              ) : (
                <Crosshair size={19} />
              )}
            </span>

            <span>
              <span className="block text-sm font-bold text-slate-900">
                Use current location
              </span>
              <span className="block text-xs text-slate-500">
                Pin the service address using GPS.
              </span>
            </span>
          </button>

          {results.length > 0 && (
            <div className="mt-3 max-h-[30dvh] space-y-1 overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-2">
              {results.map((result) => (
                <button
                  key={result.place_id}
                  type="button"
                  onClick={() =>
                    void handleSelectResult(result)
                  }
                  className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-blue-50"
                >
                  <span className="mt-0.5 rounded-full bg-blue-50 p-2 text-blue-600">
                    <MapPin size={17} />
                  </span>

                  <span className="line-clamp-2 text-sm leading-5 text-slate-700">
                    {result.display_name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
