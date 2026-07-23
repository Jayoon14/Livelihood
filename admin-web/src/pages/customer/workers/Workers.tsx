import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";

import { Search, Users, Star, Filter, BadgeCheck } from "lucide-react";

import {
  searchDashboard,
  getCategories,
  isWorkerAvailable,
} from "../../../services/workerService";

export default function Workers() {
  const navigate = useNavigate();

  const [workers, setWorkers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [rating, setRating] = useState("");
  const [availability, setAvailability] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadWorkers();
  }, [search, category, priceRange, rating, availability]);

  async function loadCategories() {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error(error);
    }
  }

  async function loadWorkers() {
    try {
      setLoading(true);

      let min: number | undefined;
      let max: number | undefined;

      switch (priceRange) {
        case "100-300":
          min = 100;
          max = 300;
          break;

        case "300-500":
          min = 300;
          max = 500;
          break;

        case "500-1000":
          min = 500;
          max = 1000;
          break;

        case "1000+":
          min = 1000;
          break;
      }

      const data = await searchDashboard(search, category, min, max);

      let filtered = data;

      if (rating) {
        filtered = filtered.filter((worker: any) => {
          const average = Number(worker.average_rating ?? 0);

          return average >= Number(rating);
        });
      }

      if (availability === "today") {
        const availableWorkers = [];

        for (const worker of filtered) {
          const available = await isWorkerAvailable(worker.id);

          if (available) {
            availableWorkers.push(worker);
          }
        }

        filtered = availableWorkers;
      }

      setWorkers(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <CustomerLayout>
      <div className="p-8">
        {/* HERO */}

        <div className="rounded-3xl overflow-hidden bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 shadow-xl mb-8">
          <div className="px-10 py-12 flex flex-col lg:flex-row justify-between items-center gap-10">
            <div>
              <h1 className="text-5xl font-bold text-white">
                Find Trusted Workers
              </h1>

              <p className="text-blue-100 text-lg mt-4 max-w-2xl">
                Browse verified skilled workers, compare ratings, check prices,
                and hire professionals with confidence.
              </p>

              <div className="flex flex-wrap gap-8 mt-10">
                <div className="bg-white/15 rounded-2xl px-6 py-5 backdrop-blur">
                  <div className="flex items-center gap-3 text-white">
                    <Users size={28} />

                    <div>
                      <h2 className="text-3xl font-bold">{workers.length}</h2>

                      <p className="text-blue-100">Workers Found</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/15 rounded-2xl px-6 py-5 backdrop-blur">
                  <div className="flex items-center gap-3 text-white">
                    <Filter size={28} />

                    <div>
                      <h2 className="text-3xl font-bold">
                        {categories.length}
                      </h2>

                      <p className="text-blue-100">Categories</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex items-center justify-center w-72 h-72 rounded-full bg-white/10 backdrop-blur">
              <span className="text-[140px]">👷</span>
            </div>
          </div>
        </div>

        {/* FILTERS */}

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Search className="text-blue-600" />

            <h2 className="text-2xl font-bold">Search & Filters</h2>
          </div>

          <div className="grid xl:grid-cols-5 md:grid-cols-2 gap-5">
            <input
              type="text"
              placeholder="Search worker..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-2xl border border-gray-200 px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none"
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-2xl border border-gray-200 px-5 py-4"
            >
              <option value="">All Categories</option>

              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              className="rounded-2xl border border-gray-200 px-5 py-4"
            >
              <option value="">All Prices</option>

              <option value="100-300">₱100 - ₱300</option>

              <option value="300-500">₱300 - ₱500</option>

              <option value="500-1000">₱500 - ₱1000</option>

              <option value="1000+">₱1000+</option>
            </select>

            <select
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="rounded-2xl border border-gray-200 px-5 py-4"
            >
              <option value="">All Ratings</option>

              <option value="5">★★★★★</option>

              <option value="4">★★★★☆ &amp; up</option>

              <option value="3">★★★☆☆ &amp; up</option>

              <option value="2">★★☆☆☆ &amp; up</option>

              <option value="1">★☆☆☆☆ &amp; up</option>
            </select>

            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="rounded-2xl border border-gray-200 px-5 py-4"
            >
              <option value="">All Availability</option>

              <option value="today">Available Today</option>
            </select>
          </div>
        </div>

        {/* RESULT HEADER */}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">Available Workers</h2>

          <div className="bg-blue-100 text-blue-700 px-5 py-3 rounded-full font-semibold flex items-center gap-2">
            <BadgeCheck size={18} />
            {workers.length} Workers Found
          </div>
        </div>
        {/* WORKER CONTENT */}

        {loading ? (
          <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-7">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-pulse"
              >
                <div className="h-56 bg-gray-200" />

                <div className="p-6 space-y-4">
                  <div className="h-6 bg-gray-200 rounded-lg w-2/3" />
                  <div className="h-4 bg-gray-200 rounded-lg w-1/2" />
                  <div className="h-4 bg-gray-200 rounded-lg w-full" />
                  <div className="h-4 bg-gray-200 rounded-lg w-5/6" />

                  <div className="grid grid-cols-2 gap-3 pt-3">
                    <div className="h-20 bg-gray-200 rounded-2xl" />
                    <div className="h-20 bg-gray-200 rounded-2xl" />
                  </div>

                  <div className="h-12 bg-gray-200 rounded-2xl" />
                  <div className="h-12 bg-gray-200 rounded-2xl" />
                </div>
              </div>
            ))}
          </div>
        ) : workers.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm py-20 px-6 text-center">
            <div className="mx-auto w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center">
              <Search size={42} className="text-blue-600" />
            </div>

            <h2 className="text-3xl font-bold mt-6">No workers found</h2>

            <p className="text-gray-500 mt-3 max-w-lg mx-auto">
              No workers matched your current search and filters. Try changing
              the category, rating, price range, or availability.
            </p>

            <button
              onClick={() => {
                setSearch("");
                setCategory("");
                setPriceRange("");
                setRating("");
                setAvailability("");
              }}
              className="mt-7 bg-blue-600 hover:bg-blue-700 text-white px-7 py-3 rounded-2xl font-semibold transition"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid xl:grid-cols-3 md:grid-cols-2 gap-7">
            {workers.map((worker) => {
              const averageRating = Number(worker.average_rating ?? 0).toFixed(
                1,
              );

              return (
                <div
                  key={worker.id}
                  className="
                    group
                    bg-white
                    rounded-3xl
                    border
                    border-gray-100
                    shadow-sm
                    overflow-hidden
                    hover:-translate-y-2
                    hover:shadow-2xl
                    transition-all
                    duration-300
                  "
                >
                  {/* IMAGE */}

                  <div className="relative h-60 overflow-hidden bg-gray-100">
                    <img
                      src={
                        worker.profile_picture ||
                        "https://placehold.co/600x400?text=Worker"
                      }
                      alt={`${worker.first_name} ${worker.last_name}`}
                      className="
                        w-full
                        h-full
                        object-cover
                        group-hover:scale-105
                        transition-transform
                        duration-500
                      "
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    <div className="absolute top-4 right-4">
                      <span className="inline-flex items-center gap-1 bg-white/95 text-yellow-600 px-4 py-2 rounded-full font-bold shadow-lg">
                        <Star size={17} fill="currentColor" />
                        {averageRating}
                      </span>
                    </div>

                    <div className="absolute bottom-5 left-5 right-5">
                      <h2 className="text-2xl font-bold text-white">
                        {worker.first_name} {worker.last_name}
                      </h2>

                      <p className="text-blue-100 mt-1 font-medium">
                        {worker.category || "Skilled Worker"}
                      </p>
                    </div>
                  </div>

                  {/* CARD BODY */}

                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">

                    <span className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-sm font-semibold">
                      <BadgeCheck size={16} />
                      Verified Worker
                    </span>

                    <span className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-semibold">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      Available
                    </span>
                      {worker.service_name && (
                        <span className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium">
                          {worker.service_name}
                        </span>
                      )}
                    </div>

                    <p className="text-gray-500 mt-5 leading-7 line-clamp-3 min-h-[84px]">
                      {worker.description ||
                        "Professional and reliable worker ready to provide quality service."}
                    </p>

                    {/* DETAILS */}

                    <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="rounded-2xl bg-green-50 border border-green-100 p-4">
                      <p className="text-xs uppercase tracking-wide text-green-700 font-semibold">
                        Completed Jobs
                      </p>

                      <p className="text-2xl font-bold text-green-700 mt-1">
                        {worker.completed_jobs ?? 0}
                      </p>
                    </div>

                      <div className="rounded-2xl bg-yellow-50 border border-yellow-100 p-4">
                        <p className="text-xs uppercase tracking-wide text-yellow-700 font-semibold">
                          Rating
                        </p>

                        <div className="flex items-center gap-2 mt-1">
                          <Star
                            size={22}
                            className="text-yellow-500"
                            fill="currentColor"
                          />

                          <p className="text-2xl font-bold text-yellow-700">
                            {averageRating}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ACTIONS */}

                    <div className="mt-6 space-y-3">
                      <Link
                        to={`/customer/workers/${worker.id}`}
                        className="
                          block
                          w-full
                          text-center
                          bg-blue-600
                          hover:bg-blue-700
                          text-white
                          py-3.5
                          rounded-2xl
                          font-semibold
                          shadow-sm
                          transition
                        "
                      >
                        View Worker Profile
                      </Link>

                      <button
                        onClick={() =>
                          navigate(`/customer/compare?worker=${worker.id}`)
                        }
                        className="
                          w-full
                          border
                          border-gray-300
                          hover:border-blue-500
                          hover:bg-blue-50
                          hover:text-blue-700
                          text-gray-700
                          py-3.5
                          rounded-2xl
                          font-semibold
                          transition
                        "
                      >
                        Compare Worker
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
