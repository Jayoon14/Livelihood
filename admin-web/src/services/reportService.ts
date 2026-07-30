import { supabase } from "../lib/supabase";

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
}

export interface ReportSummary {
  workers: number;
  customers: number;
  bookings: number;
  completed: number;
  cancelled: number;
  reviews: number;
  revenue: number;
  paidTransactions: number;
  averageBookingValue: number;
  averageRating: number;
  completionRate: number;
  cancellationRate: number;
}

export interface MonthlyReportItem {
  key: string;
  month: string;
  bookings: number;
  completed: number;
  cancelled: number;
  revenue: number;
}

export interface BookingStatusChartItem {
  name: string;
  value: number;
}

export interface RecentBooking {
  id: number;
  status: string;
  booking_date: string | null;
  created_at: string | null;
  customer_id: string | null;
  worker_id: string | null;
  customer_name: string;
  worker_name: string;
}

export interface TopWorkerItem {
  worker_id: string;
  worker_name: string;
  rating: number;
  reviews: number;
}

export interface ReportsData {
  summary: ReportSummary;
  monthly: MonthlyReportItem[];
  bookingStatuses: BookingStatusChartItem[];
  recentBookings: RecentBooking[];
  topWorkers: TopWorkerItem[];
  warnings: string[];
}

interface ReportProfile {
  id?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  suffix?: string | null;
  email?: string | null;
}

interface BookingRow {
  id: number;
  customer_id?: string | null;
  worker_id?: string | null;
  status: string | null;
  schedule_status?: string | null;
  trip_status?: string | null;
  completion_status?: string | null;
  booking_date: string | null;
  created_at: string | null;
  customer?: ReportProfile | ReportProfile[] | null;
  worker?: ReportProfile | ReportProfile[] | null;
}

interface ReviewRow {
  rating: number | string | null;
  created_at?: string | null;
  worker_id?: string | null;
  worker?: ReportProfile | ReportProfile[] | null;
}

interface PaymentRow {
  amount: number | string | null;
  created_at: string | null;
}

type DateFilterableQuery = {
  gte(column: string, value: string): DateFilterableQuery;
  lte(column: string, value: string): DateFilterableQuery;
};

function wrapError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error && error.message.trim()) {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return new Error((error as { message: string }).message);
  }

  return new Error(fallbackMessage);
}

function normalizeProfile(
  value: ReportProfile | ReportProfile[] | null | undefined,
): ReportProfile | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function profileName(
  value: ReportProfile | ReportProfile[] | null | undefined,
  fallback: string,
): string {
  const profile = normalizeProfile(value);

  if (!profile) {
    return fallback;
  }

  const name = [
    profile.first_name,
    profile.middle_name,
    profile.last_name,
    profile.suffix,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ");

  return name || profile.email?.trim() || fallback;
}

function toAmount(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function validateDate(value: string | undefined, label: string): string | undefined {
  const normalized = value?.trim() || undefined;

  if (!normalized) {
    return undefined;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`${label} must use YYYY-MM-DD format.`);
  }

  const date = new Date(`${normalized}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} is invalid.`);
  }

  return normalized;
}

function validateFilters(filters: ReportFilters): ReportFilters {
  const startDate = validateDate(filters.startDate, "Start date");
  const endDate = validateDate(filters.endDate, "End date");

  if (startDate && endDate && startDate > endDate) {
    throw new Error("Start date cannot be later than end date.");
  }

  return { startDate, endDate };
}

function startTimestamp(date: string): string {
  return `${date}T00:00:00.000Z`;
}

function endTimestamp(date: string): string {
  return `${date}T23:59:59.999Z`;
}

function applyCreatedAtFilter<T extends DateFilterableQuery>(
  query: T,
  filters: ReportFilters,
): T {
  let filtered = query;

  if (filters.startDate) {
    filtered = filtered.gte(
      "created_at",
      startTimestamp(filters.startDate),
    ) as T;
  }

  if (filters.endDate) {
    filtered = filtered.lte(
      "created_at",
      endTimestamp(filters.endDate),
    ) as T;
  }

  return filtered;
}

function normalizeStatus(value: string | null | undefined): string {
  const status = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!status) {
    return "Unknown";
  }

  if (
    status === "complete" ||
    status === "completed" ||
    status === "job completed" ||
    status === "finished"
  ) {
    return "Completed";
  }

  if (
    status === "cancel" ||
    status === "cancelled" ||
    status === "canceled"
  ) {
    return "Cancelled";
  }

  if (
    status === "reject" ||
    status === "rejected" ||
    status === "declined"
  ) {
    return "Rejected";
  }

  if (
    status === "approve" ||
    status === "approved" ||
    status === "accepted"
  ) {
    return "Approved";
  }

  if (
    status === "ongoing" ||
    status === "on going" ||
    status === "in progress" ||
    status === "started"
  ) {
    return "On Going";
  }

  if (
    status === "pending" ||
    status === "for approval" ||
    status === "requested"
  ) {
    return "Pending";
  }

  return status
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function bookingDisplayStatus(booking: BookingRow): string {
  const completion = normalizeStatus(booking.completion_status);

  if (completion === "Completed") {
    return completion;
  }

  const primary = normalizeStatus(booking.status);

  if (primary !== "Unknown") {
    return primary;
  }

  const trip = normalizeStatus(booking.trip_status);

  if (trip !== "Unknown") {
    return trip;
  }

  return normalizeStatus(booking.schedule_status);
}

function monthKey(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1, 1);

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    year: "2-digit",
  }).format(date);
}

function incrementMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function createMonthKeys(
  filters: ReportFilters,
  bookingRows: BookingRow[],
  paymentRows: PaymentRow[],
): string[] {
  let start: Date;
  let end: Date;

  if (filters.startDate) {
    start = new Date(`${filters.startDate}T00:00:00`);
  } else {
    const dates = [
      ...bookingRows.map((row) => row.created_at),
      ...paymentRows.map((row) => row.created_at),
    ]
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()));

    const latest =
      dates.length > 0
        ? new Date(Math.max(...dates.map((date) => date.getTime())))
        : new Date();

    start = new Date(latest.getFullYear(), latest.getMonth() - 11, 1);
  }

  if (filters.endDate) {
    end = new Date(`${filters.endDate}T00:00:00`);
  } else {
    end = new Date();
  }

  start = new Date(start.getFullYear(), start.getMonth(), 1);
  end = new Date(end.getFullYear(), end.getMonth(), 1);

  const keys: string[] = [];
  let current = start;
  let guard = 0;

  while (current <= end && guard < 120) {
    keys.push(
      `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(
        2,
        "0",
      )}`,
    );
    current = incrementMonth(current);
    guard += 1;
  }

  return keys;
}

async function countProfiles(role: "worker" | "customer"): Promise<number> {
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .ilike("role", role);

  if (error) {
    throw wrapError(error, `Unable to count ${role} profiles.`);
  }

  return count ?? 0;
}

async function getFilteredBookingRows(
  filters: ReportFilters,
): Promise<BookingRow[]> {
  let query = supabase
    .from("bookings")
    .select(
      `
        id,
        customer_id,
        worker_id,
        status,
        schedule_status,
        trip_status,
        completion_status,
        booking_date,
        created_at,
        customer:profiles!customer_id(
          id,
          first_name,
          middle_name,
          last_name,
          suffix,
          email
        ),
        worker:profiles!worker_id(
          id,
          first_name,
          middle_name,
          last_name,
          suffix,
          email
        )
      `,
    )
    .order("created_at", { ascending: false });

  query = applyCreatedAtFilter(query, filters);

  const { data, error } = await query;

  if (error) {
    throw wrapError(error, "Unable to load booking report data.");
  }

  return (data ?? []) as unknown as BookingRow[];
}

async function getFilteredReviews(
  filters: ReportFilters,
): Promise<ReviewRow[]> {
  let query = supabase
    .from("reviews")
    .select(
      `
        rating,
        created_at,
        worker_id,
        worker:profiles!worker_id(
          id,
          first_name,
          middle_name,
          last_name,
          suffix,
          email
        )
      `,
    );

  query = applyCreatedAtFilter(query, filters);

  const { data, error } = await query;

  if (error) {
    throw wrapError(error, "Unable to load review report data.");
  }

  return (data ?? []) as unknown as ReviewRow[];
}

async function getFilteredPaidPayments(
  filters: ReportFilters,
): Promise<PaymentRow[]> {
  let query = supabase
    .from("payments")
    .select("amount,created_at")
    .ilike("payment_status", "Paid");

  query = applyCreatedAtFilter(query, filters);

  const { data, error } = await query;

  if (error) {
    throw wrapError(error, "Unable to load paid revenue data.");
  }

  return (data ?? []) as PaymentRow[];
}

export async function getReportsData(
  rawFilters: ReportFilters = {},
): Promise<ReportsData> {
  const filters = validateFilters(rawFilters);

  const [
    workersResult,
    customersResult,
    bookingsResult,
    reviewsResult,
    paymentsResult,
  ] = await Promise.allSettled([
    countProfiles("worker"),
    countProfiles("customer"),
    getFilteredBookingRows(filters),
    getFilteredReviews(filters),
    getFilteredPaidPayments(filters),
  ]);

  const warnings: string[] = [];

  const workers =
    workersResult.status === "fulfilled"
      ? workersResult.value
      : (warnings.push(
          wrapError(
            workersResult.reason,
            "Unable to count workers.",
          ).message,
        ),
        0);

  const customers =
    customersResult.status === "fulfilled"
      ? customersResult.value
      : (warnings.push(
          wrapError(
            customersResult.reason,
            "Unable to count customers.",
          ).message,
        ),
        0);

  const bookings =
    bookingsResult.status === "fulfilled"
      ? bookingsResult.value
      : (warnings.push(
          wrapError(
            bookingsResult.reason,
            "Unable to load bookings.",
          ).message,
        ),
        []);

  const reviews =
    reviewsResult.status === "fulfilled"
      ? reviewsResult.value
      : (warnings.push(
          wrapError(
            reviewsResult.reason,
            "Unable to load reviews.",
          ).message,
        ),
        []);

  const payments =
    paymentsResult.status === "fulfilled"
      ? paymentsResult.value
      : (warnings.push(
          wrapError(
            paymentsResult.reason,
            "Unable to load paid payments.",
          ).message,
        ),
        []);

  if (warnings.length === 5) {
    throw new Error(warnings[0] ?? "Unable to load reports.");
  }

  const statusCounts = new Map<string, number>();

  for (const booking of bookings) {
    const status = bookingDisplayStatus(booking);
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
  }

  const preferredOrder = [
    "Pending",
    "Approved",
    "On Going",
    "Completed",
    "Cancelled",
    "Rejected",
    "Unknown",
  ];

  const bookingStatuses = [...statusCounts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((first, second) => {
      const firstIndex = preferredOrder.indexOf(first.name);
      const secondIndex = preferredOrder.indexOf(second.name);

      return (
        (firstIndex === -1 ? preferredOrder.length : firstIndex) -
        (secondIndex === -1 ? preferredOrder.length : secondIndex)
      );
    });

  const monthlyMap = new Map<string, MonthlyReportItem>();

  for (const key of createMonthKeys(filters, bookings, payments)) {
    monthlyMap.set(key, {
      key,
      month: monthLabel(key),
      bookings: 0,
      completed: 0,
      cancelled: 0,
      revenue: 0,
    });
  }

  for (const booking of bookings) {
    const key = monthKey(booking.created_at);

    if (!key || !monthlyMap.has(key)) {
      continue;
    }

    const item = monthlyMap.get(key);

    if (!item) {
      continue;
    }

    item.bookings += 1;

    const status = bookingDisplayStatus(booking);

    if (status === "Completed") {
      item.completed += 1;
    }

    if (status === "Cancelled") {
      item.cancelled += 1;
    }
  }

  for (const payment of payments) {
    const key = monthKey(payment.created_at);

    if (!key || !monthlyMap.has(key)) {
      continue;
    }

    const item = monthlyMap.get(key);

    if (item) {
      item.revenue += toAmount(payment.amount);
    }
  }

  const recentBookings: RecentBooking[] = bookings
    .slice(0, 10)
    .map((booking) => ({
      id: Number(booking.id),
      status: bookingDisplayStatus(booking),
      booking_date: booking.booking_date,
      created_at: booking.created_at,
      customer_id: booking.customer_id ?? null,
      worker_id: booking.worker_id ?? null,
      customer_name: profileName(
        booking.customer,
        "Unknown customer",
      ),
      worker_name: profileName(
        booking.worker,
        "Unknown worker",
      ),
    }));

  const workerRatings = new Map<
    string,
    {
      worker_name: string;
      total: number;
      reviews: number;
    }
  >();

  let validRatingTotal = 0;
  let validRatingCount = 0;

  for (const review of reviews) {
    const worker = normalizeProfile(review.worker);
    const workerId =
      worker?.id?.trim() || review.worker_id?.trim();

    if (!workerId) {
      continue;
    }

    const rating = toAmount(review.rating);

    if (rating <= 0) {
      continue;
    }

    validRatingTotal += rating;
    validRatingCount += 1;

    const current = workerRatings.get(workerId) ?? {
      worker_name: profileName(worker, "Unknown worker"),
      total: 0,
      reviews: 0,
    };

    current.total += rating;
    current.reviews += 1;
    workerRatings.set(workerId, current);
  }

  const topWorkers: TopWorkerItem[] = [...workerRatings.entries()]
    .map(([worker_id, item]) => ({
      worker_id,
      worker_name: item.worker_name,
      rating:
        item.reviews > 0
          ? round(item.total / item.reviews, 2)
          : 0,
      reviews: item.reviews,
    }))
    .sort(
      (first, second) =>
        second.rating - first.rating ||
        second.reviews - first.reviews ||
        first.worker_name.localeCompare(second.worker_name),
    )
    .slice(0, 10);

  const completed = bookings.filter(
    (booking) => bookingDisplayStatus(booking) === "Completed",
  ).length;

  const cancelled = bookings.filter(
    (booking) => bookingDisplayStatus(booking) === "Cancelled",
  ).length;

  const revenue = round(
    payments.reduce(
      (total, payment) => total + toAmount(payment.amount),
      0,
    ),
  );

  const bookingCount = bookings.length;
  const paidTransactions = payments.length;

  return {
    summary: {
      workers,
      customers,
      bookings: bookingCount,
      completed,
      cancelled,
      reviews: reviews.length,
      revenue,
      paidTransactions,
      averageBookingValue:
        paidTransactions > 0
          ? round(revenue / paidTransactions)
          : 0,
      averageRating:
        validRatingCount > 0
          ? round(validRatingTotal / validRatingCount, 2)
          : 0,
      completionRate:
        bookingCount > 0
          ? round((completed / bookingCount) * 100, 1)
          : 0,
      cancellationRate:
        bookingCount > 0
          ? round((cancelled / bookingCount) * 100, 1)
          : 0,
    },
    monthly: [...monthlyMap.values()],
    bookingStatuses,
    recentBookings,
    topWorkers,
    warnings,
  };
}

function csvCell(value: unknown): string {
  const text = String(value ?? "");

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function section(title: string, rows: unknown[][]): string[] {
  return [
    title,
    ...rows.map((row) => row.map(csvCell).join(",")),
    "",
  ];
}

export function exportReportsCsv(
  data: ReportsData,
  filters: ReportFilters = {},
): void {
  const lines = [
    ...section("REPORT INFORMATION", [
      ["Start date", filters.startDate ?? "All"],
      ["End date", filters.endDate ?? "All"],
      ["Generated at", new Date().toISOString()],
    ]),
    ...section("SUMMARY", [
      ["Metric", "Value"],
      ["Workers", data.summary.workers],
      ["Customers", data.summary.customers],
      ["Bookings", data.summary.bookings],
      ["Completed", data.summary.completed],
      ["Cancelled", data.summary.cancelled],
      ["Completion rate", `${data.summary.completionRate}%`],
      ["Cancellation rate", `${data.summary.cancellationRate}%`],
      ["Reviews", data.summary.reviews],
      ["Average rating", data.summary.averageRating],
      ["Paid transactions", data.summary.paidTransactions],
      ["Paid revenue", data.summary.revenue],
      ["Average booking value", data.summary.averageBookingValue],
    ]),
    ...section("MONTHLY PERFORMANCE", [
      [
        "Period",
        "Bookings",
        "Completed",
        "Cancelled",
        "Revenue",
      ],
      ...data.monthly.map((item) => [
        item.month,
        item.bookings,
        item.completed,
        item.cancelled,
        item.revenue,
      ]),
    ]),
    ...section("BOOKING STATUS", [
      ["Status", "Count"],
      ...data.bookingStatuses.map((item) => [
        item.name,
        item.value,
      ]),
    ]),
    ...section("TOP WORKERS", [
      ["Worker ID", "Worker", "Average rating", "Reviews"],
      ...data.topWorkers.map((worker) => [
        worker.worker_id,
        worker.worker_name,
        worker.rating.toFixed(2),
        worker.reviews,
      ]),
    ]),
    ...section("RECENT BOOKINGS", [
      [
        "Booking ID",
        "Customer",
        "Worker",
        "Date",
        "Status",
      ],
      ...data.recentBookings.map((booking) => [
        booking.id,
        booking.customer_name,
        booking.worker_name,
        booking.booking_date ?? booking.created_at ?? "",
        booking.status,
      ]),
    ]),
    ...(data.warnings.length > 0
      ? section("WARNINGS", data.warnings.map((warning) => [warning]))
      : []),
  ];

  const blob = new Blob(["\uFEFF", lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  anchor.href = url;
  anchor.download = `livelihood-reports-${date}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}