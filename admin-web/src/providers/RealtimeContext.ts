import { createContext, useContext } from "react";

export type RealtimeTable =
  | "activity_logs"
  | "booking_completion_proofs"
  | "bookings"
  | "chats"
  | "messages"
  | "notifications"
  | "payment_transactions"
  | "payments"
  | "profiles"
  | "reviews"
  | "services"
  | "unavailable_dates"
  | "worker_locations"
  | "worker_schedules";

export type RealtimeStatus =
  | "CONNECTING"
  | "SUBSCRIBED"
  | "CHANNEL_ERROR"
  | "TIMED_OUT"
  | "CLOSED";

export type RealtimeVersions = Record<RealtimeTable, number>;
export type UnknownRealtimeRow = Record<string, unknown>;

export interface RealtimeChange {
  table: RealtimeTable;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  newRecord: UnknownRealtimeRow | null;
  oldRecord: UnknownRealtimeRow | null;
  receivedAt: number;
}

export interface RealtimeContextValue {
  status: RealtimeStatus;
  connected: boolean;
  versions: RealtimeVersions;
  lastChange: RealtimeChange | null;
  getVersion: (table: RealtimeTable) => number;
}

export const RealtimeContext =
  createContext<RealtimeContextValue | null>(null);

export function useRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error(
      "useRealtime must be used inside RealtimeProvider.",
    );
  }
  return context;
}

export function useRealtimeTableVersion(
  table: RealtimeTable,
): number {
  return useRealtime().versions[table];
}
