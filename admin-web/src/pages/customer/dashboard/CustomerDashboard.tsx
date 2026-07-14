import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerLayout from "../../../layouts/CustomerLayout";
import {
  Search,
  Star,
} from "lucide-react";

import {
  getFeaturedWorkers,
  getCategories,
  searchDashboard,
} from "../../../services/workerService";

import {
  getWorkerAverageRating,
} from "../../../services/reviewService";

export default function CustomerDashboard() {
  const navigate = useNavigate();

  const [workers, setWorkers] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>({});

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    searchWorkers();
  }, [search]);

  async function loadDashboard() {
    const workerData = await getFeaturedWorkers(6);
    const categoryData = await getCategories();

    setWorkers(workerData);
    setCategories(categoryData);

    const temp: Record<string, number> = {};

    for (const worker of workerData) {
      temp[worker.id] = await getWorkerAverageRating(worker.id);
    }

    setRatings(temp);
  }

  async function searchWorkers() {
    if (!search.trim()) {
      loadDashboard();
      return;
    }

    const result = await searchDashboard(search);

    setWorkers(result);

    const temp: Record<string, number> = {};

    for (const worker of result) {
      temp[worker.id] = await getWorkerAverageRating(worker.id);
    }

    setRatings(temp);
  }

  return (
    <CustomerLayout>
      <div className="space-y-8">
        {/* HERO */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 rounded-3xl p-10 text-white">
          <h1 className="text-4xl font-bold">
            Find Skilled Workers Near You
          </h1>

          <p className="mt-3 text-blue-100 max-w-2xl">
            Search trusted professionals for carpentry,
            electrical, plumbing, painting, welding and more.
          </p>

          <div className="relative mt-8">
            <Search
              className="absolute left-5 top-4 text-gray-400"
              size={22}
            />

            <input
              placeholder="Search workers or services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl py-4 pl-14 pr-5 text-black outline-none"
            />
          </div>
        </div>

        {/* CATEGORIES */}
        <div>
          <h2 className="text-2xl font-bold mb-5">
            Popular Categories
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() =>
                  navigate(
                    `/customer/workers?category=${category}`
                  )
                }
                className="bg-white rounded-2xl shadow hover:shadow-lg transition p-8 flex flex-col items-center"
              >
                <div className="bg-blue-100 p-5 rounded-full">
                  <span className="text-blue-700 font-bold text-xl">
                    {category.charAt(0)}
                  </span>
                </div>

                <p className="mt-4 font-semibold text-center">
                  {category}
                </p>
              </button>
            ))}
          </div>
        </div>

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
                <img
                  src={
                    worker.profile_image ||
                    "https://placehold.co/400x250"
                  }
                  alt="Worker"
                  className="w-full h-52 object-cover"
                />

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