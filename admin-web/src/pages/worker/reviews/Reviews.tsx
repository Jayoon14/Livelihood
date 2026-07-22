import { useEffect, useMemo, useState } from "react";
import { Star, Search, MessageSquare, Award, TrendingUp } from "lucide-react";

import WorkerLayout from "../../../layouts/WorkerLayout";
import { supabase } from "../../../lib/supabase";
import {
  getAverageRating,
  getWorkerReviews,
} from "../../../services/reviewService";

export default function Reviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [average, setAverage] = useState(0);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(0);

  useEffect(() => {
    loadReviews();
  }, []);

  async function loadReviews() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const reviewData = await getWorkerReviews(user.id);
    const avg = await getAverageRating(user.id);

    setReviews(reviewData);
    setAverage(avg);
  }

  /* =============================
     FILTERED REVIEWS
  ============================= */

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      const customer =
        `${review.customer?.first_name ?? ""} ${review.customer?.last_name ?? ""}`.toLowerCase();

      const matchesSearch = customer.includes(search.toLowerCase());

      const matchesFilter = filter === 0 || review.rating === filter;

      return matchesSearch && matchesFilter;
    });
  }, [reviews, search, filter]);

  /* =============================
     DASHBOARD STATS
  ============================= */

  const fiveStars = reviews.filter((r) => r.rating === 5).length;

  const satisfaction =
    reviews.length === 0 ? 0 : Math.round((fiveStars / reviews.length) * 100);

  const ratingPercent = (rating: number) => {
    if (reviews.length === 0) return 0;

    const count = reviews.filter((r) => r.rating === rating).length;

    return Math.round((count / reviews.length) * 100);
  };

  return (
    <WorkerLayout>
      <div className="space-y-8 p-8">
        {/* HERO */}

        <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-8 text-white shadow-xl">
          <h1 className="text-4xl font-bold">Customer Reviews</h1>

          <p className="mt-3 max-w-2xl text-orange-100">
            Read customer feedback, monitor your service quality, and improve
            your overall performance.
          </p>
        </div>

        {/* DASHBOARD */}

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Average Rating</p>

                <h2 className="mt-2 text-4xl font-bold text-yellow-500">
                  {average.toFixed(1)}
                </h2>
              </div>

              <div className="rounded-2xl bg-yellow-100 p-4">
                <Star
                  className="text-yellow-500"
                  fill="currentColor"
                  size={30}
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Reviews</p>

                <h2 className="mt-2 text-4xl font-bold">{reviews.length}</h2>
              </div>

              <div className="rounded-2xl bg-blue-100 p-4">
                <MessageSquare className="text-blue-600" size={30} />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Five-Star Reviews</p>

                <h2 className="mt-2 text-4xl font-bold">{fiveStars}</h2>
              </div>

              <div className="rounded-2xl bg-green-100 p-4">
                <Award className="text-green-600" size={30} />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Satisfaction</p>

                <h2 className="mt-2 text-4xl font-bold">{satisfaction}%</h2>
              </div>

              <div className="rounded-2xl bg-purple-100 p-4">
                <TrendingUp className="text-purple-600" size={30} />
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH + FILTER */}

        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search
                className="absolute left-4 top-4 text-gray-400"
                size={18}
              />

              <input
                type="text"
                placeholder="Search customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 w-full rounded-xl border pl-11 pr-4 outline-none focus:border-orange-500"
              />
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(Number(e.target.value))}
              className="h-12 rounded-xl border px-4 outline-none focus:border-orange-500"
            >
              <option value={0}>All Ratings</option>

              <option value={5}>⭐⭐⭐⭐⭐</option>

              <option value={4}>⭐⭐⭐⭐☆</option>

              <option value={3}>⭐⭐⭐☆☆</option>

              <option value={2}>⭐⭐☆☆☆</option>

              <option value={1}>⭐☆☆☆☆</option>
            </select>
          </div>
        </div>

        {/* OVERALL RATING */}

        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-8 lg:flex-row lg:justify-between">
            <div>
              <p className="text-sm text-gray-500">Overall Rating</p>

              <h2 className="mt-3 text-6xl font-bold text-yellow-500">
                {average.toFixed(1)}
              </h2>

              <div className="mt-4 flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    fill={star <= Math.round(average) ? "currentColor" : "none"}
                    className="text-yellow-500"
                  />
                ))}
              </div>

              <p className="mt-3 text-gray-500">
                Based on {reviews.length} customer review(s)
              </p>
            </div>

            <div className="w-full max-w-md space-y-4">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center gap-4">
                  <span className="w-6 text-sm font-semibold">{rating}</span>

                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-200">
                    <div
                      style={{
                        width: `${ratingPercent(rating)}%`,
                      }}
                      className="h-full rounded-full bg-yellow-400"
                    />
                  </div>

                  <span className="w-12 text-right text-sm text-gray-500">
                    {ratingPercent(rating)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PART 2 STARTS HERE */}
        {/* REVIEWS */}

        {filteredReviews.length === 0 ? (
          <div className="rounded-3xl border bg-white py-20 text-center shadow-sm">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-yellow-100">
              <MessageSquare size={40} className="text-yellow-500" />
            </div>

            <h2 className="mt-6 text-2xl font-bold text-gray-800">
              No Reviews Found
            </h2>

            <p className="mt-2 text-gray-500">
              Customer reviews will appear here after completed bookings.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredReviews.map((review) => (
              <div
                key={review.id}
                className="rounded-3xl border bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                {/* HEADER */}

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar customer={review.customer} />

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-800">
                          {review.customer?.first_name}{" "}
                          {review.customer?.last_name}
                        </h2>

                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          ✓ Verified Customer
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-gray-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <Stars rating={review.rating} />
                </div>

                {/* REVIEW */}

                <div className="mt-6 rounded-2xl bg-gray-50 p-5">
                  <p className="leading-7 text-gray-700 italic">
                    "{review.review}"
                  </p>
                </div>

                {/* BREAKDOWN */}

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <RatingRow label="Overall" rating={review.overall_rating} />

                  <RatingRow label="Quality" rating={review.quality_rating} />

                  <RatingRow
                    label="Professionalism"
                    rating={review.professionalism_rating}
                  />

                  <RatingRow
                    label="Communication"
                    rating={review.communication_rating}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </WorkerLayout>
  );
}

/* ==========================================
   AVATAR
========================================== */

function Avatar({ customer }: any) {
  if (customer?.profile_picture) {
    return (
      <img
        src={customer.profile_picture}
        alt="Customer"
        className="h-16 w-16 rounded-full border object-cover"
      />
    );
  }

  const initials = `${customer?.first_name?.[0] ?? ""}${customer?.last_name?.[0] ?? ""}`;

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-500 text-lg font-bold text-white">
      {initials}
    </div>
  );
}

/* ==========================================
   RATING ROW
========================================== */

function RatingRow({ label, rating }: { label: string; rating: number }) {
  return (
    <div className="rounded-2xl border bg-gray-50 p-4">
      <p className="mb-2 text-sm font-semibold text-gray-600">{label}</p>

      <Stars rating={rating} />
    </div>
  );
}

/* ==========================================
   STARS
========================================== */

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={20}
          className={
            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          }
        />
      ))}
    </div>
  );
}
