import {
  useEffect,
  useRef,
  type DependencyList,
} from "react";

import {
  useRealtimeTableVersion,
  type RealtimeTable,
} from "../providers/RealtimeProvider";

interface UseRealtimeRefreshOptions {
  table: RealtimeTable;
  refresh: () => void | Promise<void>;
  enabled?: boolean;
  delayMilliseconds?: number;
  dependencies?: DependencyList;
}

export default function useRealtimeRefresh({
  table,
  refresh,
  enabled = true,
  delayMilliseconds = 150,
  dependencies = [],
}: UseRealtimeRefreshOptions) {
  const version = useRealtimeTableVersion(table);

  const refreshRef = useRef(refresh);
  const initializedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      void refreshRef.current();
      timeoutRef.current = null;
    }, delayMilliseconds);

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [
    version,
    enabled,
    delayMilliseconds,
    ...dependencies,
  ]);
}