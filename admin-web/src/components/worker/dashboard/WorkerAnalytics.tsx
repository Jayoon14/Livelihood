import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  BarChart3,
  PieChartIcon,
} from "lucide-react";

export type BookingStatus =
  | "Pending"
  | "Approved"
  | "Accepted"
  | "On Going"
  | "Waiting Customer Confirmation"
  | "Completed"
  | "Cancelled"
  | "Canceled"
  | "Rejected"
  | string;

export interface WorkerAnalyticsBooking {
  id: number | string;
  booking_date?: string | null;
  created_at?: string | null;
  status?: BookingStatus | null;
  completion_status?: string | null;
}

interface WorkerAnalyticsProps {
  bookings: WorkerAnalyticsBooking[];
}

interface WeeklyBookingData {
  date: string;
  day: string;
  bookings: number;
}

interface StatusChartData {
  name: string;
  value: number;
  color: string;
}

const STATUS_COLORS = {
  completed: "#3B82F6",
  pending: "#FACC15",
  cancelled: "#EF4444",
  approved: "#10B981",
} as const;

function normalizeStatus(
  value?: string | null,
): string {
  return value?.trim().toLowerCase() ?? "";
}

function getBookingDate(
  booking: WorkerAnalyticsBooking,
): Date | null {
  const value =
    booking.booking_date ??
    booking.created_at;

  if (!value) {
    return null;
  }

  const date =
    value.length === 10
      ? new Date(`${value}T00:00:00`)
      : new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(date.getDate()).padStart(
    2,
    "0",
  );

  return `${year}-${month}-${day}`;
}

function createWeeklyBookingData(
  bookings: WorkerAnalyticsBooking[],
): WeeklyBookingData[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalsByDate = new Map<
    string,
    number
  >();

  for (const booking of bookings) {
    const bookingDate =
      getBookingDate(booking);

    if (!bookingDate) {
      continue;
    }

    const dateKey =
      getLocalDateKey(bookingDate);

    totalsByDate.set(
      dateKey,
      (totalsByDate.get(dateKey) ?? 0) + 1,
    );
  }

  return Array.from(
    { length: 7 },
    (_, index) => {
      const date = new Date(today);
      date.setDate(
        today.getDate() - (6 - index),
      );

      const dateKey = getLocalDateKey(date);

      return {
        date: dateKey,
        day: date.toLocaleDateString(
          "en-PH",
          {
            weekday: "short",
          },
        ),
        bookings:
          totalsByDate.get(dateKey) ?? 0,
      };
    },
  );
}

function createStatusData(
  bookings: WorkerAnalyticsBooking[],
): StatusChartData[] {
  let completed = 0;
  let pending = 0;
  let cancelled = 0;
  let approved = 0;

  for (const booking of bookings) {
    const status = normalizeStatus(
      booking.status,
    );
    const completionStatus =
      normalizeStatus(
        booking.completion_status,
      );

    if (
      status === "completed" ||
      completionStatus === "completed"
    ) {
      completed += 1;
      continue;
    }

    if (
      status === "cancelled" ||
      status === "canceled" ||
      status === "rejected"
    ) {
      cancelled += 1;
      continue;
    }

    if (
      status === "approved" ||
      status === "accepted" ||
      status === "confirmed" ||
      status === "on going" ||
      status ===
        "waiting customer confirmation"
    ) {
      approved += 1;
      continue;
    }

    pending += 1;
  }

  return [
    {
      name: "Completed",
      value: completed,
      color: STATUS_COLORS.completed,
    },
    {
      name: "Approved / Active",
      value: approved,
      color: STATUS_COLORS.approved,
    },
    {
      name: "Pending",
      value: pending,
      color: STATUS_COLORS.pending,
    },
    {
      name: "Cancelled",
      value: cancelled,
      color: STATUS_COLORS.cancelled,
    },
  ];
}

function AnalyticsTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    value?: number;
    name?: string;
    payload?: {
      name?: string;
    };
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0];
  const title =
    item.payload?.name ??
    label ??
    "Bookings";
  const value = item.value ?? 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">
        {title}
      </p>

      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        {value} booking
        {value === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export default function WorkerAnalytics({
  bookings,
}: WorkerAnalyticsProps) {
  const safeBookings = useMemo(
    () => (Array.isArray(bookings) ? bookings : []),
    [bookings],
  );

  const weeklyData = useMemo(
    () =>
      createWeeklyBookingData(
        safeBookings,
      ),
    [safeBookings],
  );

  const statusData = useMemo(
    () =>
      createStatusData(safeBookings),
    [safeBookings],
  );

  const totalBookings =
    safeBookings.length;

  const totalWeeklyBookings =
    useMemo(
      () =>
        weeklyData.reduce(
          (total, item) =>
            total + item.bookings,
          0,
        ),
      [weeklyData],
    );

  const visibleStatusData =
    useMemo(
      () =>
        statusData.filter(
          (item) => item.value > 0,
        ),
      [statusData],
    );

  return (
    <section className="mt-8 grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2 xl:gap-6">
      <article className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-lg dark:border-slate-700 dark:bg-slate-900 sm:p-6 lg:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
              Weekly Bookings
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Bookings received during the last
              seven days
            </p>
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300 sm:h-12 sm:w-12">
            <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800 sm:p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">
              Last 7 Days
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              {totalWeeklyBookings}
            </p>
          </div>

          <div className="rounded-2xl bg-blue-50 p-3 dark:bg-blue-500/10 sm:p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300 sm:text-xs">
              All Bookings
            </p>

            <p className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-300">
              {totalBookings}
            </p>
          </div>
        </div>

        <div className="h-64 min-w-0 w-full sm:h-72 lg:h-80">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <LineChart
              data={weeklyData}
              margin={{
                top: 10,
                right: 12,
                left: -20,
                bottom: 0,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#E2E8F0"
              />

              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "#64748B",
                  fontSize: 12,
                }}
              />

              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "#64748B",
                  fontSize: 12,
                }}
              />

              <Tooltip
                content={
                  <AnalyticsTooltip />
                }
              />

              <Line
                type="monotone"
                dataKey="bookings"
                name="Bookings"
                stroke="#2563EB"
                strokeWidth={3}
                dot={{
                  r: 4,
                  fill: "#2563EB",
                  strokeWidth: 2,
                  stroke: "#FFFFFF",
                }}
                activeDot={{
                  r: 6,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-lg dark:border-slate-700 dark:bg-slate-900 sm:p-6 lg:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
              Booking Status
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Current distribution of your
              bookings
            </p>
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300 sm:h-12 sm:w-12">
            <PieChartIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        </div>

        {totalBookings === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 px-5 text-center dark:border-slate-700">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <PieChartIcon className="h-9 w-9" />
            </div>

            <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
              No Analytics Yet
            </h3>

            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
              Booking analytics will appear
              after you receive your first
              booking.
            </p>
          </div>
        ) : (
          <>
            <div className="relative h-64 min-w-0 w-full sm:h-72 lg:h-80">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>
                  <Pie
                    data={
                      visibleStatusData
                    }
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="52%"
                    outerRadius="78%"
                    paddingAngle={3}
                    stroke="none"
                  >
                    {visibleStatusData.map(
                      (item) => (
                        <Cell
                          key={item.name}
                          fill={item.color}
                        />
                      ),
                    )}
                  </Pie>

                  <Tooltip
                    content={
                      <AnalyticsTooltip />
                    }
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">
                  {totalBookings}
                </span>

                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Total bookings
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {statusData.map((item) => (
                <div
                  key={item.name}
                  className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-700 dark:bg-slate-800/70"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          item.color,
                      }}
                    />

                    <span className="truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {item.name}
                    </span>
                  </div>

                  <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </article>
    </section>
  );
}
