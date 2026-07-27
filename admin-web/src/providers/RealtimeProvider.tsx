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
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";

export type RealtimeTable =
  | "bookings"
  | "chats"
  | "messages"
  | "notifications"
  | "payments"
  | "profiles"
  | "worker_locations";

type RealtimeStatus =
  | "CONNECTING"
  | "SUBSCRIBED"
  | "CHANNEL_ERROR"
  | "TIMED_OUT"
  | "CLOSED";

type RealtimeVersions = Record<RealtimeTable, number>;

type UnknownRow = Record<string, unknown>;

export interface RealtimeChange {
  table: RealtimeTable;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  newRecord: UnknownRow | null;
  oldRecord: UnknownRow | null;
  receivedAt: number;
}

interface RealtimeContextValue {
  status: RealtimeStatus;
  connected: boolean;
  versions: RealtimeVersions;
  lastChange: RealtimeChange | null;
  getVersion: (table: RealtimeTable) => number;
}

interface RealtimeProviderProps {
  children: ReactNode;
}

const INITIAL_VERSIONS: RealtimeVersions = {
  bookings: 0,
  chats: 0,
  messages: 0,
  notifications: 0,
  payments: 0,
  profiles: 0,
  worker_locations: 0,
};

const REALTIME_TABLES: RealtimeTable[] = [
  "bookings",
  "chats",
  "messages",
  "notifications",
  "payments",
  "profiles",
  "worker_locations",
];

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

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
      payload: RealtimePostgresChangesPayload<UnknownRow>,
    ) => {
      if (!isRealtimeEvent(payload.eventType)) {
        return;
      }

      setVersions((currentVersions) => ({
        ...currentVersions,
        [table]: currentVersions[table] + 1,
      }));

      setLastChange({
        table,
        eventType: payload.eventType,
        newRecord:
          payload.eventType === "DELETE"
            ? null
            : (payload.new as UnknownRow),
        oldRecord:
          payload.eventType === "INSERT"
            ? null
            : (payload.old as UnknownRow),
        receivedAt: Date.now(),
      });
    },
    [],
  );

  useEffect(() => {
    let mounted = true;

    const connectRealtime = async () => {
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      if (!mounted) {
        return;
      }

      setStatus("CONNECTING");

      let channel = supabase.channel("livelihood-system-realtime");

      REALTIME_TABLES.forEach((table) => {
        channel = channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
          },
          (payload) => {
            if (!mounted) {
              return;
            }

            processChange(
              table,
              payload as RealtimePostgresChangesPayload<UnknownRow>,
            );
          },
        );
      });

      channelRef.current = channel;

      channel.subscribe((subscriptionStatus) => {
        if (!mounted) {
          return;
        }

        switch (subscriptionStatus) {
          case "SUBSCRIBED":
            setStatus("SUBSCRIBED");
            console.log("Supabase Realtime connected.");
            break;

          case "CHANNEL_ERROR":
            setStatus("CHANNEL_ERROR");
            console.error("Supabase Realtime channel error.");
            break;

          case "TIMED_OUT":
            setStatus("TIMED_OUT");
            console.error("Supabase Realtime connection timed out.");
            break;

          case "CLOSED":
            setStatus("CLOSED");
            break;

          default:
            setStatus("CONNECTING");
            break;
        }
      });
    };

    void connectRealtime();

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

export function useRealtime() {
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
) {
  const { versions } = useRealtime();

  return versions[table];
}