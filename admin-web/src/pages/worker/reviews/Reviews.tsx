import { useEffect, useState } from "react";
import WorkerLayout from "../../../layouts/WorkerLayout";
import { supabase } from "../../../lib/supabase";
import {
  getWorkerReviews,
  getAverageRating,
} from "../../../services/reviewService";

export default function Reviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [average, setAverage] = useState(0);

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

  return (
    <WorkerLayout>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8">
          Customer Reviews
        </h1>

        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h2 className="text-xl font-bold">
            Overall Rating
          </h2>

          <p className="text-5xl font-bold text-yellow-500 mt-4">
            ⭐ {average}
          </p>

          <p className="text-gray-500 mt-2">
            {reviews.length} Review(s)
          </p>
        </div>

        {reviews.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <p className="text-gray-500">
              No customer reviews yet.
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-xl shadow p-6 mb-5"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="font-bold text-lg">
                    {review.customer?.first_name}{" "}
                    {review.customer?.last_name}
                  </h2>

                  <p className="text-yellow-500 mt-2">
                    {"⭐".repeat(review.rating)}
                  </p>
                </div>

                <span className="text-sm text-gray-400">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>

              <p className="mt-4 text-gray-700">
                {review.review}
              </p>
            </div>
          ))
        )}
      </div>
    </WorkerLayout>
  );
}