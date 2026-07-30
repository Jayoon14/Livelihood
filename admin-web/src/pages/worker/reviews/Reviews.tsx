import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import {
  AlertCircle,
  Award,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  RefreshCw,
  Search,
  Star,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import WorkerLayout from "../../../layouts/WorkerLayout";
import { supabase } from "../../../lib/supabase";
import {
  getWorkerReviews,
  type ReviewProfile,
  type WorkerReview,
} from "../../../services/reviewService";

type RatingFilter = 0 | 1 | 2 | 3 | 4 | 5;
type SortOption = "newest" | "oldest" | "highest" | "lowest";

type ReviewsMessage = {
  type: "error" | "success";
  text: string;
} | null;

const REVIEWS_PER_PAGE = 8;

function getErrorMessage(error: unknown, fallback: string): string {
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

  return fallback;
}

function normalizeRating(value: unknown): number {
  const rating = Number(value);

  if (!Number.isFinite(rating)) {
    return 0;
  }

  return Math.max(0, Math.min(5, rating));
}

function getCustomerName(customer: ReviewProfile | null): string {
  if (!customer) {
    return "Customer";
  }

  return (
    [
      customer.first_name,
      customer.middle_name,
      customer.last_name,
      customer.suffix,
    ]
      .map((part) => part?.trim())
      .filter((part): part is string => Boolean(part))
      .join(" ") ||
    customer.email ||
    "Customer"
  );
}

function getCustomerInitials(customer: ReviewProfile | null): string {
  const first = customer?.first_name?.trim().charAt(0) ?? "";
  const last = customer?.last_name?.trim().charAt(0) ?? "";

  return `${first}${last}`.toUpperCase() || "C";
}

function formatReviewDate(value: string | undefined): string {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatBookingDate(value: string | null | undefined): string {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(date);
}

function getReviewText(review: WorkerReview): string {
  return review.review?.trim() || "No written feedback provided.";
}

function getServiceName(review: WorkerReview): string {
  return review.booking?.service?.service_name?.trim() || "Service";
}

function sortReviews(
  reviews: WorkerReview[],
  sort: SortOption,
): WorkerReview[] {
  const items = [...reviews];

  switch (sort) {
    case "oldest":
      return items.sort(
        (first, second) =>
          new Date(first.created_at).getTime() -
          new Date(second.created_at).getTime(),
      );

    case "highest":
      return items.sort((first, second) => {
        const ratingDifference =
          normalizeRating(second.overall_rating ?? second.rating) -
          normalizeRating(first.overall_rating ?? first.rating);

        if (ratingDifference !== 0) {
          return ratingDifference;
        }

        return (
          new Date(second.created_at).getTime() -
          new Date(first.created_at).getTime()
        );
      });

    case "lowest":
      return items.sort((first, second) => {
        const ratingDifference =
          normalizeRating(first.overall_rating ?? first.rating) -
          normalizeRating(second.overall_rating ?? second.rating);

        if (ratingDifference !== 0) {
          return ratingDifference;
        }

        return (
          new Date(second.created_at).getTime() -
          new Date(first.created_at).getTime()
        );
      });

    case "newest":
    default:
      return items.sort(
        (first, second) =>
          new Date(second.created_at).getTime() -
          new Date(first.created_at).getTime(),
      );
  }
}

export default function Reviews() {
  const realtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [workerId, setWorkerId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<WorkerReview[]>([]);

  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>(0);
  const [sort, setSort] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<ReviewsMessage>(null);

  const loadReviews = useCallback(
    async (
      id: string,
      options: {
        showRefresh?: boolean;
      } = {},
    ): Promise<void> => {
      if (options.showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const data = await getWorkerReviews(id);

        setReviews(data);
        setMessage(null);
      } catch (error) {
        setMessage({
          type: "error",
          text: getErrorMessage(error, "Unable to load customer reviews."),
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
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function initialize(): Promise<void> {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          throw error;
        }

        if (!user) {
          throw new Error("Your session has expired. Please sign in again.");
        }

        if (!mounted) {
          return;
        }

        setWorkerId(user.id);
        await loadReviews(user.id);

        if (!mounted) {
          return;
        }

        channel = supabase
          .channel(`worker-reviews-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "reviews",
              filter: `worker_id=eq.${user.id}`,
            },
            (_payload: RealtimePostgresChangesPayload<WorkerReview>) => {
              if (realtimeTimerRef.current) {
                clearTimeout(realtimeTimerRef.current);
              }

              realtimeTimerRef.current = setTimeout(() => {
                if (mounted) {
                  void loadReviews(user.id);
                }
              }, 250);
            },
          )
          .subscribe();
      } catch (error) {
        if (mounted) {
          setMessage({
            type: "error",
            text: getErrorMessage(
              error,
              "Unable to initialize the reviews page.",
            ),
          });
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      mounted = false;

      if (realtimeTimerRef.current) {
        clearTimeout(realtimeTimerRef.current);
      }

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [loadReviews]);

  useEffect(() => {
    setPage(1);
  }, [search, ratingFilter, sort]);

  const statistics = useMemo(() => {
    const totalReviews = reviews.length;

    const distribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    } as Record<1 | 2 | 3 | 4 | 5, number>;

    if (totalReviews === 0) {
      return {
        average: 0,
        fiveStars: 0,
        satisfaction: 0,
        distribution,
      };
    }

    const totalRating = reviews.reduce(
      (sum, review) =>
        sum + normalizeRating(review.overall_rating ?? review.rating),
      0,
    );

    for (const review of reviews) {
      const rounded = Math.round(
        normalizeRating(review.overall_rating ?? review.rating),
      );

      if (rounded >= 1 && rounded <= 5) {
        distribution[rounded as 1 | 2 | 3 | 4 | 5] += 1;
      }
    }

    const fiveStars = distribution[5];
    const satisfiedReviews = distribution[4] + distribution[5];

    return {
      average: Number((totalRating / totalReviews).toFixed(1)),
      fiveStars,
      satisfaction: Math.round((satisfiedReviews / totalReviews) * 100),
      distribution,
    };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const filtered = reviews.filter((review) => {
      const customerName = getCustomerName(review.customer).toLowerCase();
      const reviewText = getReviewText(review).toLowerCase();
      const serviceName = getServiceName(review).toLowerCase();
      const bookingId = String(review.booking_id);

      const matchesSearch =
        !keyword ||
        customerName.includes(keyword) ||
        reviewText.includes(keyword) ||
        serviceName.includes(keyword) ||
        bookingId.includes(keyword);

      const rating = Math.round(
        normalizeRating(review.overall_rating ?? review.rating),
      );

      const matchesRating = ratingFilter === 0 || rating === ratingFilter;

      return matchesSearch && matchesRating;
    });

    return sortReviews(filtered, sort);
  }, [ratingFilter, reviews, search, sort]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredReviews.length / REVIEWS_PER_PAGE),
  );

  const paginatedReviews = useMemo(() => {
    const start = (page - 1) * REVIEWS_PER_PAGE;

    return filteredReviews.slice(start, start + REVIEWS_PER_PAGE);
  }, [filteredReviews, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const getRatingPercentage = useCallback(
    (rating: 1 | 2 | 3 | 4 | 5): number => {
      if (reviews.length === 0) {
        return 0;
      }

      return Math.round(
        (statistics.distribution[rating] / reviews.length) * 100,
      );
    },
    [reviews.length, statistics.distribution],
  );

  const handleRefresh = useCallback(async (): Promise<void> => {
    if (!workerId || refreshing) {
      return;
    }

    await loadReviews(workerId, {
      showRefresh: true,
    });
  }, [loadReviews, refreshing, workerId]);

  return (
    <WorkerLayout>
      <main className="min-h-screen bg-slate-50 p-3 sm:p-6 lg:p-8 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
          {message && (
            <div
              role={message.type === "error" ? "alert" : "status"}
              className={`flex items-start justify-between gap-4 rounded-2xl border px-4 py-3 text-sm font-medium ${
                message.type === "error"
                  ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
              }`}
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{message.text}</span>
              </div>

              <button
                type="button"
                onClick={() => setMessage(null)}
                className="rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Dismiss message"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <header className="relative overflow-hidden rounded-2xl bg-linear-to-r from-amber-500 via-orange-500 to-red-500 p-5 text-white shadow-xl sm:rounded-3xl sm:p-8">
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-white/10" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-100 sm:text-sm">
                  Worker Performance
                </p>

                <h1 className="mt-2 text-2xl font-bold sm:text-4xl">
                  Customer Reviews
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-orange-100 sm:text-base">
                  Read customer feedback, monitor service quality, and improve
                  your performance.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={refreshing || !workerId}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/15 px-4 py-3 text-sm font-semibold backdrop-blur transition hover:bg-white/25 disabled:opacity-50 sm:w-auto"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />

                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </header>

          <section
            aria-label="Review statistics"
            className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4"
          >
            <StatCard
              label="Average Rating"
              value={statistics.average.toFixed(1)}
              icon={Star}
              iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"
            />

            <StatCard
              label="Total Reviews"
              value={reviews.length}
              icon={MessageSquare}
              iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
            />

            <StatCard
              label="Five-Star Reviews"
              value={statistics.fiveStars}
              icon={Award}
              iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
            />

            <StatCard
              label="Satisfaction"
              value={`${statistics.satisfaction}%`}
              icon={TrendingUp}
              iconClassName="bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"
            />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 dark:border-slate-700 dark:bg-slate-900">
            <div className="grid gap-4 lg:grid-cols-[1fr_190px_190px]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="search"
                  placeholder="Search customer, service, booking, or review..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-10 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-orange-950"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <select
                value={ratingFilter}
                onChange={(event) =>
                  setRatingFilter(Number(event.target.value) as RatingFilter)
                }
                className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-orange-950"
              >
                <option value={0}>All Ratings</option>
                <option value={5}>5 Stars</option>
                <option value={4}>4 Stars</option>
                <option value={3}>3 Stars</option>
                <option value={2}>2 Stars</option>
                <option value={1}>1 Star</option>
              </select>

              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortOption)}
                className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-orange-950"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Highest Rating</option>
                <option value="lowest">Lowest Rating</option>
              </select>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-8 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-center lg:text-left">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Overall Rating
                </p>

                <p className="mt-2 text-5xl font-bold text-amber-500 sm:text-6xl">
                  {statistics.average.toFixed(1)}
                </p>

                <Stars
                  rating={statistics.average}
                  size="large"
                  className="mt-4 justify-center lg:justify-start"
                />

                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                  Based on {reviews.length} customer{" "}
                  {reviews.length === 1 ? "review" : "reviews"}
                </p>
              </div>

              <div className="w-full max-w-xl space-y-3">
                {([5, 4, 3, 2, 1] as const).map((rating) => {
                  const percentage = getRatingPercentage(rating);

                  return (
                    <div
                      key={rating}
                      className="grid grid-cols-[24px_1fr_50px] items-center gap-3"
                    >
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {rating}
                      </span>

                      <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          style={{
                            width: `${percentage}%`,
                          }}
                          className="h-full rounded-full bg-amber-400 transition-all"
                        />
                      </div>

                      <span className="text-right text-sm text-slate-500 dark:text-slate-400">
                        {percentage}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {loading ? (
            <section className="space-y-4">
              {Array.from({
                length: 4,
              }).map((_, index) => (
                <div
                  key={index}
                  className="h-72 animate-pulse rounded-2xl bg-slate-200 sm:rounded-3xl dark:bg-slate-800"
                />
              ))}
            </section>
          ) : paginatedReviews.length === 0 ? (
            <section className="rounded-2xl border border-slate-200 bg-white px-5 py-16 text-center shadow-sm sm:rounded-3xl dark:border-slate-700 dark:bg-slate-900">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
                <MessageSquare className="h-10 w-10" />
              </div>

              <h2 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">
                No Reviews Found
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                {search || ratingFilter !== 0
                  ? "No reviews match the selected search or rating filter."
                  : "Customer reviews will appear here after completed bookings."}
              </p>
            </section>
          ) : (
            <section className="space-y-4 sm:space-y-6">
              {paginatedReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </section>
          )}

          {!loading && filteredReviews.length > 0 && (
            <footer className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Showing{" "}
                <strong className="text-slate-700 dark:text-slate-200">
                  {(page - 1) * REVIEWS_PER_PAGE + 1}
                </strong>
                –
                <strong className="text-slate-700 dark:text-slate-200">
                  {Math.min(page * REVIEWS_PER_PAGE, filteredReviews.length)}
                </strong>{" "}
                of{" "}
                <strong className="text-slate-700 dark:text-slate-200">
                  {filteredReviews.length}
                </strong>{" "}
                reviews
              </p>

              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={page === totalPages}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </footer>
          )}
        </div>
      </main>
    </WorkerLayout>
  );
}

function ReviewCard({ review }: { review: WorkerReview }) {
  const customerName = getCustomerName(review.customer);
  const overallRating = normalizeRating(review.overall_rating ?? review.rating);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-lg sm:rounded-3xl sm:p-7 dark:border-slate-700 dark:bg-slate-900">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <CustomerAvatar customer={review.customer} />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-bold text-slate-900 sm:text-lg dark:text-white">
                {customerName}
              </h2>

              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                Verified Booking
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
              {formatReviewDate(review.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Stars rating={overallRating} />

          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            {overallRating.toFixed(1)}
          </span>
        </div>
      </header>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/50">
          <CalendarDays className="h-5 w-5 shrink-0 text-orange-500" />

          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
              {getServiceName(review)}
            </p>

            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Booking #{review.booking_id}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/50">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Service Date
          </p>

          <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">
            {formatBookingDate(review.booking?.booking_date)}
          </p>
        </div>
      </div>

      <blockquote className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700 sm:p-5 sm:text-base dark:bg-slate-800/60 dark:text-slate-200">
        “{getReviewText(review)}”
      </blockquote>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <RatingRow
          label="Overall"
          rating={normalizeRating(review.overall_rating ?? review.rating)}
        />

        <RatingRow
          label="Quality"
          rating={normalizeRating(review.quality_rating)}
        />

        <RatingRow
          label="Professionalism"
          rating={normalizeRating(review.professionalism_rating)}
        />

        <RatingRow
          label="Communication"
          rating={normalizeRating(review.communication_rating)}
        />
      </div>
    </article>
  );
}

function CustomerAvatar({ customer }: { customer: ReviewProfile | null }) {
  if (customer?.profile_picture) {
    return (
      <img
        src={customer.profile_picture}
        alt={`${getCustomerName(customer)} profile`}
        className="h-14 w-14 shrink-0 rounded-full border border-slate-200 object-cover sm:h-16 sm:w-16 dark:border-slate-700"
      />
    );
  }

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-orange-500 text-lg font-bold text-white sm:h-16 sm:w-16">
      {getCustomerInitials(customer) || <UserRound className="h-6 w-6" />}
    </div>
  );
}

function RatingRow({ label, rating }: { label: string; rating: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:rounded-2xl sm:p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-600 sm:text-sm dark:text-slate-300">
          {label}
        </p>

        <span className="text-xs font-bold text-amber-600 dark:text-amber-300">
          {rating.toFixed(1)}
        </span>
      </div>

      <Stars rating={rating} className="mt-2" />
    </div>
  );
}

function Stars({
  rating,
  size = "normal",
  className = "",
}: {
  rating: number;
  size?: "normal" | "large";
  className?: string;
}) {
  const roundedRating = Math.round(normalizeRating(rating));

  return (
    <div
      className={`flex gap-1 ${className}`}
      aria-label={`${rating.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${
            size === "large" ? "h-6 w-6" : "h-4 w-4 sm:h-5 sm:w-5"
          } ${
            star <= roundedRating
              ? "fill-amber-400 text-amber-400"
              : "text-slate-300 dark:text-slate-600"
          }`}
        />
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: string | number;
  icon: typeof Star;
  iconClassName: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500 sm:text-sm dark:text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-4xl dark:text-white">
            {value}
          </p>
        </div>

        <div className={`hidden rounded-xl p-2.5 sm:block ${iconClassName}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}
