import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";
import {
  RealtimeContext,
  type RealtimeChange,
  type RealtimeContextValue,
  type RealtimeStatus,
  type RealtimeTable,
  type RealtimeVersions,
  type UnknownRealtimeRow,
} from "./RealtimeContext";

interface RealtimeProviderProps {
  children: ReactNode;
}

const INITIAL_VERSIONS: RealtimeVersions = {
  activity_logs: 0,
  booking_completion_proofs: 0,
  bookings: 0,
  chats: 0,
  messages: 0,
  notifications: 0,
  payment_transactions: 0,
  payments: 0,
  profiles: 0,
  reviews: 0,
  services: 0,
  unavailable_dates: 0,
  worker_locations: 0,
  worker_schedules: 0,
};

const REALTIME_TABLES: RealtimeTable[] = [
  "activity_logs",
  "booking_completion_proofs",
  "bookings",
  "chats",
  "messages",
  "notifications",
  "payment_transactions",
  "payments",
  "profiles",
  "reviews",
  "services",
  "unavailable_dates",
  "worker_locations",
  "worker_schedules",
];

function isRealtimeEvent(
  eventType: string,
): eventType is "INSERT" | "UPDATE" | "DELETE" {
  return (
    eventType === "INSERT" ||
    eventType === "UPDATE" ||
    eventType === "DELETE"
  );
}

export function RealtimeProvider({
  children,
}: RealtimeProviderProps) {
  const [status, setStatus] =
    useState<RealtimeStatus>("CONNECTING");
  const [versions, setVersions] =
    useState<RealtimeVersions>(INITIAL_VERSIONS);
  const [lastChange, setLastChange] =
    useState<RealtimeChange | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const processChange = useCallback(
    (
      table: RealtimeTable,
      payload: RealtimePostgresChangesPayload<UnknownRealtimeRow>,
    ) => {
      if (!isRealtimeEvent(payload.eventType)) return;

      setVersions((current) => ({
        ...current,
        [table]: current[table] + 1,
      }));

      setLastChange({
        table,
        eventType: payload.eventType,
        newRecord:
          payload.eventType === "DELETE"
            ? null
            : (payload.new as UnknownRealtimeRow),
        oldRecord:
          payload.eventType === "INSERT"
            ? null
            : (payload.old as UnknownRealtimeRow),
        receivedAt: Date.now(),
      });
    },
    [],
  );

  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      if (!mounted) return;
      setStatus("CONNECTING");

      let channel = supabase.channel(
        "livelihood-system-realtime",
      );

      REALTIME_TABLES.forEach((table) => {
        channel = channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
          },
          (payload) => {
            if (!mounted) return;
            processChange(
              table,
              payload as RealtimePostgresChangesPayload<
                UnknownRealtimeRow
              >,
            );
          },
        );
      });

      channelRef.current = channel;

      channel.subscribe((subscriptionStatus) => {
        if (!mounted) return;

        switch (subscriptionStatus) {
          case "SUBSCRIBED":
            setStatus("SUBSCRIBED");
            break;
          case "CHANNEL_ERROR":
            setStatus("CHANNEL_ERROR");
            break;
          case "TIMED_OUT":
            setStatus("TIMED_OUT");
            break;
          case "CLOSED":
            setStatus("CLOSED");
            break;
          default:
            setStatus("CONNECTING");
        }
      });
    };

    void connect();

    return () => {
      mounted = false;
      const channel = channelRef.current;
      channelRef.current = null;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [processChange]);

  const getVersion = useCallback(
    (table: RealtimeTable) => versions[table],
    [versions],
  );

  const value = useMemo<RealtimeContextValue>(
    () => ({
      status,
      connected: status === "SUBSCRIBED",
      versions,
      lastChange,
      getVersion,
    }),
    [status, versions, lastChange, getVersion],
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}
