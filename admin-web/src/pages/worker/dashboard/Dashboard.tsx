import { confirmAction } from "../../../components/ui/confirmAction";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import WorkerAnalytics from "../../../components/worker/dashboard/WorkerAnalytics";
import WorkerLocationStatus from "../../../components/worker/dashboard/WorkerLocationStatus";
import TodaySchedule from "../../../components/worker/dashboard/TodaySchedule";
import WorkerLayout from "../../../layouts/WorkerLayout";
import { supabase } from "../../../lib/supabase";
import {
  acceptBooking,
  getWorkerBookings,
  rejectBooking,
} from "../../../services/workerBookingService";
import type { WorkerBookingStatus } from "../../../services/workerBookingService";

type WorkerBooking = Awaited<ReturnType<typeof getWorkerBookings>>[number];

type DashboardMessage = {
  type: "success" | "error";
  text: string;
} | null;

type QuickAction = {
  title: string;
  description: string;
  icon: string;
  path: string;
  iconClassName: string;
};

type StatisticCard = {
  label: string;
  value: number;
  description: string;
  valueClassName: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    title: "My Services",
    description: "Manage your offered services",
    icon: "🛠️",
    path: "/worker/services",
    iconClassName: "bg-blue-100",
  },
  {
    title: "Bookings",
    description: "View customer requests",
    icon: "📅",
    path: "/worker/bookings",
    iconClassName: "bg-green-100",
  },
  {
    title: "Messages",
    description: "Chat with customers",
    icon: "💬",
    path: "/worker/chat",
    iconClassName: "bg-purple-100",
  },
  {
    title: "Profile",
    description: "Update your account",
    icon: "👤",
    path: "/worker/profile",
    iconClassName: "bg-orange-100",
  },
];

const STATUS_BADGE_CLASSES: Record<WorkerBookingStatus, string> = {
  Pending: "bg-amber-100 text-amber-700 ring-amber-200",
  Approved: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  "On Going": "bg-cyan-100 text-cyan-700 ring-cyan-200",
  Completed: "bg-blue-100 text-blue-700 ring-blue-200",
  Cancelled: "bg-red-100 text-red-700 ring-red-200",
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
}

function getCustomerName(booking: WorkerBooking): string {
  const customer = booking.customer;

  if (!customer) {
    return "Customer";
  }

  const fullName = [
    customer.first_name,
    customer.middle_name,
    customer.last_name,
  ]
    .filter(
      (name): name is string =>
        typeof name === "string" && name.trim().length > 0,
    )
    .join(" ");

  return fullName || customer.email || "Customer";
}

function getBookingAddress(booking: WorkerBooking): string {
  const possibleAddress = booking as WorkerBooking & {
    customer_address?: string | null;
    address?: string | null;
  };

  return (
    possibleAddress.customer_address?.trim() ||
    possibleAddress.address?.trim() ||
    "Address not provided"
  );
}

function formatBookingDate(value: string | null | undefined): string {
  if (!value) {
    return "Not set";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatBookingTime(value: string | null | undefined): string {
  if (!value) {
    return "Not set";
  }

  const normalizedTime = value.length === 5 ? `${value}:00` : value;
  const date = new Date(`1970-01-01T${normalizedTime}`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const realtimeRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const [bookings, setBookings] = useState<WorkerBooking[]>([]);
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingBookingId, setProcessingBookingId] = useState<number | null>(
    null,
  );
  const [message, setMessage] = useState<DashboardMessage>(null);

  const loadDashboard = useCallback(
    async (
      currentWorkerId: string,
      options: { silent?: boolean } = {},
    ): Promise<void> => {
      const { silent = false } = options;

      if (!silent) {
        setRefreshing(true);
      }

      try {
        const data = await getWorkerBookings(currentWorkerId);
        setBookings(data);

        setMessage((currentMessage) =>
          currentMessage?.type === "error" ? null : currentMessage,
        );
      } catch (error) {
        setMessage({
          type: "error",
          text: getErrorMessage(error),
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function initializeDashboard(): Promise<void> {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          throw new Error(`Unable to load worker account: ${error.message}`);
        }

        if (!user) {
          if (isMounted) {
            setMessage({
              type: "error",
              text: "Your session has expired. Please sign in again.",
            });
            setLoading(false);
          }

          return;
        }

        if (!isMounted) {
          return;
        }

        setWorkerId(user.id);
        await loadDashboard(user.id, { silent: true });

        if (!isMounted) {
          return;
        }

        channel = supabase
          .channel(`worker-dashboard-bookings-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "bookings",
              filter: `worker_id=eq.${user.id}`,
            },
            () => {
              if (realtimeRefreshTimerRef.current) {
                clearTimeout(realtimeRefreshTimerRef.current);
              }

              realtimeRefreshTimerRef.current = setTimeout(() => {
                void loadDashboard(user.id, { silent: true });
              }, 300);
            },
          )
          .subscribe();
      } catch (error) {
        if (isMounted) {
          setMessage({
            type: "error",
            text: getErrorMessage(error),
          });
          setLoading(false);
        }
      }
    }

    void initializeDashboard();

    return () => {
      isMounted = false;

      if (realtimeRefreshTimerRef.current) {
        clearTimeout(realtimeRefreshTimerRef.current);
        realtimeRefreshTimerRef.current = null;
      }

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [loadDashboard]);

  useEffect(() => {
    if (!message || message.type !== "success") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setMessage(null);
    }, 4_000);

    return () => window.clearTimeout(timeoutId);
  }, [message]);

  const statistics = useMemo(() => {
    return bookings.reduce(
      (counts, booking) => {
        switch (booking.status) {
          case "Pending":
            counts.pending += 1;
            break;
          case "Approved":
            counts.approved += 1;
            counts.active += 1;
            break;
          case "On Going":
            counts.onGoing += 1;
            counts.active += 1;
            break;
          case "Completed":
            counts.completed += 1;
            break;
          case "Cancelled":
            counts.cancelled += 1;
            break;
          default:
            break;
        }

        return counts;
      },
      {
        pending: 0,
        approved: 0,
        onGoing: 0,
        active: 0,
        completed: 0,
        cancelled: 0,
      },
    );
  }, [bookings]);

  const statisticCards = useMemo<StatisticCard[]>(
    () => [
      {
        label: "Pending",
        value: statistics.pending,
        description: "Waiting for your response",
        valueClassName: "text-amber-500",
      },
      {
        label: "Active",
        value: statistics.active,
        description: `${statistics.approved} approved · ${statistics.onGoing} ongoing`,
        valueClassName: "text-emerald-600",
      },
      {
        label: "Completed",
        value: statistics.completed,
        description: "Finished jobs",
        valueClassName: "text-blue-600",
      },
      {
        label: "Cancelled",
        value: statistics.cancelled,
        description: "Cancelled requests",
        valueClassName: "text-red-600",
      },
    ],
    [statistics],
  );

  const latestBookings = useMemo(() => bookings.slice(0, 5), [bookings]);

  const handleRefresh = useCallback(async (): Promise<void> => {
    if (!workerId || refreshing) {
      return;
    }

    await loadDashboard(workerId);
  }, [loadDashboard, refreshing, workerId]);

  const handleAccept = useCallback(
    async (bookingId: number): Promise<void> => {
      if (!workerId || processingBookingId !== null) {
        return;
      }

      try {
        setMessage(null);
        setProcessingBookingId(bookingId);

        await acceptBooking(bookingId, workerId);
        await loadDashboard(workerId, { silent: true });

        setMessage({
          type: "success",
          text: "Booking accepted successfully.",
        });
      } catch (error) {
        setMessage({
          type: "error",
          text: getErrorMessage(error),
        });
      } finally {
        setProcessingBookingId(null);
      }
    },
    [loadDashboard, processingBookingId, workerId],
  );

  const handleReject = useCallback(
    async (bookingId: number): Promise<void> => {
      if (!workerId || processingBookingId !== null) {
        return;
      }

      const confirmed = await confirmAction(
        "Are you sure you want to reject this booking?",
      );

      if (!confirmed) {
        return;
      }

      try {
        setMessage(null);
        setProcessingBookingId(bookingId);

        await rejectBooking(bookingId, workerId);
        await loadDashboard(workerId, { silent: true });

        setMessage({
          type: "success",
          text: "Booking rejected successfully.",
        });
      } catch (error) {
        setMessage({
          type: "error",
          text: getErrorMessage(error),
        });
      } finally {
        setProcessingBookingId(null);
      }
    },
    [loadDashboard, processingBookingId, workerId],
  );

  return (
    <WorkerLayout>
      <main className="space-y-8 p-4 sm:p-6 lg:p-8">
        {message && (
          <div
            role={message.type === "error" ? "alert" : "status"}
            className={`flex items-start justify-between gap-4 rounded-2xl border px-5 py-4 text-sm font-medium shadow-sm ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            <span>{message.text}</span>
            <button
              type="button"
              onClick={() => setMessage(null)}
              className="shrink-0 rounded-lg px-2 py-1 hover:bg-black/5"
              aria-label="Dismiss message"
            >
              ✕
            </button>
          </div>
        )}

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <p className="text-blue-100">Worker Portal</p>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
                Manage Your Work Easily
              </h1>
              <p className="mt-3 max-w-xl text-blue-100">
                Track customer bookings, manage services, communicate with
                clients, and complete your jobs.
              </p>
            </div>

            <div className="min-w-[180px] rounded-3xl bg-white/20 p-6 text-center backdrop-blur-xl">
              <p className="text-blue-100">Pending Requests</p>
              <h2 className="mt-2 text-5xl font-bold">
                {loading ? "—" : statistics.pending}
              </h2>
            </div>
          </div>
        </section>

        <WorkerLocationStatus />

        <section aria-labelledby="quick-actions-heading">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2
              id="quick-actions-heading"
              className="text-xl font-bold text-slate-900"
            >
              Quick Actions
            </h2>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={!workerId || refreshing}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.path}
                type="button"
                onClick={() => navigate(action.path)}
                className="rounded-2xl border bg-white p-6 text-left shadow-md transition-all hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ${action.iconClassName}`}
                  aria-hidden="true"
                >
                  {action.icon}
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  {action.title}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {action.description}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section
          aria-label="Booking statistics"
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4"
        >
          {statisticCards.map((card) => (
            <article
              key={card.label}
              className="rounded-2xl border bg-white p-6 shadow-md transition hover:shadow-xl"
            >
              <p className="text-slate-500">{card.label}</p>
              <h2 className={`mt-3 text-4xl font-bold ${card.valueClassName}`}>
                {loading ? "—" : card.value}
              </h2>
              <p className="mt-2 text-sm text-slate-400">{card.description}</p>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border bg-white p-5 shadow-md sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Latest Bookings
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Your five most recent customer requests.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/worker/bookings")}
              className="font-semibold text-blue-600 hover:text-blue-800"
            >
              View All
            </button>
          </div>

          {loading ? (
            <div className="space-y-3" aria-label="Loading bookings">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-2xl bg-slate-100"
                />
              ))}
            </div>
          ) : latestBookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center">
              <p className="font-semibold text-slate-700">
                No bookings available
              </p>
              <p className="mt-1 text-sm text-slate-500">
                New customer requests will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b text-left text-sm text-slate-500">
                    <th className="p-3 font-semibold">Customer</th>
                    <th className="p-3 font-semibold">Date</th>
                    <th className="p-3 font-semibold">Time</th>
                    <th className="p-3 font-semibold">Address</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {latestBookings.map((booking) => {
                    const isProcessing = processingBookingId === booking.id;
                    const disableActions = processingBookingId !== null;

                    return (
                      <tr
                        key={booking.id}
                        className="border-b transition last:border-b-0 hover:bg-slate-50"
                      >
                        <td className="p-3 font-semibold text-slate-900">
                          {getCustomerName(booking)}
                        </td>
                        <td className="p-3 text-slate-600">
                          {formatBookingDate(booking.booking_date)}
                        </td>
                        <td className="p-3 text-slate-600">
                          {formatBookingTime(booking.booking_time)}
                        </td>
                        <td className="max-w-xs p-3 text-slate-600">
                          <span className="line-clamp-2">
                            {getBookingAddress(booking)}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                              STATUS_BADGE_CLASSES[
                                booking.status as WorkerBookingStatus
                              ]
                            }`}
                          >
                            {booking.status}
                          </span>
                        </td>
                        <td className="p-3">
                          {booking.status === "Pending" ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => void handleAccept(booking.id)}
                                disabled={disableActions}
                                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isProcessing ? "Processing..." : "Accept"}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleReject(booking.id)}
                                disabled={disableActions}
                                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isProcessing ? "Processing..." : "Reject"}
                              </button>
                            </div>
                          ) : (booking.status === "Approved" ||
                              booking.status === "On Going") &&
                            booking.customer_latitude !== null &&
                            booking.customer_latitude !== undefined &&
                            booking.customer_longitude !== null &&
                            booking.customer_longitude !== undefined ? (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/worker/navigation/${booking.id}`)
                              }
                              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                            >
                              Navigate to Customer
                            </button>
                          ) : (
                            <span className="text-sm text-slate-400">
                              No Action
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <WorkerAnalytics />
        </section>

        <section>
          <TodaySchedule bookings={bookings} />
        </section>
      </main>
    </WorkerLayout>
  );
}
