import {
  createContext,
  useContext,
} from "react";

export interface WorkerLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  updatedAt: string;
}

export interface WorkerLocationContextValue {
  workerLocation: WorkerLocation | null;
  isOnline: boolean;
  isTracking: boolean;
  locating: boolean;
  message: string;
  goOnline: () => Promise<void>;
  goOffline: () => Promise<void>;
}

export const WorkerLocationContext =
  createContext<WorkerLocationContextValue | null>(
    null,
  );

export function useWorkerLocation(): WorkerLocationContextValue {
  const context = useContext(WorkerLocationContext);

  if (!context) {
    throw new Error(
      "useWorkerLocation must be used inside WorkerLocationProvider.",
    );
  }

  return context;
}
