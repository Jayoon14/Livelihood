import { supabase } from "../lib/supabase";

export interface WorkerLocationUpdate {
  worker_id: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  is_online: boolean;
  updated_at: string;
}

function requireWorkerId(workerId: string): string {
  const id = workerId.trim();
  if (!id) throw new Error("Worker ID is required.");
  return id;
}

function validateCoordinate(value: number, name: string, min: number, max: number): number {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`Invalid ${name}.`);
  }
  return value;
}

function normalizeOptional(value?: number | null): number | null {
  if (value == null) return null;
  return Number.isFinite(value) ? value : null;
}

export async function updateWorkerLocation(
  workerId: string,
  latitude: number,
  longitude: number,
  heading?: number | null,
  speed?: number | null,
  accuracy?: number | null,
): Promise<void> {
  const payload: WorkerLocationUpdate = {
    worker_id: requireWorkerId(workerId),
    latitude: validateCoordinate(latitude, "latitude", -90, 90),
    longitude: validateCoordinate(longitude, "longitude", -180, 180),
    heading: normalizeOptional(heading),
    speed: normalizeOptional(speed),
    accuracy: normalizeOptional(accuracy),
    is_online: true,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("workers_locations")
    .upsert(payload, { onConflict: "worker_id" });

  if (error) {
    throw new Error(error.message || "Unable to update worker location.");
  }
}