import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";
import {
  Star,
  Heart,
  Eye,
  CalendarCheck,
  Trash2,
  Mail,
  Users,
  Loader2,
} from "lucide-react";

import { supabase } from "../../../lib/supabase";

import {
  getFavoriteWorkers,
  removeFavorite,
} from "../../../services/favoriteService";

import { getWorkerAverageRating } from "../../../services/reviewService";

export default function Favorites() {
  const navigate = useNavigate();

  const [workers, setWorkers] = useState<any[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    loadFavorites();
  }, []);

  async function loadFavorites() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setWorkers([]);
        return;
      }

      const data = await getFavoriteWorkers(user.id);
      const favoriteWorkers = data ?? [];

      setWorkers(favoriteWorkers);

      const ratingEntries = await Promise.all(
        favoriteWorkers.map(async (worker: any) => {
          const rating = await getWorkerAverageRating(worker.id);

          return [worker.id, rating] as const;
        }),
      );

      setRatings(Object.fromEntries(ratingEntries));
    } catch (error) {
      console.error("Failed to load favorite workers:", error);
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveFavorite(workerId: string) {
    try {
      setRemovingId(workerId);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      await removeFavorite(user.id, workerId);

      setWorkers((currentWorkers) =>
        currentWorkers.filter((worker) => worker.id !== workerId),
      );
    } catch (error) {
      console.error("Failed to remove favorite worker:", error);
    } finally {
      setRemovingId(null);
    }
  }

  function getWorkerName(worker: any) {
    return [worker.first_name, worker.middle_name, worker.last_name]
      .filter(Boolean)
      .join(" ");
  }

  return (
    <CustomerLayout>
      <div className="mx-auto w-full max-w-[1800px] px-6 py-6 space-y-6">
        {/* Header */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-500 px-5 py-7 text-white shadow-lg sm:rounded-3xl sm:px-8 sm:py-9 lg:px-10">
          <div className="absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/10 sm:h-56 sm:w-56" />
          <div className="absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-cyan-200/10" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm sm:text-sm">
                <Heart size={16} className="fill-white" />
                Saved workers
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                My Favorite Workers
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
                Quickly view and book the trusted workers you have saved.
              </p>
            </div>

            <div className="flex w-fit items-center gap-3 rounded-2xl border border-white/20 bg-white/15 px-4 py-3 backdrop-blur-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <Users size={21} />
              </div>

              <div>
                <p className="text-xs text-blue-100">Total favorites</p>
                <p className="text-xl font-bold">{workers.length}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Loading */}
        {loading && (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-gray-100 bg-white p-8 shadow-sm sm:rounded-3xl">
            <div className="text-center">
              <Loader2
                size={38}
                className="mx-auto animate-spin text-blue-600"
              />

              <p className="mt-4 text-sm font-medium text-gray-500">
                Loading favorite workers...
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && workers.length === 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-12 text-center shadow-sm sm:rounded-3xl sm:px-10 sm:py-16">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-pink-50 text-pink-500">
              <Heart size={36} />
            </div>

            <h2 className="mt-5 text-xl font-bold text-gray-900 sm:text-2xl">
              No Favorite Workers Yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500 sm:text-base">
              Add workers to your favorites so you can easily find and book them
              later.
            </p>

            <button
              type="button"
              onClick={() => navigate("/customer/workers")}
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
            >
              Browse Workers
            </button>
          </div>
        )}

        {/* Worker cards */}
        {!loading && workers.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
            {workers.map((worker) => {
              const workerName = getWorkerName(worker);
              const workerRating = ratings[worker.id] ?? 0;
              const isRemoving = removingId === worker.id;

              return (
                <article
                  key={worker.id}
                  className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:rounded-3xl"
                >
                  {/* Image */}
                  <div className="relative h-52 overflow-hidden sm:h-56">
                    <img
                      src={
                        worker.profile_picture ??
                        "https://placehold.co/600x400?text=Worker"
                      }
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      alt={workerName || "Worker"}
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

                    <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-sm font-bold text-gray-800 shadow-md backdrop-blur-sm sm:right-4 sm:top-4">
                      <Star
                        size={15}
                        className="fill-yellow-400 text-yellow-400"
                      />
                      {Number(workerRating).toFixed(1)}
                    </div>

                    <div className="absolute bottom-4 left-4 right-4">
                      <h2 className="line-clamp-2 text-xl font-bold text-white sm:text-2xl">
                        {workerName || "Unnamed Worker"}
                      </h2>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 sm:p-5">
                    <div className="flex min-w-0 items-center gap-2 text-sm text-gray-500">
                      <Mail size={16} className="shrink-0" />

                      <span className="truncate">
                        {worker.email || "No email provided"}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="inline-flex min-w-0 items-center gap-2 rounded-full bg-pink-50 px-3 py-1.5 text-xs font-semibold text-pink-600 sm:text-sm">
                        <Heart size={15} className="shrink-0 fill-pink-500" />
                        <span className="truncate">Favorite Worker</span>
                      </span>

                      <span className="shrink-0 text-xs font-medium text-gray-400">
                        Rating {Number(workerRating).toFixed(1)}
                      </span>
                    </div>

                    {/* Mobile: stacked buttons */}
                    {/* Tablet/Desktop: View and Book on first row */}
                    <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/customer/workers/${worker.id}`)
                        }
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                      >
                        <Eye size={17} />
                        View Profile
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/customer/workers/${worker.id}`)
                        }
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
                      >
                        <CalendarCheck size={17} />
                        Book Worker
                      </button>

                      <button
                        type="button"
                        disabled={isRemoving}
                        onClick={() => handleRemoveFavorite(worker.id)}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
                      >
                        {isRemoving ? (
                          <>
                            <Loader2 size={17} className="animate-spin" />
                            Removing...
                          </>
                        ) : (
                          <>
                            <Trash2 size={17} />
                            Remove from Favorites
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
