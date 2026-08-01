import {
  AlertCircle,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  LoaderCircle,
  MapPinned,
  MessageCircle,
  RefreshCw,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { confirmAction } from "../../../components/ui/confirmAction";
import TodaySchedule from "../../../components/worker/dashboard/TodaySchedule";
import WorkerAnalytics from "../../../components/worker/dashboard/WorkerAnalytics";
import WorkerLocationStatus from "../../../components/worker/dashboard/WorkerLocationStatus";
import WorkerLayout from "../../../layouts/WorkerLayout";
import { supabase } from "../../../lib/supabase";
import {
  acceptBooking,
  getWorkerBookings,
  rejectBooking,
  type WorkerBookingStatus,
} from "../../../services/workerBookingService";

type WorkerBooking = Awaited<ReturnType<typeof getWorkerBookings>>[number];

type DashboardMessage = {
  type: "success" | "error";
  text: string;
} | null;

type QuickAction = {
  title: string;
  description: string;
  path: string;
  icon: typeof Wrench;
  iconClassName: string;
};

type StatisticCard = {
  label: string;
  value: number;
  description: string;
  icon: typeof Clock3;
  valueClassName: string;
  iconClassName: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    title: "My Services",
    description: "Manage your offered services",
    path: "/worker/services",
    icon: Wrench,
    iconClassName:
      "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  },
  {
    title: "Bookings",
    description: "View and manage customer requests",
    path: "/worker/bookings",
    icon: CalendarDays,
    iconClassName:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  {
    title: "Messages",
    description: "Chat with your customers",
    path: "/worker/chat",
    icon: MessageCircle,
    iconClassName:
      "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  },
  {
    title: "Profile",
    description: "Update your worker account",
    path: "/worker/profile",
    icon: UserRound,
    iconClassName:
      "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  },
];

const STATUS_BADGE_CLASSES: Record<WorkerBookingStatus, string> = {
  Pending:
    "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30",
  Approved:
    "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30",
  "On Going":
    "bg-cyan-100 text-cyan-700 ring-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:ring-cyan-500/30",
  "Waiting Customer Confirmation":
    "bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/30",
  Completed:
    "bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/30",
  Cancelled:
    "bg-red-100 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30",
};

const FALLBACK_STATUS_CLASS =
  "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-600";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const message = (error as { message: string }).message.trim();

    if (message) {
      return message;
    }
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
    .map((name) => name.trim())
    .join(" ");

  return fullName || customer.email || "Customer";
}

function getServiceName(booking: WorkerBooking): string {
  const service = booking.service;

  if (!service) {
    return "Service";
  }

  return service.service_name?.trim() || service.category?.trim() || "Service";
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

function getStatusClass(status: string | null | undefined): string {
  return (
    STATUS_BADGE_CLASSES[status as WorkerBookingStatus] ?? FALLBACK_STATUS_CLASS
  );
}

function hasCustomerCoordinates(booking: WorkerBooking): boolean {
  return (
    booking.customer_latitude !== null &&
    booking.customer_latitude !== undefined &&
    booking.customer_longitude !== null &&
    booking.customer_longitude !== undefined
  );
}

function sortBookings(bookings: WorkerBooking[]): WorkerBooking[] {
  return [...bookings].sort((first, second) => {
    const firstTime = new Date(String(first.created_at ?? 0)).getTime();

    const secondTime = new Date(String(second.created_at ?? 0)).getTime();

    return secondTime - firstTime;
  });
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
      options: {
        silent?: boolean;
      } = {},
    ): Promise<void> => {
      const { silent = false } = options;

      if (!silent) {
        setRefreshing(true);
      }

      try {
        const data = await getWorkerBookings(currentWorkerId);

        setBookings(sortBookings(data as WorkerBooking[]));

        setMessage((current) => (current?.type === "error" ? null : current));
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
    let mounted = true;
    let bookingChannel: ReturnType<typeof supabase.channel> | null = null;

    async function initialize(): Promise<void> {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          throw new Error(`Unable to load worker account: ${error.message}`);
        }

        if (!user) {
          throw new Error("Your session has expired. Please sign in again.");
        }

        if (!mounted) {
          return;
        }

        setWorkerId(user.id);

        await loadDashboard(user.id, {
          silent: true,
        });

        if (!mounted) {
          return;
        }

        bookingChannel = supabase
          .channel(`worker-dashboard-${user.id}`)
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
                if (mounted) {
                  void loadDashboard(user.id, {
                    silent: true,
                  });
                }
              }, 300);
            },
          )
          .subscribe();
      } catch (error) {
        if (mounted) {
          setMessage({
            type: "error",
            text: getErrorMessage(error),
          });
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      mounted = false;

      if (realtimeRefreshTimerRef.current) {
        clearTimeout(realtimeRefreshTimerRef.current);
      }

      if (bookingChannel) {
        void supabase.removeChannel(bookingChannel);
      }
    };
  }, [loadDashboard]);

  useEffect(() => {
    if (!message || message.type !== "success") {
      return;
    }

    const timeout = window.setTimeout(() => setMessage(null), 4_000);

    return () => window.clearTimeout(timeout);
  }, [message]);

  const statistics = useMemo(
    () =>
      bookings.reduce(
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
      ),
    [bookings],
  );

  const statisticCards = useMemo<StatisticCard[]>(
    () => [
      {
        label: "Pending",
        value: statistics.pending,
        description: "Waiting for your response",
        icon: Clock3,
        valueClassName: "text-amber-500 dark:text-amber-300",
        iconClassName:
          "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
      },
      {
        label: "Active",
        value: statistics.active,
        description: `${statistics.approved} approved · ${statistics.onGoing} ongoing`,
        icon: BriefcaseBusiness,
        valueClassName: "text-emerald-600 dark:text-emerald-300",
        iconClassName:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
      },
      {
        label: "Completed",
        value: statistics.completed,
        description: "Finished jobs",
        icon: CheckCircle2,
        valueClassName: "text-blue-600 dark:text-blue-300",
        iconClassName:
          "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
      },
      {
        label: "Cancelled",
        value: statistics.cancelled,
        description: "Cancelled requests",
        icon: CircleAlert,
        valueClassName: "text-red-600 dark:text-red-300",
        iconClassName:
          "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
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

      const confirmed = await confirmAction("Accept this booking request?");

      if (!confirmed) {
        return;
      }

      const previousBookings = bookings;

      try {
        setMessage(null);
        setProcessingBookingId(bookingId);

        setBookings((current) =>
          current.map((booking) =>
            booking.id === bookingId
              ? ({
                  ...booking,
                  status: "Approved" as WorkerBookingStatus,
                  schedule_status: "Scheduled",
                  trip_status: "Accepted",
                  completion_status: "Not Started",
                } as WorkerBooking)
              : booking,
          ),
        );

        await acceptBooking(bookingId, workerId);

        setMessage({
          type: "success",
          text: "Booking accepted successfully.",
        });

        void loadDashboard(workerId, {
          silent: true,
        });
      } catch (error) {
        setBookings(previousBookings);

        setMessage({
          type: "error",
          text: getErrorMessage(error),
        });
      } finally {
        setProcessingBookingId(null);
      }
    },
    [bookings, loadDashboard, processingBookingId, workerId],
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

      const previousBookings = bookings;

      try {
        setMessage(null);
        setProcessingBookingId(bookingId);

        setBookings((current) =>
          current.map((booking) =>
            booking.id === bookingId
              ? ({
                  ...booking,
                  status: "Cancelled" as WorkerBookingStatus,
                  schedule_status: "Pending",
                  trip_status: "Cancelled",
                } as WorkerBooking)
              : booking,
          ),
        );

        await rejectBooking(bookingId, workerId);

        setMessage({
          type: "success",
          text: "Booking rejected successfully.",
        });

        void loadDashboard(workerId, {
          silent: true,
        });
      } catch (error) {
        setBookings(previousBookings);

        setMessage({
          type: "error",
          text: getErrorMessage(error),
        });
      } finally {
        setProcessingBookingId(null);
      }
    },
    [bookings, loadDashboard, processingBookingId, workerId],
  );

  return (
    <WorkerLayout>
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 opacity-[0.035] dark:opacity-[0.018]"
          style={{
            backgroundImage:
              "linear-gradient(#2563eb 1px,transparent 1px),linear-gradient(90deg,#2563eb 1px,transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />

        <div className="relative mx-auto w-full max-w-[1600px] space-y-5 px-3 py-4 sm:space-y-7 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
          {message && (
            <div
              role={message.type === "error" ? "alert" : "status"}
              className={`flex items-start justify-between gap-4 rounded-2xl border px-4 py-3.5 text-sm font-semibold shadow-sm sm:px-5 sm:py-4 ${
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
                  : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
              }`}
            >
              <div className="flex min-w-0 items-start gap-2.5">
                {message.type === "error" ? (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                )}

                <span className="min-w-0 leading-6">{message.text}</span>
              </div>

              <button
                type="button"
                onClick={() => setMessage(null)}
                className="shrink-0 rounded-lg p-1.5 transition hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Dismiss message"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <section className="relative overflow-hidden rounded-[1.75rem] bg-linear-to-br from-blue-800 via-blue-700 to-cyan-500 px-5 py-6 text-white shadow-[0_24px_65px_rgba(37,99,235,0.24)] sm:px-7 sm:py-8 lg:px-10 lg:py-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.10]"
              style={{
                backgroundImage:
                  "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
                backgroundSize: "38px 38px",
              }}
            />

            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-cyan-200/15 blur-2xl" />

            <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-blue-50 backdrop-blur">
                  <BriefcaseBusiness className="h-4 w-4" />
                  Worker Portal
                </div>

                <h1
                  className="mt-4 text-2xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  Manage your work with confidence.
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base sm:leading-7">
                  Track bookings, manage services, communicate with customers,
                  and complete every job from one organized dashboard.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="min-w-0 rounded-2xl border border-white/15 bg-white/12 p-4 text-left backdrop-blur-xl sm:min-w-44 sm:p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-100 sm:text-sm">
                    <Clock3 className="h-4 w-4 shrink-0" />
                    Pending Requests
                  </div>

                  <p className="mt-3 text-3xl font-black sm:text-4xl">
                    {loading ? "—" : statistics.pending}
                  </p>

                  <p className="mt-1 text-xs text-blue-100/75">
                    Waiting for your response
                  </p>
                </div>

                <div className="min-w-0 rounded-2xl border border-white/15 bg-white/12 p-4 text-left backdrop-blur-xl sm:min-w-44 sm:p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-100 sm:text-sm">
                    <Wrench className="h-4 w-4 shrink-0" />
                    Active Jobs
                  </div>

                  <p className="mt-3 text-3xl font-black sm:text-4xl">
                    {loading ? "—" : statistics.active}
                  </p>

                  <p className="mt-1 text-xs text-blue-100/75">
                    Approved and ongoing work
                  </p>
                </div>
              </div>
            </div>
          </section>

          <WorkerLocationStatus />

          <section aria-labelledby="quick-actions-heading">
            <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600 dark:text-blue-400">
                  Workspace
                </p>

                <h2
                  id="quick-actions-heading"
                  className="mt-1 text-xl font-black text-slate-950 dark:text-white sm:text-2xl"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  Quick Actions
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Open your most-used worker tools.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={!workerId || refreshing}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 sm:w-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500/50 dark:hover:bg-slate-800"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                {refreshing ? "Refreshing..." : "Refresh dashboard"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;

                return (
                  <button
                    key={action.path}
                    type="button"
                    onClick={() => navigate(action.path)}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_18px_40px_rgba(37,99,235,0.12)] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 sm:p-5 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500/40"
                  >
                    <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-500/5 transition group-hover:scale-125" />

                    <div className="relative">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${action.iconClassName}`}
                      >
                        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>

                      <h3 className="mt-3 text-sm font-black text-slate-950 sm:text-base dark:text-white">
                        {action.title}
                      </h3>

                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 sm:text-sm dark:text-slate-400">
                        {action.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-label="Booking statistics">
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600 dark:text-blue-400">
                Performance overview
              </p>

              <h2
                className="mt-1 text-xl font-black text-slate-950 dark:text-white sm:text-2xl"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Booking Statistics
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              {statisticCards.map((card) => {
                const Icon = card.icon;

                return (
                  <article
                    key={card.label}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:p-5 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 sm:text-sm dark:text-slate-400">
                          {card.label}
                        </p>

                        <h3
                          className={`mt-2 text-3xl font-black sm:text-4xl ${card.valueClassName}`}
                        >
                          {loading ? "—" : card.value}
                        </h3>
                      </div>

                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${card.iconClassName}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>

                    <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-400 sm:text-sm dark:text-slate-500">
                      {card.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-slate-700 dark:bg-slate-800/40">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600 dark:text-blue-400">
                  Recent activity
                </p>

                <h2
                  className="mt-1 text-xl font-black text-slate-950 dark:text-white sm:text-2xl"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  Latest Bookings
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Your five most recent customer requests.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/worker/bookings")}
                className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-blue-100 bg-blue-50 px-4 text-sm font-bold text-blue-700 transition hover:border-blue-200 hover:bg-blue-100 sm:w-auto dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/15"
              >
                View all bookings
              </button>
            </div>

            {loading ? (
              <div
                className="space-y-3 p-4 sm:p-6"
                aria-label="Loading bookings"
              >
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-32 animate-pulse rounded-2xl bg-slate-100 sm:h-20 dark:bg-slate-800"
                  />
                ))}
              </div>
            ) : latestBookings.length === 0 ? (
              <div className="m-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-12 text-center sm:m-6 dark:border-slate-700 dark:bg-slate-800/40">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                  <CalendarDays className="h-7 w-7" />
                </div>

                <p className="mt-4 font-black text-slate-700 dark:text-slate-200">
                  No bookings available
                </p>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  New customer requests will appear here.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3 p-3 sm:p-4 md:hidden">
                  {latestBookings.map((booking) => (
                    <MobileBookingCard
                      key={booking.id}
                      booking={booking}
                      processing={processingBookingId === booking.id}
                      actionsDisabled={processingBookingId !== null}
                      onAccept={() => void handleAccept(booking.id)}
                      onReject={() => void handleReject(booking.id)}
                      onNavigate={() =>
                        navigate(`/worker/navigation/${booking.id}`)
                      }
                    />
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[950px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/85 text-left text-xs font-black uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                        <th className="px-5 py-4">Customer</th>
                        <th className="px-5 py-4">Service</th>
                        <th className="px-5 py-4">Schedule</th>
                        <th className="px-5 py-4">Address</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4">Action</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {latestBookings.map((booking) => (
                        <DesktopBookingRow
                          key={booking.id}
                          booking={booking}
                          processing={processingBookingId === booking.id}
                          actionsDisabled={processingBookingId !== null}
                          onAccept={() => void handleAccept(booking.id)}
                          onReject={() => void handleReject(booking.id)}
                          onNavigate={() =>
                            navigate(`/worker/navigation/${booking.id}`)
                          }
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          {message?.type === "error" && !loading && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center dark:border-red-900/40 dark:bg-red-950/20">
              <p className="font-bold text-red-700 dark:text-red-300">
                Dashboard data could not be refreshed.
              </p>

              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={!workerId || refreshing}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {refreshing && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                Try again
              </button>
            </section>
          )}

          <section>
            <WorkerAnalytics bookings={bookings} />
          </section>

          <section>
            <TodaySchedule bookings={bookings} />
          </section>
        </div>
      </main>
    </WorkerLayout>
  );
}

function MobileBookingCard({
  booking,
  processing,
  actionsDisabled,
  onAccept,
  onReject,
  onNavigate,
}: {
  booking: WorkerBooking;
  processing: boolean;
  actionsDisabled: boolean;
  onAccept: () => void;
  onReject: () => void;
  onNavigate: () => void;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-bold text-slate-900 dark:text-white">
            {getCustomerName(booking)}
          </h3>

          <p className="mt-1 truncate text-sm font-medium text-blue-600 dark:text-blue-300">
            {getServiceName(booking)}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {formatBookingDate(booking.booking_date)} ·{" "}
            {formatBookingTime(booking.booking_time)}
          </p>
        </div>

        <span
          className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${getStatusClass(
            booking.status,
          )}`}
        >
          {booking.status || "Unknown"}
        </span>
      </div>

      <div className="mt-3 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
        <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

        <span className="line-clamp-2">{getBookingAddress(booking)}</span>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
        <BookingActions
          booking={booking}
          processing={processing}
          actionsDisabled={actionsDisabled}
          onAccept={onAccept}
          onReject={onReject}
          onNavigate={onNavigate}
          mobile
        />
      </div>
    </article>
  );
}

function DesktopBookingRow({
  booking,
  processing,
  actionsDisabled,
  onAccept,
  onReject,
  onNavigate,
}: {
  booking: WorkerBooking;
  processing: boolean;
  actionsDisabled: boolean;
  onAccept: () => void;
  onReject: () => void;
  onNavigate: () => void;
}) {
  return (
    <tr className="transition-colors hover:bg-blue-50/45 dark:hover:bg-slate-800/55">
      <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
        {getCustomerName(booking)}
      </td>

      <td className="px-5 py-4">
        <p className="font-semibold text-slate-800 dark:text-slate-200">
          {getServiceName(booking)}
        </p>

        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {booking.service?.category || "Uncategorized"}
        </p>
      </td>

      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
        <p>{formatBookingDate(booking.booking_date)}</p>

        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {formatBookingTime(booking.booking_time)}
        </p>
      </td>

      <td className="max-w-xs px-5 py-4 text-slate-600 dark:text-slate-300">
        <span className="line-clamp-2">{getBookingAddress(booking)}</span>
      </td>

      <td className="px-5 py-4">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClass(
            booking.status,
          )}`}
        >
          {booking.status || "Unknown"}
        </span>
      </td>

      <td className="px-5 py-4">
        <BookingActions
          booking={booking}
          processing={processing}
          actionsDisabled={actionsDisabled}
          onAccept={onAccept}
          onReject={onReject}
          onNavigate={onNavigate}
        />
      </td>
    </tr>
  );
}

function BookingActions({
  booking,
  processing,
  actionsDisabled,
  onAccept,
  onReject,
  onNavigate,
  mobile = false,
}: {
  booking: WorkerBooking;
  processing: boolean;
  actionsDisabled: boolean;
  onAccept: () => void;
  onReject: () => void;
  onNavigate: () => void;
  mobile?: boolean;
}) {
  if (booking.status === "Pending") {
    return (
      <div className={mobile ? "grid grid-cols-2 gap-2" : "flex gap-2"}>
        <button
          type="button"
          onClick={onAccept}
          disabled={actionsDisabled}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
        >
          {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
          Accept
        </button>

        <button
          type="button"
          onClick={onReject}
          disabled={actionsDisabled}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-3.5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-red-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
        >
          {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
          Reject
        </button>
      </div>
    );
  }

  if (
    (booking.status === "Approved" || booking.status === "On Going") &&
    hasCustomerCoordinates(booking)
  ) {
    return (
      <button
        type="button"
        onClick={onNavigate}
        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 md:w-auto"
      >
        <MapPinned className="h-4 w-4" />
        Navigate
      </button>
    );
  }

  return <span className="text-sm text-slate-400">No action available</span>;
}