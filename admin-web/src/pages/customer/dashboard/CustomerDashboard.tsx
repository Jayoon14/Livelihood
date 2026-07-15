import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";

import {
  Star,
  Heart,
} from "lucide-react";

import {
  getFeaturedWorkers,
  getCategories,
  searchDashboard,
} from "../../../services/workerService";

import {
  getWorkerAverageRating,
} from "../../../services/reviewService";

import {
  addFavorite,
  removeFavorite,
  isFavorite,
} from "../../../services/favoriteService";

import { supabase } from "../../../lib/supabase";

export default function CustomerDashboard() {
  const navigate = useNavigate();

  const [workers, setWorkers] = useState<any[]>([]);
  const [, setCategories] = useState<string[]>([]);
  const [search,] = useState("");

  const [ratings, setRatings] =
    useState<Record<string, number>>({});

  const [favorites, setFavorites] =
    useState<Record<string, boolean>>({});

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    searchWorkers();
  }, [search]);
    async function loadDashboard() {
    const workerData =
      await getFeaturedWorkers(6);

    const categoryData =
      await getCategories();

    setWorkers(workerData);

    setCategories(categoryData);

    const temp: Record<string, number> = {};

    for (const worker of workerData) {
      temp[worker.id] =
        await getWorkerAverageRating(worker.id);
    }

    setRatings(temp);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const favs: Record<string, boolean> = {};

      for (const worker of workerData) {
        favs[worker.id] =
          await isFavorite(
            user.id,
            worker.id
          );
      }

      setFavorites(favs);
    }
  }

  async function searchWorkers() {
    if (!search.trim()) {
      loadDashboard();
      return;
    }

    const result =
      await searchDashboard(search);

    setWorkers(result);

    const temp: Record<string, number> = {};

    for (const worker of result) {
      temp[worker.id] =
        await getWorkerAverageRating(worker.id);
    }

    setRatings(temp);
  }
    async function toggleFavorite(
    workerId: string
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    if (favorites[workerId]) {
      await removeFavorite(
        user.id,
        workerId
      );

      setFavorites({
        ...favorites,
        [workerId]: false,
      });

    } else {
      await addFavorite(
        user.id,
        workerId
      );

      setFavorites({
        ...favorites,
        [workerId]: true,
      });
    }
  }

  return (
    <CustomerLayout>

      <div className="space-y-8">

        {/* HERO */}
        {/* ... Hindi ito babaguhin ... */}

        {/* CATEGORIES */}
        {/* ... Hindi ito babaguhin ... */}

        {/* FEATURED WORKERS */}

        <div>

          <div className="flex justify-between items-center mb-5">

            <h2 className="text-2xl font-bold">
              Featured Workers
            </h2>

            <button
              onClick={() =>
                navigate("/customer/workers")
              }
              className="text-blue-600 font-semibold hover:underline"
            >
              View All
            </button>

          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">

            {workers.map((worker) => (

              <div
                key={worker.id}
                className="bg-white rounded-2xl shadow hover:shadow-xl transition overflow-hidden"
              >

                <div className="relative">

                  <img
                    src={
                      worker.profile_image ||
                      "https://placehold.co/400x250"
                    }
                    alt="Worker"
                    className="w-full h-52 object-cover"
                  />

                  <button
                    onClick={() =>
                      toggleFavorite(worker.id)
                    }
                    className="absolute top-4 right-4 bg-white rounded-full p-2 shadow"
                  >
                    <Heart
                      size={22}
                      className={
                        favorites[worker.id]
                          ? "fill-red-500 text-red-500"
                          : "text-gray-400"
                      }
                    />
                  </button>

                </div>

                <div className="p-6">

                  <h3 className="text-xl font-bold">

                    {[
                      worker.first_name,
                      worker.middle_name,
                      worker.last_name,
                    ]
                      .filter(Boolean)
                      .join(" ")}

                  </h3>

                  <p className="text-gray-500 mt-1">

                    {worker.services?.[0]?.category ??
                      "No Category"}

                  </p>

                  <div className="flex items-center gap-2 mt-3">

                    <Star
                      className="text-yellow-500 fill-yellow-500"
                      size={18}
                    />

                    <span className="font-semibold">
                      {ratings[worker.id] ?? 0}
                    </span>

                  </div>

                  <button
                    onClick={() =>
                      navigate(
                        `/customer/workers/${worker.id}`
                      )
                    }
                    className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl transition"
                  >
                    View Profile
                  </button>

                </div>

              </div>

            ))}

          </div>

        </div>

      </div>

    </CustomerLayout>
  );
}