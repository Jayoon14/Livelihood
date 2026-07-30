import {
  Activity,
  CalendarCheck,
  Clock3,
  RefreshCw,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import AdminLayout from "../../../layouts/AdminLayout";
import { useRealtimeTableVersion } from "../../../providers/RealtimeProvider";
import {
  getBookingStatusCounts,
  getDashboardStats,
  getPendingWorkers,
  getRecentActivities,
  getRecentBookings,
  getRecentWorkers,
  type BookingStatusCounts,
  type DashboardActivity,
  type DashboardBooking,
  type DashboardStats,
  type DashboardWorker,
} from "../../../services/dashboardService";

const AUTO_REFRESH_INTERVAL = 60_000;

const EMPTY_STATS: DashboardStats = {
  workers: 0,
  customers: 0,
  pending: 0,
  bookings: 0,
  revenue: 0,
};

const EMPTY_STATUS: BookingStatusCounts = {
  Pending: 0,
  Approved: 0,
  Ongoing: 0,
  Completed: 0,
  Cancelled: 0,
};

function fullName(
  person?:
    | {
        first_name: string | null;
        middle_name?: string | null;
        last_name: string | null;
        suffix?: string | null;
      }
    | null,
): string {
  if (!person) {
    return "Unknown";
  }

  return (
    [
      person.first_name,
      person.middle_name,
      person.last_name,
      person.suffix,
    ]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value))
      .join(" ") || "Unknown"
  );
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function bookingStatusClass(status: string | null | undefined): string {
  switch ((status ?? "").trim().toLowerCase()) {
    case "pending":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
    case "approved":
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";
    case "ongoing":
    case "in progress":
      return "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300";
    case "completed":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
    case "cancelled":
    case "canceled":
      return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
  }
}

function workerStatusClass(status: string | null | undefined): string {
  switch ((status ?? "").trim().toLowerCase()) {
    case "approved":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
    case "pending":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
    case "rejected":
      return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";
    case "suspended":
    case "inactive":
      return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
    default:
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";
  }
}

function activityClass(action: string | null | undefined): string {
  const normalized = (action ?? "").trim().toUpperCase();

  if (normalized.includes("APPROV")) {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
  }

  if (
    normalized.includes("REJECT") ||
    normalized.includes("DELETE") ||
    normalized.includes("CANCEL")
  ) {
    return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";
  }

  if (normalized.includes("LOGIN") || normalized.includes("CREATE")) {
    return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";
  }

  if (normalized.includes("REGISTER") || normalized.includes("UPDATE")) {
    return "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300";
  }

  if (normalized.includes("LOGOUT")) {
    return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
  }

  return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [workers, setWorkers] = useState<DashboardWorker[]>([]);
  const [pendingWorkers, setPendingWorkers] = useState<DashboardWorker[]>([]);
  const [recentBookings, setRecentBookings] = useState<DashboardBooking[]>([]);
  const [activities, setActivities] = useState<DashboardActivity[]>([]);
  const [bookingStatus, setBookingStatus] =
    useState<BookingStatusCounts>(EMPTY_STATUS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const initialLoadCompleted = useRef(false);

  const profilesVersion = useRealtimeTableVersion("profiles");
  const bookingsVersion = useRealtimeTableVersion("bookings");
  const paymentsVersion = useRealtimeTableVersion("payments");
  const activitiesVersion = useRealtimeTableVersion("activity_logs");

  const loadDashboard = useCallback(
    async ({
      showToast = false,
      background = false,
    }: {
      showToast?: boolean;
      background?: boolean;
    } = {}) => {
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const results = await Promise.allSettled([
          getDashboardStats(),
          getRecentWorkers(),
          getPendingWorkers(),
          getRecentBookings(),
          getBookingStatusCounts(),
          getRecentActivities(),
        ]);

        const failed = results.filter(
          (result) => result.status === "rejected",
        );

        if (results[0].status === "fulfilled") {
          setStats(results[0].value);
        }

        if (results[1].status === "fulfilled") {
          setWorkers(results[1].value);
        }

        if (results[2].status === "fulfilled") {
          setPendingWorkers(results[2].value);
        }

        if (results[3].status === "fulfilled") {
          setRecentBookings(results[3].value);
        }

        if (results[4].status === "fulfilled") {
          setBookingStatus(results[4].value);
        }

        if (results[5].status === "fulfilled") {
          setActivities(results[5].value);
        }

        if (failed.length > 0) {
          const message =
            failed.length === results.length
              ? "Unable to load the admin dashboard. Check your connection and Supabase policies."
              : "Some dashboard information could not be loaded.";

          setError(message);

          if (showToast || failed.length === results.length) {
            toast.error(message);
          }
        } else {
          setLastUpdated(new Date());

          if (showToast) {
            toast.success("Dashboard refreshed.");
          }
        }
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : "Unable to load the admin dashboard.";

        setError(message);

        if (showToast || !background) {
          toast.error(message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        initialLoadCompleted.current = true;
      }
    },
    [],
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!initialLoadCompleted.current) {
      return;
    }

    void loadDashboard({ background: true });
  }, [
    activitiesVersion,
    bookingsVersion,
    loadDashboard,
    paymentsVersion,
    profilesVersion,
  ]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadDashboard({ background: true });
    }, AUTO_REFRESH_INTERVAL);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadDashboard]);

  const statusCards = useMemo(
    () =>
      Object.entries(bookingStatus) as [
        keyof BookingStatusCounts,
        number,
      ][],
    [bookingStatus],
  );

  return (
    <AdminLayout>
      <section className="space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Admin Dashboard
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Live overview of users, bookings, payments, and activities.
            </p>

            {lastUpdated && (
              <p className="mt-1 text-xs text-slate-400">
                Last updated: {formatDateTime(lastUpdated.toISOString())}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              void loadDashboard({
                showToast: true,
                background: true,
              })
            }
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw
              size={17}
              className={
                loading || refreshing ? "animate-spin" : ""
              }
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        {error && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
            <span>{error}</span>

            <button
              type="button"
              onClick={() =>
                void loadDashboard({
                  showToast: true,
                  background: true,
                })
              }
              className="font-bold underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            title="Workers"
            value={loading ? "…" : stats.workers.toLocaleString()}
            subtitle="Registered workers"
            path="/workers"
            icon={<Users size={22} />}
          />

          <SummaryCard
            title="Customers"
            value={loading ? "…" : stats.customers.toLocaleString()}
            subtitle="Registered customers"
            path="/customers"
            icon={<UserCheck size={22} />}
          />

          <SummaryCard
            title="Bookings"
            value={loading ? "…" : stats.bookings.toLocaleString()}
            subtitle="Total service bookings"
            path="/bookings"
            icon={<CalendarCheck size={22} />}
          />

          <SummaryCard
            title="Pending Workers"
            value={loading ? "…" : stats.pending.toLocaleString()}
            subtitle="Waiting for approval"
            path="/workers?status=pending"
            icon={<Clock3 size={22} />}
          />

          <SummaryCard
            title="Paid Revenue"
            value={loading ? "…" : formatCurrency(stats.revenue)}
            subtitle="Completed payments"
            path="/payments"
            icon={<Wallet size={22} />}
          />
        </div>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp
              size={20}
              className="text-emerald-600"
            />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Booking Status Overview
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {statusCards.map(([status, count]) => (
              <Link
                key={status}
                to={`/bookings?status=${encodeURIComponent(status)}`}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {status}
                  </p>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${bookingStatusClass(
                      status,
                    )}`}
                  >
                    {status}
                  </span>
                </div>

                <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
                  {loading ? "…" : count.toLocaleString()}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <DashboardTable
          title="Recent Worker Registrations"
          action={
            <Link
              to="/workers"
              className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
            >
              View workers
            </Link>
          }
        >
          <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {workers.length ? (
              workers.map((worker) => (
                <tr
                  key={worker.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                >
                  <td className="p-3 font-medium text-slate-900 dark:text-white">
                    {fullName(worker)}
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    {worker.email || "—"}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${workerStatusClass(
                        worker.status,
                      )}`}
                    >
                      {worker.status || "Unknown"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      to={`/workers/${worker.id}`}
                      className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <EmptyRow
                columns={4}
                text={
                  loading
                    ? "Loading workers…"
                    : "No workers found."
                }
              />
            )}
          </tbody>
        </DashboardTable>

        <DashboardTable
          title="Pending Worker Approvals"
          action={
            <Link
              to="/workers?status=pending"
              className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
            >
              Review pending
            </Link>
          }
        >
          <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pendingWorkers.length ? (
              pendingWorkers.map((worker) => (
                <tr
                  key={worker.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                >
                  <td className="p-3 font-medium text-slate-900 dark:text-white">
                    {fullName(worker)}
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    {worker.email || "—"}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${workerStatusClass(
                        worker.status || "Pending",
                      )}`}
                    >
                      {worker.status || "Pending"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      to={`/workers/${worker.id}`}
                      className="inline-flex rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <EmptyRow
                columns={4}
                text={
                  loading
                    ? "Loading pending workers…"
                    : "No pending workers."
                }
              />
            )}
          </tbody>
        </DashboardTable>

        <DashboardTable
          title="Recent Bookings"
          action={
            <Link
              to="/bookings"
              className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
            >
              View bookings
            </Link>
          }
        >
          <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left">Worker</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentBookings.length ? (
              recentBookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                >
                  <td className="p-3 font-medium text-slate-900 dark:text-white">
                    {fullName(booking.customer)}
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    {fullName(booking.worker)}
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    {formatDate(
                      booking.booking_date || booking.created_at,
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${bookingStatusClass(
                        booking.status,
                      )}`}
                    >
                      {booking.status || "Unknown"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      to={`/bookings/${booking.id}`}
                      className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
                    >
                      View details
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <EmptyRow
                columns={5}
                text={
                  loading
                    ? "Loading bookings…"
                    : "No bookings found."
                }
              />
            )}
          </tbody>
        </DashboardTable>

        <DashboardTable
          title="Recent Activities"
          action={
            <Link
              to="/activity-logs"
              className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
            >
              View activity logs
            </Link>
          }
        >
          <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="p-3 text-left">User</th>
              <th className="p-3 text-left">Module</th>
              <th className="p-3 text-left">Action</th>
              <th className="p-3 text-left">Time</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {activities.length ? (
              activities.map((activity) => {
                const activityLabel =
                  activity.action ||
                  activity.description ||
                  "Unknown";

                return (
                  <tr
                    key={activity.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                  >
                    <td className="p-3 font-medium text-slate-900 dark:text-white">
                      {fullName(activity.user)}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">
                      {activity.module || "—"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${activityClass(
                          activity.action,
                        )}`}
                      >
                        {activityLabel}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">
                      {formatDateTime(activity.created_at)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <EmptyRow
                columns={4}
                text={
                  loading
                    ? "Loading activities…"
                    : "No recent activities."
                }
              />
            )}
          </tbody>
        </DashboardTable>
      </section>
    </AdminLayout>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  path,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  path: string;
  icon: ReactNode;
}) {
  return (
    <Link
      to={path}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          {icon}
        </span>

        <span className="text-xs font-semibold text-slate-400 transition group-hover:text-emerald-600">
          View
        </span>
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
        {title}
      </p>

      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {subtitle}
      </p>
    </Link>
  );
}

function DashboardTable({
  title,
  action,
  children,
}: {
  title: string;
  action: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Activity
            size={19}
            className="text-emerald-600"
          />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {title}
          </h2>
        </div>

        {action}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          {children}
        </table>
      </div>
    </section>
  );
}

function EmptyRow({
  columns,
  text,
}: {
  columns: number;
  text: string;
}) {
  return (
    <tr>
      <td
        colSpan={columns}
        className="p-10 text-center text-slate-500 dark:text-slate-400"
      >
        {text}
      </td>
    </tr>
  );
}