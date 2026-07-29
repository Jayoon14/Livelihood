import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import PageLoader from "../components/common/PageLoader";

type LoadingContextValue = {
  isLoading: boolean;
  showLoading: (minimumDuration?: number) => void;
  hideLoading: () => void;
};

const LoadingContext = createContext<LoadingContextValue | null>(null);

const DEFAULT_MINIMUM_DURATION = 700;

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const visibleUntilRef = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const showLoading = useCallback(
    (minimumDuration = DEFAULT_MINIMUM_DURATION) => {
      clearHideTimer();
      visibleUntilRef.current = Math.max(
        visibleUntilRef.current,
        Date.now() + minimumDuration,
      );
      setIsLoading(true);
    },
    [clearHideTimer],
  );

  const hideLoading = useCallback(() => {
    clearHideTimer();

    const remaining = Math.max(0, visibleUntilRef.current - Date.now());

    hideTimerRef.current = setTimeout(() => {
      setIsLoading(false);
      visibleUntilRef.current = 0;
      hideTimerRef.current = null;
    }, remaining);
  }, [clearHideTimer]);

  useEffect(() => clearHideTimer, [clearHideTimer]);

  return (
    <LoadingContext.Provider value={{ isLoading, showLoading, hideLoading }}>
      {children}
      {isLoading && <PageLoader />}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);

  if (!context) {
    throw new Error("useLoading must be used inside LoadingProvider.");
  }

  return context;
}
