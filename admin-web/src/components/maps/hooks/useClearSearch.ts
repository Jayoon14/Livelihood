import { useCallback } from "react";

interface UseClearSearchProps {
  setSearchText: (value: string) => void;
  setResults: (value: []) => void;
}

export function useClearSearch({
  setSearchText,
  setResults,
}: UseClearSearchProps) {
  return useCallback(() => {
    setSearchText("");
    setResults([]);
  }, [setSearchText, setResults]);
}