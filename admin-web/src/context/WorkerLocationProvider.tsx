import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "../lib/supabase";

interface WorkerLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  updatedAt: string;
}

interface WorkerLocationContextValue {
  workerLocation: WorkerLocation | null;

  isOnline: boolean;
  isTracking: boolean;
  locating: boolean;

  message: string;

  goOnline: () => Promise<void>;
  goOffline: () => Promise<void>;
}

interface WorkerLocationProviderProps {
  children: ReactNode;
}

const WorkerLocationContext =
  createContext<WorkerLocationContextValue | null>(null);

const WORKER_ONLINE_STORAGE_KEY = "livelihoodgo_worker_online";

/*
 * Magbibigay lang ng warning kapag napakahina ng location accuracy.
 * Hindi nito tuluyang iba-block ang worker dahil puwedeng coarse location
 * muna ang unang ibigay ng browser.
 */
const LOW_ACCURACY_THRESHOLD_METERS = 1_000;

export function WorkerLocationProvider({
  children,
}: WorkerLocationProviderProps) {
  const watchIdRef = useRef<number | null>(null);
  const workerIdRef = useRef<string | null>(null);
  const startingRef = useRef(false);

  /*
   * Binabago ito sa bawat start/stop.
   * Ginagamit para hindi makapag-set ng online state ang lumang async request
   * pagkatapos pindutin ang Go Offline.
   */
  const trackingSessionRef = useRef(0);

  const [workerLocation, setWorkerLocation] =
    useState<WorkerLocation | null>(null);

  const [isOnline, setIsOnline] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("");

  const verifyWorkerAccount = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (error) {
      throw new Error(`Unable to verify worker account: ${error.message}`);
    }

    const role =
      typeof data?.role === "string" ? data.role.trim().toLowerCase() : "";

    if (role !== "worker") {
      throw new Error("GPS tracking is only available for worker accounts.");
    }
  }, []);

  const saveWorkerLocation = useCallback(
    async (workerId: string, location: WorkerLocation) => {
      const { error } = await supabase.from("worker_locations").upsert(
        {
          worker_id: workerId,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          heading: location.heading,
          speed: location.speed,
          is_online: true,
          is_available: true,
          updated_at: location.updatedAt,
        },
        {
          onConflict: "worker_id",
        },
      );

      if (error) {
        throw error;
      }
    },
    [],
  );

  const updateOfflineStatus = useCallback(async (workerId: string) => {
    const { error } = await supabase
      .from("worker_locations")
      .update({
        is_online: false,
        is_available: false,
        updated_at: new Date().toISOString(),
      })
      .eq("worker_id", workerId);

    if (error) {
      throw error;
    }
  }, []);

  const stopBrowserTracking = useCallback(() => {
    /*
     * Ini-invalidate ang anumang pending GPS save.
     */
    trackingSessionRef.current += 1;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    startingRef.current = false;

    setIsTracking(false);
    setLocating(false);
  }, []);

  const clearLocalTrackingState = useCallback(() => {
    stopBrowserTracking();

    workerIdRef.current = null;

    setWorkerLocation(null);
    setIsOnline(false);
    setIsTracking(false);
    setLocating(false);
    setMessage("");

    localStorage.removeItem(WORKER_ONLINE_STORAGE_KEY);
  }, [stopBrowserTracking]);

  const startBrowserTracking = useCallback(async () => {
    if (startingRef.current || watchIdRef.current !== null) {
      return;
    }

    if (!navigator.geolocation) {
      setMessage("Geolocation is not supported by this browser.");
      return;
    }

    startingRef.current = true;
    setLocating(true);
    setMessage("");

    /*
     * Bagong tracking session.
     */
    trackingSessionRef.current += 1;
    const currentTrackingSession = trackingSessionRef.current;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("Worker account is not authenticated.");
      }

      /*
       * Mahalaga ito para hindi makagamit ng worker GPS ang customer/admin.
       */
      await verifyWorkerAccount(user.id);

      if (currentTrackingSession !== trackingSessionRef.current) {
        return;
      }

      workerIdRef.current = user.id;

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location: WorkerLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,

            accuracy: Number.isFinite(position.coords.accuracy)
              ? position.coords.accuracy
              : null,

            heading:
              typeof position.coords.heading === "number" &&
              Number.isFinite(position.coords.heading)
                ? position.coords.heading
                : null,

            speed:
              typeof position.coords.speed === "number" &&
              Number.isFinite(position.coords.speed)
                ? position.coords.speed
                : null,

            updatedAt: new Date(position.timestamp).toISOString(),
          };

          console.log("GPS Update:", location);

          /*
           * Huwag munang mag-online.
           * I-save muna nang successful ang GPS sa Supabase.
           */
          void saveWorkerLocation(user.id, location)
            .then(() => {
              /*
               * Kapag nag-Go Offline habang nagsa-save ang GPS,
               * huwag nang ibalik sa online ang UI.
               */
              if (
                currentTrackingSession !== trackingSessionRef.current ||
                watchIdRef.current === null
              ) {
                return;
              }

              setWorkerLocation(location);
              setIsOnline(true);
              setIsTracking(true);
              setLocating(false);

              localStorage.setItem(WORKER_ONLINE_STORAGE_KEY, "true");

              if (
                location.accuracy !== null &&
                location.accuracy > LOW_ACCURACY_THRESHOLD_METERS
              ) {
                setMessage(
                  `GPS is connected, but accuracy is currently about ${Math.round(
                    location.accuracy,
                  )} meters. Enable precise location or move outdoors.`,
                );
              } else {
                setMessage("");
              }
            })
            .catch((locationError) => {
              console.error(
                "Unable to sync worker location:",
                locationError,
              );

              if (currentTrackingSession !== trackingSessionRef.current) {
                return;
              }

              setIsOnline(false);
              setIsTracking(false);
              setLocating(false);

              localStorage.removeItem(WORKER_ONLINE_STORAGE_KEY);

              setMessage(
                "GPS location was received, but it could not be synced. Please check your internet connection and try again.",
              );
            });
        },

        (geolocationError) => {
          if (currentTrackingSession !== trackingSessionRef.current) {
            return;
          }

          setLocating(false);

          switch (geolocationError.code) {
            case geolocationError.PERMISSION_DENIED: {
              setMessage(
                "Location permission was denied. Please allow location access in your browser settings.",
              );

              const currentWorkerId = workerIdRef.current;

              stopBrowserTracking();

              setWorkerLocation(null);
              setIsOnline(false);

              localStorage.removeItem(WORKER_ONLINE_STORAGE_KEY);

              if (currentWorkerId) {
                void updateOfflineStatus(currentWorkerId).catch(
                  (offlineError) => {
                    console.error(
                      "Unable to update worker status after permission denial:",
                      offlineError,
                    );
                  },
                );
              }

              break;
            }

            case geolocationError.POSITION_UNAVAILABLE:
              setMessage(
                "Your current location is temporarily unavailable. Make sure GPS or location services are enabled.",
              );
              break;

            case geolocationError.TIMEOUT:
              setMessage(
                "Location update timed out. GPS will continue retrying automatically.",
              );
              break;

            default:
              setMessage("Unable to track your current location.");
          }

          console.warn(
            "Worker geolocation warning:",
            geolocationError.message,
          );
        },

        {
          enableHighAccuracy: true,
          timeout: 20_000,
          maximumAge: 5_000,
        },
      );

      watchIdRef.current = watchId;
    } catch (error) {
      console.error("Unable to start worker tracking:", error);

      stopBrowserTracking();

      workerIdRef.current = null;

      setWorkerLocation(null);
      setIsOnline(false);
      setIsTracking(false);
      setLocating(false);

      localStorage.removeItem(WORKER_ONLINE_STORAGE_KEY);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to start GPS tracking.",
      );
    } finally {
      startingRef.current = false;
    }
  }, [
    saveWorkerLocation,
    stopBrowserTracking,
    updateOfflineStatus,
    verifyWorkerAccount,
  ]);

  const goOnline = useCallback(async () => {
    /*
     * Hindi tayo magse-set ng isOnline at localStorage dito.
     * Magiging online lang pagkatapos:
     *
     * 1. Ma-verify na worker ang account
     * 2. Makakuha ng valid GPS
     * 3. Successful na ma-save sa Supabase
     */
    await startBrowserTracking();
  }, [startBrowserTracking]);

  const goOffline = useCallback(async () => {
    const currentWorkerId = workerIdRef.current;

    stopBrowserTracking();

    setWorkerLocation(null);
    setIsOnline(false);
    setIsTracking(false);
    setLocating(false);
    setMessage("");

    localStorage.removeItem(WORKER_ONLINE_STORAGE_KEY);

    let workerId = currentWorkerId;

    if (!workerId) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "Unable to retrieve worker while going offline:",
          userError,
        );
      }

      workerId = user?.id ?? null;
    }

    if (!workerId) {
      workerIdRef.current = null;
      return;
    }

    try {
      /*
       * Siguraduhing worker account bago mag-update ng worker_locations.
       */
      await verifyWorkerAccount(workerId);
      await updateOfflineStatus(workerId);
    } catch (error) {
      console.error("Unable to set worker offline:", error);

      setMessage(
        "Tracking stopped, but the offline status could not be synced.",
      );
    } finally {
      workerIdRef.current = null;
    }
  }, [
    stopBrowserTracking,
    updateOfflineStatus,
    verifyWorkerAccount,
  ]);

  /*
   * Restore tracking pagkatapos ng browser refresh.
   * Tatakbo lang ito kapag:
   *
   * - may authenticated account;
   * - worker ang role;
   * - naka-save na online dati.
   */
  useEffect(() => {
    let active = true;

    async function restoreWorkerTracking() {
      const shouldRestore =
        localStorage.getItem(WORKER_ONLINE_STORAGE_KEY) === "true";

      if (!shouldRestore) {
        return;
      }

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user || !active) {
          clearLocalTrackingState();
          return;
        }

        await verifyWorkerAccount(user.id);

        if (!active) {
          return;
        }

        await startBrowserTracking();
      } catch (error) {
        console.error("Unable to restore worker GPS tracking:", error);

        if (active) {
          clearLocalTrackingState();
        }
      }
    }

    void restoreWorkerTracking();

    return () => {
      active = false;
    };
  }, [
    clearLocalTrackingState,
    startBrowserTracking,
    verifyWorkerAccount,
  ]);

  /*
   * Automatic cleanup kapag na-sign out ang account.
   *
   * Tandaan:
   * Ang database offline update ay dapat tawagin muna sa worker logout
   * gamit ang goOffline() bago ang supabase.auth.signOut().
   */
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        clearLocalTrackingState();
        return;
      }

      if (
        event === "SIGNED_IN" &&
        localStorage.getItem(WORKER_ONLINE_STORAGE_KEY) === "true"
      ) {
        /*
         * Ilagay sa susunod na event loop para hindi magsabay ang Supabase
         * auth callback at database verification.
         */
        window.setTimeout(() => {
          void startBrowserTracking();
        }, 0);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [clearLocalTrackingState, startBrowserTracking]);

  /*
   * Provider unmount cleanup.
   * Hindi nito binabago ang database dahil puwedeng route/app teardown lamang.
   */
  useEffect(() => {
    return () => {
      trackingSessionRef.current += 1;

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  const value = useMemo<WorkerLocationContextValue>(
    () => ({
      workerLocation,
      isOnline,
      isTracking,
      locating,
      message,
      goOnline,
      goOffline,
    }),
    [
      workerLocation,
      isOnline,
      isTracking,
      locating,
      message,
      goOnline,
      goOffline,
    ],
  );

  return (
    <WorkerLocationContext.Provider value={value}>
      {children}
    </WorkerLocationContext.Provider>
  );
}

export function useWorkerLocation() {
  const context = useContext(WorkerLocationContext);

  if (!context) {
    throw new Error(
      "useWorkerLocation must be used inside WorkerLocationProvider.",
    );
  }

  return context;
}