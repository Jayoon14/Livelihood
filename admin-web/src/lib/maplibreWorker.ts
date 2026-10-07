import { setWorkerUrl } from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";

let configured = false;

/**
 * Vite/SPA deployments must serve MapLibre's module worker as a real JS asset.
 * Explicitly resolving it through Vite prevents the SPA rewrite from returning
 * index.html for /assets/maplibre-gl-worker.mjs on production hosts.
 */
export function configureMapLibreWorker() {
  if (configured) return;
  setWorkerUrl(maplibreWorkerUrl);
  configured = true;
}
