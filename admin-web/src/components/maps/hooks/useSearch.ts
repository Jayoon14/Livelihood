import { useEffect, useRef, useState } from "react";
import type { SearchResult } from "../types";

export function useSearch() {
  const searchTimerRef = useRef<number | null>(null);

  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  function searchAddress(value: string) {
    setSearchText(value);

    if (searchTimerRef.current !== null) {
      window.clearTimeout(searchTimerRef.current);
    }

    if (value.trim().length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }

    searchTimerRef.current = window.setTimeout(async () => {
      setSearching(true);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=7&countrycodes=ph&q=${encodeURIComponent(
            value,
          )}`,
        );

        if (!response.ok) {
          throw new Error("Search failed.");
        }

        const data = (await response.json()) as SearchResult[];
        setResults(data);
      } catch (error) {
        console.error("Location search error:", error);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 650);
  }

  useEffect(() => {
    return () => {
      if (searchTimerRef.current !== null) {
        window.clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  return {
    searchText,
    setSearchText,
    results,
    setResults,
    searching,
    searchAddress,
  };
}