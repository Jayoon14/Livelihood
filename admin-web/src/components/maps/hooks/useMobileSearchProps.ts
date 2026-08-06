import type { SearchResult } from "../types";

interface Props {
  searchText: string;
  searching: boolean;
  locating: boolean;
  results: SearchResult[];

  searchAddress: (value: string) => void;
  clearSearch: () => void;
  handleCurrentLocation: () => void;
  handleSearchResultSelect: (result: SearchResult) => void;
}

export function useMobileSearchProps(props: Props) {
  return {
    searchText: props.searchText,
    searching: props.searching,
    locating: props.locating,
    results: props.results,

    onSearchChange: props.searchAddress,
    onClearSearch: props.clearSearch,
    onCurrentLocation: props.handleCurrentLocation,
    onSelectResult: props.handleSearchResultSelect,
  };
}