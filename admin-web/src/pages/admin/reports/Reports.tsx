import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Download,
  PhilippinePeso,
  Printer,
  RefreshCw,
  Star,
  Users,
  XCircle,
  ShieldAlert,
  Repeat2,
  TrendingUp,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from "react";
import { Link } from "react-router-dom";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import AdminLayout from "../../../layouts/AdminLayout";
import {
  getAdvancedAnalytics,
  type AdvancedAnalyticsData,
  type ServiceDemandItem,
  type WorkerPerformanceItem,
} from "../../../services/advancedAnalyticsService";
import { supabase } from "../../../lib/supabase";
import {
  exportReportsCsv,
  getReportsData,
  type BookingStatusChartItem,
  type MonthlyReportItem,
  type RecentBooking,
  type ReportsData,
  type TopWorkerItem,
} from "../../../services/reportService";

const CHART_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#64748B",
];

type DatePreset =
  | "All time"
  | "Today"
  | "Last 7 days"
  | "Last 30 days"
  | "This month"
  | "This year"
  | "Custom";

const EMPTY_ADVANCED_DATA: AdvancedAnalyticsData = {
  totalComplaints: 0,
  activeComplaints: 0,
  complaintRate: 0,
  repeatCustomerRate: 0,
  uniqueCustomers: 0,
  repeatCustomers: 0,
  serviceDemand: [],
  workerPerformance: [],
};

const EMPTY_DATA: ReportsData = {
  summary: {
    workers: 0,
    customers: 0,
    bookings: 0,
    completed: 0,
    cancelled: 0,
    reviews: 0,
    revenue: 0,
    paidTransactions: 0,
    averageBookingValue: 0,
    averageRating: 0,
    completionRate: 0,
    cancellationRate: 0,
  },
  monthly: [],
  bookingStatuses: [],
  recentBookings: [],
  topWorkers: [],
  warnings: [],
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(
  value: string | null | undefined,
): string {
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

function formatGeneratedAt(value: Date): string {
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

function subtractDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

function statusClass(status: string): string {
  const value = status.toLowerCase();

  if (value.includes("complete")) {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
  }

  if (
    value.includes("cancel") ||
    value.includes("reject")
  ) {
    return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";
  }

  if (
    value.includes("approve") ||
    value.includes("accept") ||
    value.includes("ongoing") ||
    value.includes("on going")
  ) {
    return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";
  }

  return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
}

function dateRangeLabel(
  startDate: string,
  endDate: string,
): string {
  if (!startDate && !endDate) {
    return "All available records";
  }

  if (startDate && endDate) {
    return `${formatDate(startDate)} – ${formatDate(endDate)}`;
  }

  if (startDate) {
    return `From ${formatDate(startDate)}`;
  }

  return `Until ${formatDate(endDate)}`;
}

export default function Reports() {
  const [data, setData] =
    useState<ReportsData>(EMPTY_DATA);
  const [advancedData, setAdvancedData] =
    useState<AdvancedAnalyticsData>(EMPTY_ADVANCED_DATA);
  const [preset, setPreset] =
    useState<DatePreset>("All time");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [generatedAt, setGeneratedAt] =
    useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState("");

  const loadReports = useCallback(
    async (background = false) => {
      if (startDate && endDate && startDate > endDate) {
        setError(
          "Start date cannot be later than end date.",
        );
        return;
      }

      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const filters = {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        };

        const [result, advanced] = await Promise.all([
          getReportsData(filters),
          getAdvancedAnalytics(filters),
        ]);

        setData(result);
        setAdvancedData(advanced);
        setGeneratedAt(new Date());

        if (background) {
          toast.success("Reports refreshed.");
        }

        if (result.warnings.length > 0) {
          toast.warning(
            `Reports loaded with ${result.warnings.length} warning${
              result.warnings.length === 1 ? "" : "s"
            }.`,
          );
        }
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : "Unable to load reports.";

        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [startDate, endDate],
  );

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null =
      null;

    const scheduleRefresh = () => {
      if (timer) {
        clearTimeout(timer);
      }

      timer = setTimeout(() => {
        void loadReports(true);
      }, 600);
    };

    const channel = supabase
      .channel("admin-reports-page")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments",
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reviews",
        },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (timer) {
        clearTimeout(timer);
      }

      void supabase.removeChannel(channel);
    };
  }, [loadReports]);

  const hasStatusData = useMemo(
    () =>
      data.bookingStatuses.some(
        (item) => item.value > 0,
      ),
    [data.bookingStatuses],
  );

  function applyPreset(next: DatePreset) {
    const today = new Date();
    const todayValue = toInputDate(today);

    setPreset(next);

    switch (next) {
      case "Today":
        setStartDate(todayValue);
        setEndDate(todayValue);
        break;

      case "Last 7 days":
        setStartDate(
          toInputDate(subtractDays(today, 6)),
        );
        setEndDate(todayValue);
        break;

      case "Last 30 days":
        setStartDate(
          toInputDate(subtractDays(today, 29)),
        );
        setEndDate(todayValue);
        break;

      case "This month":
        setStartDate(toInputDate(startOfMonth(today)));
        setEndDate(todayValue);
        break;

      case "This year":
        setStartDate(toInputDate(startOfYear(today)));
        setEndDate(todayValue);
        break;

      case "All time":
        setStartDate("");
        setEndDate("");
        break;

      case "Custom":
      default:
        break;
    }
  }

  function changeStartDate(value: string) {
    setPreset("Custom");
    setStartDate(value);
  }

  function changeEndDate(value: string) {
    setPreset("Custom");
    setEndDate(value);
  }

  function downloadCsv() {
    try {
      exportReportsCsv(data, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      toast.success("CSV report downloaded.");
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : "Unable to export CSV.",
      );
    }
  }

  const cards: Array<{
    label: string;
    value: string;
    icon: ComponentType<{ className?: string }>;
    href?: string;
    subtitle?: string;
  }> = [
    {
      label: "Workers",
      value: data.summary.workers.toLocaleString(),
      icon: Users,
      href: "/workers",
      subtitle: "Registered worker accounts",
    },
    {
      label: "Customers",
      value: data.summary.customers.toLocaleString(),
      icon: Users,
      href: "/customers",
      subtitle: "Registered customer accounts",
    },
    {
      label: "Bookings",
      value: data.summary.bookings.toLocaleString(),
      icon: CalendarDays,
      href: "/bookings",
      subtitle: "Within selected period",
    },
    {
      label: "Completed",
      value: data.summary.completed.toLocaleString(),
      icon: CheckCircle2,
      href: "/bookings",
      subtitle: `${data.summary.completionRate.toFixed(
        1,
      )}% completion rate`,
    },
    {
      label: "Cancelled",
      value: data.summary.cancelled.toLocaleString(),
      icon: XCircle,
      href: "/bookings",
      subtitle: `${data.summary.cancellationRate.toFixed(
        1,
      )}% cancellation rate`,
    },
    {
      label: "Paid revenue",
      value: formatMoney(data.summary.revenue),
      icon: PhilippinePeso,
      href: "/payments",
      subtitle: `${data.summary.paidTransactions.toLocaleString()} paid transaction${
        data.summary.paidTransactions === 1 ? "" : "s"
      }`,
    },
    {
      label: "Average booking value",
      value: formatMoney(
        data.summary.averageBookingValue,
      ),
      icon: BarChart3,
      href: "/payments",
      subtitle: "Revenue per paid transaction",
    },
    {
      label: "Average rating",
      value:
        data.summary.averageRating > 0
          ? `${data.summary.averageRating.toFixed(
              1,
            )} / 5`
          : "No ratings",
      icon: Star,
      subtitle: `${data.summary.reviews.toLocaleString()} review${
        data.summary.reviews === 1 ? "" : "s"
      }`,
    },
  ];

  const advancedCards: Array<{
    label: string;
    value: string;
    subtitle: string;
    icon: ComponentType<{ className?: string }>;
  }> = [
    {
      label: "Complaint rate",
      value: `${advancedData.complaintRate.toFixed(1)}%`,
      subtitle: `${advancedData.totalComplaints} cases in selected period`,
      icon: ShieldAlert,
    },
    {
      label: "Active complaints",
      value: advancedData.activeComplaints.toLocaleString(),
      subtitle: "Cases still requiring action",
      icon: XCircle,
    },
    {
      label: "Repeat customer rate",
      value: `${advancedData.repeatCustomerRate.toFixed(1)}%`,
      subtitle: `${advancedData.repeatCustomers} of ${advancedData.uniqueCustomers} customers booked again`,
      icon: Repeat2,
    },
    {
      label: "Top performance score",
      value: advancedData.workerPerformance[0]?.performance_score.toFixed(1) ?? "0.0",
      subtitle: advancedData.workerPerformance[0]?.worker_name ?? "No worker activity",
      icon: TrendingUp,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8 print:p-0">
        <header className="hidden print:block">
          <h1 className="text-3xl font-bold">
            LivelihoodGo
          </h1>
          <h2 className="mt-1 text-xl font-semibold">
            Reports & Analytics
          </h2>
          <div className="mt-3 space-y-1 text-sm">
            <p>
              Period:{" "}
              {dateRangeLabel(startDate, endDate)}
            </p>
            <p>
              Generated:{" "}
              {formatGeneratedAt(generatedAt)}
            </p>
          </div>
        </header>

        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between print:hidden">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Reports & Analytics
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Review system activity, booking
              performance, ratings, and paid revenue.
            </p>
            <p className="mt-2 text-xs font-medium text-slate-400">
              Last generated:{" "}
              {formatGeneratedAt(generatedAt)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadCsv}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Printer className="h-4 w-4" />
              Print / PDF
            </button>

            <button
              type="button"
              onClick={() => void loadReports(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>
        </header>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 print:hidden">
          <div className="flex flex-wrap gap-2">
            {(
              [
                "All time",
                "Today",
                "Last 7 days",
                "Last 30 days",
                "This month",
                "This year",
              ] as DatePreset[]
            ).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => applyPreset(option)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  preset === option
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Start date
              </span>
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) =>
                  changeStartDate(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                End date
              </span>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) =>
                  changeEndDate(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700"
              />
            </label>

            <button
              type="button"
              onClick={() => applyPreset("All time")}
              disabled={!startDate && !endDate}
              className="self-end rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
            >
              Clear filter
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Current period:{" "}
            <span className="font-semibold">
              {dateRangeLabel(startDate, endDate)}
            </span>
          </p>
        </section>

        {data.warnings.length > 0 && !error && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            <p className="font-bold">
              Some report sections could not be loaded:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {data.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </section>
        )}

        {error ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/40 dark:bg-red-950/20">
            <p className="font-semibold text-red-700 dark:text-red-300">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void loadReports()}
              className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </section>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map(
                ({
                  label,
                  value,
                  icon: Icon,
                  href,
                  subtitle,
                }) => {
                  const content = (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-500">
                          {label}
                        </p>
                        <Icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
                        {loading ? "…" : value}
                      </p>
                      {subtitle && (
                        <p className="mt-2 text-xs text-slate-500">
                          {subtitle}
                        </p>
                      )}
                    </>
                  );

                  return href ? (
                    <Link
                      key={label}
                      to={href}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                    >
                      {content}
                    </Link>
                  ) : (
                    <article
                      key={label}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                      {content}
                    </article>
                  );
                },
              )}
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <MonthlyPerformanceChart
                data={data.monthly}
                loading={loading}
              />

              <BookingStatusChart
                data={data.bookingStatuses}
                loading={loading}
                hasData={hasStatusData}
              />
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {advancedCards.map(({ label, value, subtitle, icon: Icon }) => (
                <article
                  key={label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-500">{label}</p>
                    <Icon className="h-5 w-5 text-violet-600" />
                  </div>
                  <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
                    {loading ? "…" : value}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
                </article>
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <ServiceDemandTable data={advancedData.serviceDemand} loading={loading} />
              <WorkerPerformanceTable data={advancedData.workerPerformance} loading={loading} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
              <RecentBookingsTable
                bookings={data.recentBookings}
                loading={loading}
              />

              <TopWorkersTable
                workers={data.topWorkers}
                loading={loading}
              />
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function ServiceDemandTable({
  data,
  loading,
}: {
  data: ServiceDemandItem[];
  loading: boolean;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Most requested services</h2>
      <p className="mt-1 text-xs text-slate-500">Ranked by booking demand in the selected period.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr><th className="pb-3">Service</th><th className="pb-3">Bookings</th><th className="pb-3">Completed</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr><td colSpan={3} className="py-8 text-center text-slate-500">Loading service demand…</td></tr>
            ) : data.length ? data.map((item) => (
              <tr key={item.service_id}>
                <td className="py-3"><p className="font-semibold text-slate-800 dark:text-slate-100">{item.service_name}</p><p className="text-xs text-slate-500">{item.category}</p></td>
                <td className="py-3 font-bold">{item.bookings}</td>
                <td className="py-3 text-emerald-600">{item.completed}</td>
              </tr>
            )) : <tr><td colSpan={3} className="py-8 text-center text-slate-500">No service activity found.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function WorkerPerformanceTable({
  data,
  loading,
}: {
  data: WorkerPerformanceItem[];
  loading: boolean;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Worker performance ranking</h2>
      <p className="mt-1 text-xs text-slate-500">Score combines completion, rating, cancellations, and complaints.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-400"><tr><th className="pb-3">Worker</th><th className="pb-3">Score</th><th className="pb-3">Completion</th><th className="pb-3">Complaints</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? <tr><td colSpan={4} className="py-8 text-center text-slate-500">Loading performance…</td></tr> : data.length ? data.map((item) => (
              <tr key={item.worker_id}>
                <td className="py-3"><Link to={`/workers/${item.worker_id}`} className="font-semibold text-blue-600 hover:underline">{item.worker_name}</Link><p className="text-xs text-slate-500">{item.completed_jobs} completed · {item.average_rating.toFixed(1)} rating</p></td>
                <td className="py-3 font-bold text-violet-600">{item.performance_score.toFixed(1)}</td>
                <td className="py-3">{item.completion_rate.toFixed(1)}%</td>
                <td className="py-3">{item.complaint_count}</td>
              </tr>
            )) : <tr><td colSpan={4} className="py-8 text-center text-slate-500">No worker activity found.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MonthlyPerformanceChart({
  data,
  loading,
}: {
  data: MonthlyReportItem[];
  loading: boolean;
}) {
  const hasData = data.some(
    (item) =>
      item.bookings > 0 ||
      item.completed > 0 ||
      item.cancelled > 0 ||
      item.revenue > 0,
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Monthly performance
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Bookings, completions, cancellations,
          and paid revenue.
        </p>
      </div>

      <div className="mt-4 h-80">
        {loading ? (
          <ChartState text="Loading chart..." />
        ) : !hasData ? (
          <ChartState text="No monthly performance data for the selected period." />
        ) : (
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <LineChart
              data={data}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 10,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                minTickGap={18}
              />
              <YAxis
                yAxisId="counts"
                allowDecimals={false}
              />
              <YAxis
                yAxisId="revenue"
                orientation="right"
                tickFormatter={(value) =>
                  `₱${Number(value).toLocaleString()}`
                }
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === "revenue") {
                    return [
                      formatMoney(Number(value)),
                      "Revenue",
                    ];
                  }

                  const labels: Record<string, string> = {
                    bookings: "Bookings",
                    completed: "Completed",
                    cancelled: "Cancelled",
                  };

                  return [
                    Number(value),
                    labels[String(name)] ??
                      String(name),
                  ];
                }}
              />
              <Legend />
              <Line
                yAxisId="counts"
                type="monotone"
                dataKey="bookings"
                name="Bookings"
                stroke="#2563eb"
                strokeWidth={3}
                dot={false}
              />
              <Line
                yAxisId="counts"
                type="monotone"
                dataKey="completed"
                name="Completed"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="counts"
                type="monotone"
                dataKey="cancelled"
                name="Cancelled"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function BookingStatusChart({
  data,
  loading,
  hasData,
}: {
  data: BookingStatusChartItem[];
  loading: boolean;
  hasData: boolean;
}) {
  const total = data.reduce(
    (sum, item) => sum + item.value,
    0,
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Booking status distribution
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Total classified bookings:{" "}
          {total.toLocaleString()}
        </p>
      </div>

      <div className="mt-4 h-80">
        {loading ? (
          <ChartState text="Loading chart..." />
        ) : !hasData ? (
          <ChartState text="No booking status data for the selected period." />
        ) : (
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={105}
                paddingAngle={2}
                label={({ name, value }) =>
                  `${name}: ${value}`
                }
              >
                {data.map((item, index) => (
                  <Cell
                    key={item.name}
                    fill={
                      CHART_COLORS[
                        index % CHART_COLORS.length
                      ]
                    }
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function RecentBookingsTable({
  bookings,
  loading,
}: {
  bookings: RecentBooking[];
  loading: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-700">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Recent bookings
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Latest bookings within the selected period.
          </p>
        </div>

        <Link
          to="/bookings"
          className="text-xs font-bold text-blue-600 hover:underline print:hidden"
        >
          View all
        </Link>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-190 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60">
            <tr>
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Worker</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <TableState
                colSpan={5}
                text="Loading recent bookings..."
              />
            ) : bookings.length === 0 ? (
              <TableState
                colSpan={5}
                text="No bookings found."
              />
            ) : (
              bookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                >
                  <td className="px-4 py-3 font-semibold">
                    <Link
                      to={`/bookings/${booking.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      #{booking.id}
                    </Link>
                  </td>

                  <td className="px-4 py-3">
                    {booking.customer_id ? (
                      <Link
                        to={`/customers/${booking.customer_id}`}
                        className="hover:text-blue-600 hover:underline"
                      >
                        {booking.customer_name}
                      </Link>
                    ) : (
                      booking.customer_name
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {booking.worker_id ? (
                      <Link
                        to={`/workers/${booking.worker_id}`}
                        className="hover:text-blue-600 hover:underline"
                      >
                        {booking.worker_name}
                      </Link>
                    ) : (
                      booking.worker_name
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {formatDate(
                      booking.booking_date ||
                        booking.created_at,
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(
                        booking.status,
                      )}`}
                    >
                      {booking.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TopWorkersTable({
  workers,
  loading,
}: {
  workers: TopWorkerItem[];
  loading: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-700">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Top-rated workers
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Ranked by average rating and review count.
          </p>
        </div>

        <Link
          to="/workers"
          className="text-xs font-bold text-blue-600 hover:underline print:hidden"
        >
          View workers
        </Link>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-130 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Worker</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Reviews</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <TableState
                colSpan={4}
                text="Loading worker ratings..."
              />
            ) : workers.length === 0 ? (
              <TableState
                colSpan={4}
                text="No worker ratings found."
              />
            ) : (
              workers.map((worker, index) => (
                <tr
                  key={worker.worker_id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                >
                  <td className="px-4 py-3 font-bold text-slate-500">
                    #{index + 1}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    <Link
                      to={`/workers/${worker.worker_id}`}
                      className="hover:text-blue-600 hover:underline"
                    >
                      {worker.worker_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    ⭐ {worker.rating.toFixed(1)}
                  </td>
                  <td className="px-4 py-3">
                    {worker.reviews}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ChartState({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function TableState({
  colSpan,
  text,
}: {
  colSpan: number;
  text: string;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="p-8 text-center text-slate-500"
      >
        {text}
      </td>
    </tr>
  );
}