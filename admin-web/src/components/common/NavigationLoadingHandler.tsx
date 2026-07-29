import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

import { useLoading } from "../../context/LoadingContext";

const NAVIGATION_LOADER_DURATION = 700;

export default function NavigationLoadingHandler() {
  const location = useLocation();
  const { showLoading, hideLoading } = useLoading();
  const firstRenderRef = useRef(true);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const destination = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);

      const isInternal = destination.origin === current.origin;
      const isSamePage =
        destination.pathname === current.pathname &&
        destination.search === current.search &&
        destination.hash === current.hash;

      if (isInternal && !isSamePage) {
        showLoading(NAVIGATION_LOADER_DURATION);
      }
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [showLoading]);

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }

    // Also catches useNavigate(), redirects, browser Back, and browser Forward.
    showLoading(NAVIGATION_LOADER_DURATION);

    const frame = requestAnimationFrame(() => {
      hideLoading();
    });

    return () => cancelAnimationFrame(frame);
  }, [location.key, location.pathname, location.search, hideLoading, showLoading]);

  return null;
}
