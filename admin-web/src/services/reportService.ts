import { supabase } from "../lib/supabase";

export const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export interface ReportSummary {
  workers: number;
  customers: number;
  bookings: number;
  completed: number;
}

export interface DashboardStats {
  workers: number;
  customers: number;
  bookings: number;
  reviews: number;
}

export interface MonthlyChartData {
  labels: string[];
  data: number[];
}

export interface BookingStatusRecord {
  status: string;
}

export interface ReportProfile {
  id?: string;
  first_name: string | null;
  last_name: string | null;
}

export interface TopWorkerReview {
  rating: number;
  worker: ReportProfile | null;
}

export interface RecentBooking {
  id: number;
  customer_id: string;
  worker_id: string;
  booking_date?: string | null;
  booking_time?: string | null;
  status: string;
  created_at: string;
  customer: ReportProfile | null;
  worker: ReportProfile | null;
  [key: string]: unknown;
}

interface CreatedAtRecord {
  created_at: string;
}

interface PaymentRevenueRecord {
  amount: number | string | null;
  created_at: string;
}

type CountTable = "profiles" | "bookings" | "reviews";

interface CountFilter {
  column: string;
  value: string | number | boolean;
}

function wrapError(error: unknown, fallbackMessage: string): Error {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return new Error(error.message);
  }

  return new Error(fallbackMessage);
}

function normalizeRelatedProfile(
  profile: ReportProfile | ReportProfile[] | null | undefined,
): ReportProfile | null {
  if (Array.isArray(profile)) {
    return profile[0] ?? null;
  }

  return profile ?? null;
}

function getMonthIndex(value: string): number | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const month = date.getMonth();

  return month >= 0 && month <= 11 ? month : null;
}

function createEmptyMonthlyData(): number[] {
  return Array.from({ length: MONTH_LABELS.length }, () => 0);
}

function aggregateMonthlyCount(records: CreatedAtRecord[]): number[] {
  const totals = createEmptyMonthlyData();

  for (const record of records) {
    const month = getMonthIndex(record.created_at);

    if (month !== null) {
      totals[month] += 1;
    }
  }

  return totals;
}

function aggregateMonthlyRevenue(records: PaymentRevenueRecord[]): number[] {
  const totals = createEmptyMonthlyData();

  for (const record of records) {
    const month = getMonthIndex(record.created_at);

    if (month === null) {
      continue;
    }

    const amount = Number(record.amount);

    if (Number.isFinite(amount)) {
      totals[month] += amount;
    }
  }

  return totals;
}

async function countRows(
  table: CountTable,
  filter?: CountFilter,
): Promise<number> {
  let query = supabase.from(table).select("*", { count: "exact", head: true });

  if (filter) {
    query = query.eq(filter.column, filter.value);
  }

  const { count, error } = await query;

  if (error) {
    throw wrapError(error, `Unable to count records from ${table}.`);
  }

  return count ?? 0;
}

// =========================
// REPORT SUMMARY
// =========================

export async function getReportSummary(): Promise<ReportSummary> {
  const [workers, customers, bookings, completed] = await Promise.all([
    countRows("profiles", {
      column: "role",
      value: "worker",
    }),
    countRows("profiles", {
      column: "role",
      value: "customer",
    }),
    countRows("bookings"),
    countRows("bookings", {
      column: "status",
      value: "Completed",
    }),
  ]);

  return {
    workers,
    customers,
    bookings,
    completed,
  };
}

// =========================
// DASHBOARD STATS
// =========================

export async function getDashboardStats(): Promise<DashboardStats> {
  const [workers, customers, bookings, reviews] = await Promise.all([
    countRows("profiles", {
      column: "role",
      value: "worker",
    }),
    countRows("profiles", {
      column: "role",
      value: "customer",
    }),
    countRows("bookings"),
    countRows("reviews"),
  ]);

  return {
    workers,
    customers,
    bookings,
    reviews,
  };
}

// =========================
// MONTHLY BOOKINGS (FOR CHART)
// =========================

export async function getMonthlyBookings(): Promise<MonthlyChartData> {
  const { data, error } = await supabase.from("bookings").select("created_at");

  if (error) {
    throw wrapError(error, "Unable to load monthly booking data.");
  }

  return {
    labels: [...MONTH_LABELS],
    data: aggregateMonthlyCount((data ?? []) as CreatedAtRecord[]),
  };
}

// =========================
// BOOKING STATUS SUMMARY
// =========================

export async function getBookingStatusSummary(): Promise<
  BookingStatusRecord[]
> {
  const { data, error } = await supabase.from("bookings").select("status");

  if (error) {
    throw wrapError(error, "Unable to load booking status data.");
  }

  return (data ?? []) as BookingStatusRecord[];
}

// =========================
// TOP WORKERS
// =========================

export async function getTopWorkers(): Promise<TopWorkerReview[]> {
  const { data, error } = await supabase.from("reviews").select(`
    rating,
    worker:profiles!worker_id(
      id,
      first_name,
      last_name
    )
  `);

  if (error) {
    throw wrapError(error, "Unable to load top-worker review data.");
  }

  return (data ?? []).map((record) => {
    const typedRecord = record as {
      rating: number | string;
      worker?: ReportProfile | ReportProfile[] | null;
    };

    const rating = Number(typedRecord.rating);

    return {
      rating: Number.isFinite(rating) ? rating : 0,
      worker: normalizeRelatedProfile(typedRecord.worker),
    };
  });
}

// =========================
// RECENT BOOKINGS
// =========================

export async function getRecentBookings(): Promise<RecentBooking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      customer:profiles!customer_id(
        id,
        first_name,
        last_name
      ),
      worker:profiles!worker_id(
        id,
        first_name,
        last_name
      )
      `,
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(10);

  if (error) {
    throw wrapError(error, "Unable to load recent bookings.");
  }

  return ((data ?? []) as RecentBooking[]).map((booking) => ({
    ...booking,
    customer: normalizeRelatedProfile(
      booking.customer as ReportProfile | ReportProfile[] | null,
    ),
    worker: normalizeRelatedProfile(
      booking.worker as ReportProfile | ReportProfile[] | null,
    ),
  }));
}

// =========================
// MONTHLY REVENUE
// =========================

export async function getMonthlyRevenue(): Promise<MonthlyChartData> {
  const { data, error } = await supabase
    .from("payments")
    .select("amount, created_at")
    .eq("payment_status", "Paid");

  if (error) {
    throw wrapError(error, "Unable to load monthly revenue data.");
  }

  return {
    labels: [...MONTH_LABELS],
    data: aggregateMonthlyRevenue((data ?? []) as PaymentRevenueRecord[]),
  };
}
