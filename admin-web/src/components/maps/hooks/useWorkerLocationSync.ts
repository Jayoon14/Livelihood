import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "../../../lib/supabase";
import type { Coordinates } from "../types";

interface WorkerLiveLocation {
  coordinates: Coordinates;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

interface UseWorkerLocationSyncParams {
  location: WorkerLiveLocation | null;
  enabled: boolean;
  minimumIntervalMilliseconds?: number;
}

interface WorkerLocationRow {
  worker_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  is_online: boolean;
  is_available: boolean;
  updated_at: string;
}

export function useWorkerLocationSync({
  location,
  enabled,
  minimumIntervalMilliseconds = 5_000,
}: UseWorkerLocationSyncParams) {
  const lastUpdateTimeRef = useRef(0);
  const updatingRef = useRef(false);

  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string>("");

  const updateWorkerLocation = useCallback(
    async (
      currentLocation: WorkerLiveLocation,
      online: boolean,
    ) => {
      if (updatingRef.current) {
        return;
      }

      updatingRef.current = true;
      setSyncing(true);
      setSyncError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          throw new Error("No authenticated worker found.");
        }

        const row: WorkerLocationRow = {
          worker_id: user.id,
          latitude: currentLocation.coordinates[1],
          longitude: currentLocation.coordinates[0],
          accuracy: currentLocation.accuracy,
          heading: currentLocation.heading,
          speed: currentLocation.speed,
          is_online: online,
          is_available: online,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("worker_locations")
          .upsert(row, {
            onConflict: "worker_id",
          });

        if (error) {
          throw error;
        }

        lastUpdateTimeRef.current = Date.now();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to update worker location.";

        console.error("Worker location sync error:", error);
        setSyncError(message);
      } finally {
        updatingRef.current = false;
        setSyncing(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!enabled || !location) {
      return;
    }

    const elapsed =
      Date.now() - lastUpdateTimeRef.current;

    if (elapsed < minimumIntervalMilliseconds) {
      return;
    }

    void updateWorkerLocation(location, true);
  }, [
    enabled,
    location,
    minimumIntervalMilliseconds,
    updateWorkerLocation,
  ]);

  const setWorkerOffline = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { error } = await supabase
        .from("worker_locations")
        .update({
          is_online: false,
          is_available: false,
          updated_at: new Date().toISOString(),
        })
        .eq("worker_id", user.id);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error(
        "Unable to set worker offline:",
        error,
      );
    }
  }, []);

  return {
    syncing,
    syncError,
    updateWorkerLocation,
    setWorkerOffline,
  };
}