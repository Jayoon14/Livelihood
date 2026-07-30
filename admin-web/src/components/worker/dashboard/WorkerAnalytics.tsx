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
import { BarChart3, PieChartIcon } from "lucide-react";

type BookingStatus =
  | "Pending"
  | "Approved"
  | "Accepted"
  | "Completed"
  | "Cancelled"
  | "Canceled"
  | "Rejected"
  | string;

interface WorkerBooking {
  id: number | string;
  booking_date?: string | null;
  created_at?: string | null;
  status?: BookingStatus | null;
  completion_status?: string | null;
}

interface WorkerAnalyticsProps {
  bookings: WorkerBooking[];
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
};

function normalizeStatus(value?: string | null): string {
  return value?.trim().toLowerCase() ?? "";
}

function getBookingDate(booking: WorkerBooking): Date | null {
  const value = booking.booking_date ?? booking.created_at;

  if (!value) {
    return null;
  }

  const date =
    value.length === 10
      ? new Date(`${value}T00:00:00`)
      : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createWeeklyBookingData(
  bookings: WorkerBooking[],
): WeeklyBookingData[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));

    const dateKey = getLocalDateKey(date);

    const total = bookings.filter((booking) => {
      const bookingDate = getBookingDate(booking);

      if (!bookingDate) {
        return false;
      }

      return getLocalDateKey(bookingDate) === dateKey;
    }).length;

    return {
      date: dateKey,
      day: date.toLocaleDateString("en-PH", {
        weekday: "short",
      }),
      bookings: total,
    };
  });
}

function createStatusData(bookings: WorkerBooking[]): StatusChartData[] {
  let completed = 0;
  let pending = 0;
  let cancelled = 0;
  let approved = 0;

  for (const booking of bookings) {
    const status = normalizeStatus(booking.status);
    const completionStatus = normalizeStatus(booking.completion_status);

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
      status === "confirmed"
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
      name: "Approved",
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
  const title = item.payload?.name ?? label ?? "Bookings";

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
      <p className="text-sm font-semibold text-slate-900">{title}</p>

      <p className="mt-1 text-sm text-slate-600">
        {item.value ?? 0} booking{item.value === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export default function WorkerAnalytics({
  bookings,
}: WorkerAnalyticsProps) {
  const weeklyData = useMemo(
    () => createWeeklyBookingData(bookings),
    [bookings],
  );

  const statusData = useMemo(
    () => createStatusData(bookings),
    [bookings],
  );

  const totalBookings = bookings.length;

  const totalWeeklyBookings = useMemo(
    () =>
      weeklyData.reduce(
        (total, item) => total + item.bookings,
        0,
      ),
    [weeklyData],
  );

  const visibleStatusData = useMemo(
    () => statusData.filter((item) => item.value > 0),
    [statusData],
  );

  return (
    <section className="mt-10 grid grid-cols-1 gap-6 xl:grid-cols-2 xl:gap-8">
      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-lg sm:p-8">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
              Weekly Bookings
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Bookings received during the last seven days
            </p>
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <BarChart3 className="h-6 w-6" />
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Last 7 Days
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {totalWeeklyBookings}
            </p>
          </div>

          <div className="rounded-2xl bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              All Bookings
            </p>

            <p className="mt-2 text-2xl font-bold text-blue-700">
              {totalBookings}
            </p>
          </div>
        </div>

        <div className="h-72 w-full sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
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

              <Tooltip content={<AnalyticsTooltip />} />

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

      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-lg sm:p-8">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
              Booking Status
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Current distribution of your bookings
            </p>
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <PieChartIcon className="h-6 w-6" />
          </div>
        </div>

        {totalBookings === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 px-5 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <PieChartIcon className="h-9 w-9" />
            </div>

            <h3 className="mt-5 text-lg font-bold text-slate-900">
              No Analytics Yet
            </h3>

            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Booking status analytics will appear after you receive your
              first booking.
            </p>
          </div>
        ) : (
          <>
            <div className="relative h-72 w-full sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={visibleStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="52%"
                    outerRadius="78%"
                    paddingAngle={3}
                    stroke="none"
                  >
                    {visibleStatusData.map((item) => (
                      <Cell
                        key={item.name}
                        fill={item.color}
                      />
                    ))}
                  </Pie>

                  <Tooltip content={<AnalyticsTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-slate-900">
                  {totalBookings}
                </span>

                <span className="text-sm text-slate-500">
                  Total bookings
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {statusData.map((item) => (
                <div
                  key={item.name}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor: item.color,
                      }}
                    />

                    <span className="text-xs font-semibold text-slate-600">
                      {item.name}
                    </span>
                  </div>

                  <p className="mt-2 text-xl font-bold text-slate-900">
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