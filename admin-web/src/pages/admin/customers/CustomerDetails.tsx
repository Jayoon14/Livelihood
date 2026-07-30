import {
  ArrowLeft,
  Ban,
  CalendarDays,
  CheckCircle2,
  RefreshCw,
  ShieldOff,
  Star,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { confirmAction } from "../../../components/ui/confirmAction";
import AdminLayout from "../../../layouts/AdminLayout";
import { supabase } from "../../../lib/supabase";
import {
  CUSTOMER_STATUS,
  getCustomer,
  getCustomerBookings,
  getCustomerReviews,
  updateCustomerStatus,
  type Customer,
  type CustomerBookingSummary,
  type CustomerReviewSummary,
  type CustomerStatus,
} from "../../../services/customerService";

function formatDate(value?: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
}

function statusClasses(status: CustomerStatus): string {
  switch (status) {
    case CUSTOMER_STATUS.APPROVED:
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
    case CUSTOMER_STATUS.PENDING:
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
    case CUSTOMER_STATUS.DISABLED:
      return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
    case CUSTOMER_STATUS.BLOCKED:
    case CUSTOMER_STATUS.REJECTED:
      return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";
  }
}

export default function CustomerDetails() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] =
    useState<Customer | null>(null);
  const [bookings, setBookings] = useState<
    CustomerBookingSummary[]
  >([]);
  const [reviews, setReviews] = useState<
    CustomerReviewSummary[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] =
    useState<string | null>(null);

  const loadCustomer = useCallback(
    async (background = false) => {
      if (!id) {
        setError("Customer ID is missing.");
        setLoading(false);
        return;
      }

      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const [profileResult, bookingsResult, reviewsResult] =
          await Promise.allSettled([
            getCustomer(id),
            getCustomerBookings(id),
            getCustomerReviews(id),
          ]);

        if (profileResult.status === "rejected") {
          throw profileResult.reason;
        }

        setCustomer(profileResult.value);

        if (bookingsResult.status === "fulfilled") {
          setBookings(bookingsResult.value);
        } else {
          setBookings([]);
          toast.warning(
            "Customer loaded, but booking history is unavailable.",
          );
        }

        if (reviewsResult.status === "fulfilled") {
          setReviews(reviewsResult.value);
        } else {
          setReviews([]);
          toast.warning(
            "Customer loaded, but reviews are unavailable.",
          );
        }
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Unable to load customer details.";

        setError(message);

        if (!background) {
          toast.error(message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    void loadCustomer();
  }, [loadCustomer]);

  useEffect(() => {
    if (!id) {
      return;
    }

    const channel = supabase
      .channel(`admin-customer-details-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${id}`,
        },
        () => {
          void loadCustomer(true);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `customer_id=eq.${id}`,
        },
        () => {
          void loadCustomer(true);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reviews",
          filter: `customer_id=eq.${id}`,
        },
        () => {
          void loadCustomer(true);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, loadCustomer]);

  const stats = useMemo(() => {
    const completed = bookings.filter(
      (booking) =>
        booking.status.trim().toLowerCase() ===
        "completed",
    ).length;

    const averageRating =
      reviews.length === 0
        ? 0
        : reviews.reduce(
            (sum, review) => sum + review.rating,
            0,
          ) / reviews.length;

    return {
      totalBookings: bookings.length,
      completed,
      reviews: reviews.length,
      averageRating,
    };
  }, [bookings, reviews]);

  async function changeStatus(nextStatus: CustomerStatus) {
    if (!customer) {
      return;
    }

    const confirmed = await confirmAction(
      `Change ${customer.full_name}'s account status from ${customer.normalized_status} to ${nextStatus}?`,
      {
        title: "Update customer status",
        confirmText: nextStatus,
      },
    );

    if (!confirmed) {
      return;
    }

    setProcessing(true);
    const toastId = toast.loading(
      "Updating customer status...",
    );

    try {
      const updated = await updateCustomerStatus(
        customer.id,
        nextStatus,
      );

      setCustomer(updated);

      toast.success(
        `Customer account is now ${nextStatus}.`,
        { id: toastId },
      );
    } catch (updateError) {
      toast.error(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update customer status.",
        { id: toastId },
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/customers"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 dark:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to customers
          </Link>

          <button
            type="button"
            disabled={refreshing}
            onClick={() => void loadCustomer(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900">
            Loading customer details...
          </div>
        ) : error || !customer ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center dark:border-red-900 dark:bg-red-950/30">
            <p className="font-semibold text-red-700 dark:text-red-300">
              {error || "Customer not found."}
            </p>
            <button
              type="button"
              onClick={() => void loadCustomer()}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <section className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center dark:border-slate-700 dark:bg-slate-900">
              {customer.avatar ? (
                <img
                  src={customer.avatar}
                  alt={customer.full_name}
                  className="h-24 w-24 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-4xl font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                  {customer.full_name
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h1 className="wrap-break-word text-2xl font-bold text-slate-900 sm:text-4xl dark:text-white">
                  {customer.full_name}
                </h1>
                <p className="mt-1 wrap-break-word text-slate-500 dark:text-slate-400">
                  {customer.email || "No email"}
                </p>
                <span
                  className={`mt-3 inline-block rounded-full px-4 py-1 text-sm font-semibold ${statusClasses(
                    customer.normalized_status,
                  )}`}
                >
                  {customer.normalized_status}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {customer.normalized_status !==
                  CUSTOMER_STATUS.APPROVED && (
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() =>
                      void changeStatus(
                        CUSTOMER_STATUS.APPROVED,
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Activate
                  </button>
                )}

                {customer.normalized_status !==
                  CUSTOMER_STATUS.DISABLED && (
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() =>
                      void changeStatus(
                        CUSTOMER_STATUS.DISABLED,
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    <ShieldOff className="h-4 w-4" />
                    Disable
                  </button>
                )}

                {customer.normalized_status !==
                  CUSTOMER_STATUS.BLOCKED && (
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() =>
                      void changeStatus(
                        CUSTOMER_STATUS.BLOCKED,
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    <Ban className="h-4 w-4" />
                    Block
                  </button>
                )}
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Bookings"
                value={stats.totalBookings}
              />
              <StatCard
                title="Completed"
                value={stats.completed}
              />
              <StatCard
                title="Reviews"
                value={stats.reviews}
              />
              <StatCard
                title="Average Rating"
                value={
                  stats.reviews > 0
                    ? stats.averageRating.toFixed(1)
                    : "—"
                }
              />
            </section>

            <Section title="Personal Information">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <Info
                  title="Full name"
                  value={customer.full_name}
                />
                <Info title="Email" value={customer.email} />
                <Info title="Phone" value={customer.phone} />
                <Info title="Gender" value={customer.gender} />
                <Info
                  title="Birth date"
                  value={formatDate(customer.birth_date)}
                />
                <Info
                  title="Civil status"
                  value={customer.civil_status}
                />
                <Info
                  title="Religion"
                  value={customer.religion}
                />
                <Info
                  title="Address"
                  value={customer.full_address}
                />
                <Info
                  title="Registered"
                  value={formatDateTime(
                    customer.created_at,
                  )}
                />
              </div>
            </Section>

            <Section
              title={`Booking History (${bookings.length})`}
            >
              {bookings.length === 0 ? (
                <EmptyState
                  icon={
                    <CalendarDays className="h-8 w-8" />
                  }
                  text="No bookings found."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-212.5 text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                      <tr>
                        <th className="p-3">Booking</th>
                        <th className="p-3">Worker</th>
                        <th className="p-3">Service</th>
                        <th className="p-3">Schedule</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {bookings.map((booking) => (
                        <tr key={booking.id}>
                          <td className="p-3 font-semibold">
                            <Link
                              to={`/bookings/${booking.id}`}
                              className="text-blue-600 hover:underline"
                            >
                              #{booking.id}
                            </Link>
                          </td>
                          <td className="p-3">
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
                          <td className="p-3">
                            {booking.service_name || "—"}
                          </td>
                          <td className="p-3">
                            <p>
                              {formatDate(
                                booking.booking_date,
                              )}
                            </p>
                            <p className="text-xs text-slate-500">
                              {booking.booking_time || "—"}
                            </p>
                          </td>
                          <td className="p-3">
                            {booking.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            <Section
              title={`Ratings Given (${reviews.length})`}
            >
              {reviews.length === 0 ? (
                <EmptyState
                  icon={<Star className="h-8 w-8" />}
                  text="No ratings yet."
                />
              ) : (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <article
                      key={review.id}
                      className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {review.worker_id ? (
                            <Link
                              to={`/workers/${review.worker_id}`}
                              className="hover:text-blue-600 hover:underline"
                            >
                              {review.worker_name}
                            </Link>
                          ) : (
                            review.worker_name
                          )}
                        </p>
                        <p className="font-semibold text-amber-600">
                          {review.rating.toFixed(1)} / 5
                        </p>
                      </div>

                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        {review.review ||
                          "No written review."}
                      </p>

                      <p className="mt-2 text-xs text-slate-400">
                        <Link
                          to={`/bookings/${review.booking_id}`}
                          className="hover:text-blue-600 hover:underline"
                        >
                          Booking #{review.booking_id}
                        </Link>
                        {review.created_at
                          ? ` · ${formatDateTime(
                              review.created_at,
                            )}`
                          : ""}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/60">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {title}
        </h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Info({
  title,
  value,
}: {
  title: string;
  value: unknown;
}) {
  const display =
    value === null ||
    value === undefined ||
    String(value).trim() === ""
      ? "—"
      : String(value);

  return (
    <div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <p className="mt-1 wrap-break-word font-semibold text-slate-800 dark:text-slate-200">
        {display}
      </p>
    </div>
  );
}

function EmptyState({
  icon,
  text,
}: {
  icon: ReactNode;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-950/40">
      <div className="mx-auto mb-2 w-fit text-slate-400">
        {icon}
      </div>
      {text}
    </div>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>
    </article>
  );
}