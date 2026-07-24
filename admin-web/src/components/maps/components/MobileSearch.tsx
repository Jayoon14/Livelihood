import {
  Crosshair,
  LoaderCircle,
  MapPin,
  Search,
  X,
} from "lucide-react";

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
  return (
    <div className="absolute left-3 top-24 z-10 flex flex-col gap-2 sm:left-5 sm:top-28 lg:hidden">
      <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/80 bg-white/95 px-4 shadow-2xl backdrop-blur-xl">
        <Search size={21} className="text-blue-600" />

        <input
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search street, barangay, city, or landmark..."
          className="min-w-0 flex-1 bg-transparent py-4 text-sm font-medium outline-none"
        />

        {searching ? (
          <LoaderCircle
            className="animate-spin text-blue-600"
            size={20}
          />
        ) : searchText ? (
          <button
            type="button"
            onClick={onClearSearch}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        ) : null}

        <button
          type="button"
          onClick={onCurrentLocation}
          className="rounded-full bg-blue-50 p-2.5 text-blue-600 hover:bg-blue-100"
        >
          {locating ? (
            <LoaderCircle
              className="animate-spin"
              size={19}
            />
          ) : (
            <Crosshair size={19} />
          )}
        </button>
      </div>

      {results.length > 0 && (
        <div className="mt-2 max-h-80 overflow-y-auto rounded-2xl border bg-white p-2 shadow-2xl">
          {results.map((result) => (
            <button
              key={result.place_id}
              type="button"
              onClick={() => onSelectResult(result)}
              className="flex w-full items-start gap-3 rounded-xl p-3 text-left hover:bg-slate-50"
            >
              <span className="rounded-full bg-blue-50 p-2 text-blue-600">
                <MapPin size={18} />
              </span>

              <span className="line-clamp-2 text-sm leading-6 text-slate-700">
                {result.display_name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}