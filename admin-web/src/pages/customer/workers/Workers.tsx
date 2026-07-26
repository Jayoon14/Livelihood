import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";

import { Search, Users, Star, Filter, BadgeCheck, HardHat } from "lucide-react";

import {
  searchDashboard,
  getCategories,
  isWorkerAvailable,
} from "../../../services/workerService";

const heading = { fontFamily: "'Sora', sans-serif" };
const inter = { fontFamily: "'Inter', sans-serif" };

const selectClass =
  "rounded-2xl border border-slate-200 px-5 py-4 outline-none bg-white text-slate-700 transition-colors focus:border-[#0A1930] focus:ring-2 focus:ring-[#0A1930]/10";

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
      <div className="p-8" style={inter}>
        {/* HERO */}

        <div
          className="relative rounded-3xl overflow-hidden shadow-xl mb-8"
          style={{
            background:
              "linear-gradient(120deg,#2B3BF5 0%,#5B3DF0 35%,#3B7EF0 70%,#17BFE0 100%)",
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          <div className="pointer-events-none absolute -right-10 top-1/4 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute left-1/3 -bottom-16 h-52 w-52 rounded-full bg-white/10 blur-2xl" />

          <div className="relative z-10 px-10 py-12 flex flex-col lg:flex-row justify-between items-center gap-10">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white" style={heading}>
                Find Trusted Workers
              </h1>

              <p className="text-slate-300 text-lg mt-4 max-w-2xl">
                Browse verified skilled workers, compare ratings, check prices,
                and hire professionals with confidence.
              </p>

              <div className="flex flex-wrap gap-6 mt-10">
                <div className="bg-white/10 border border-white/10 rounded-2xl px-6 py-5 backdrop-blur">
                  <div className="flex items-center gap-3 text-white">
                    <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                      <Users size={22} className="text-[#0A1930]" />
                    </div>

                    <div>
                      <h2 className="text-3xl font-bold" style={heading}>
                        {workers.length}
                      </h2>

                      <p className="text-slate-300 text-sm">Workers Found</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 border border-white/10 rounded-2xl px-6 py-5 backdrop-blur">
                  <div className="flex items-center gap-3 text-white">
                    <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                      <Filter size={20} className="text-[#0A1930]" />
                    </div>

                    <div>
                      <h2 className="text-3xl font-bold" style={heading}>
                        {categories.length}
                      </h2>

                      <p className="text-slate-300 text-sm">Categories</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex items-center justify-center w-64 h-64 rounded-full bg-white/10 border border-white/10 backdrop-blur shrink-0">
              <HardHat size={110} className="text-amber-400" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* FILTERS */}

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-slate-100">
              <Search className="text-blue-600 w-5 h-5" />
            </div>

            <h2 className="text-xl font-bold text-slate-900" style={heading}>
              Search &amp; Filters
            </h2>
          </div>

          <div className="grid xl:grid-cols-5 md:grid-cols-2 gap-5">
            <input
              type="text"
              placeholder="Search worker..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={selectClass}
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={selectClass}
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
              className={selectClass}
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
              className={selectClass}
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
              className={selectClass}
            >
              <option value="">All Availability</option>

              <option value="today">Available Today</option>
            </select>
          </div>
        </div>

        {/* RESULT HEADER */}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900" style={heading}>
            Available Workers
          </h2>

          <div className="bg-blue-50 text-blue-700 px-5 py-2.5 rounded-full font-semibold flex items-center gap-2 text-sm">
            <BadgeCheck size={17} />
            {workers.length} Workers Found
          </div>
        </div>
        {/* WORKER CONTENT */}

        {loading ? (
          <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-7">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-pulse"
              >
                <div className="h-56 bg-slate-100" />

                <div className="p-6 space-y-4">
                  <div className="h-6 bg-slate-100 rounded-lg w-2/3" />
                  <div className="h-4 bg-slate-100 rounded-lg w-1/2" />
                  <div className="h-4 bg-slate-100 rounded-lg w-full" />
                  <div className="h-4 bg-slate-100 rounded-lg w-5/6" />

                  <div className="grid grid-cols-2 gap-3 pt-3">
                    <div className="h-20 bg-slate-100 rounded-2xl" />
                    <div className="h-20 bg-slate-100 rounded-2xl" />
                  </div>

                  <div className="h-12 bg-slate-100 rounded-2xl" />
                  <div className="h-12 bg-slate-100 rounded-2xl" />
                </div>
              </div>
            ))}
          </div>
        ) : workers.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm py-20 px-6 text-center">
            <div className="mx-auto w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center">
              <Search size={38} className="text-blue-600" />
            </div>

            <h2 className="text-2xl font-bold mt-6 text-slate-900" style={heading}>
              No workers found
            </h2>

            <p className="text-slate-500 mt-3 max-w-lg mx-auto">
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
              className="mt-7 bg-[#0A1930] hover:bg-[#12294D] text-white px-7 py-3 rounded-2xl font-semibold transition-colors"
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
                    border-slate-100
                    shadow-sm
                    overflow-hidden
                    hover:-translate-y-2
                    hover:shadow-2xl
                    transition-all
                    duration-300
                  "
                >
                  {/* IMAGE */}

                  <div className="relative h-60 overflow-hidden bg-slate-100">
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
                      <span className="inline-flex items-center gap-1 bg-white/95 text-amber-600 px-4 py-2 rounded-full font-bold shadow-lg text-sm">
                        <Star size={16} fill="currentColor" />
                        {averageRating}
                      </span>
                    </div>

                    <div className="absolute bottom-5 left-5 right-5">
                      <h2 className="text-xl font-bold text-white" style={heading}>
                        {worker.first_name} {worker.last_name}
                      </h2>

                      <p className="text-slate-200 mt-1 font-medium text-sm">
                        {worker.category || "Skilled Worker"}
                      </p>
                    </div>
                  </div>

                  {/* CARD BODY */}

                  <div className="p-6">
                    <div className="flex items-center flex-wrap gap-2 mb-4">
                      <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-semibold">
                        <BadgeCheck size={14} />
                        Verified Worker
                      </span>

                      <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Available
                      </span>

                      {worker.service_name && (
                        <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full text-xs font-semibold">
                          {worker.service_name}
                        </span>
                      )}
                    </div>

                    <p className="text-slate-500 mt-5 leading-7 line-clamp-3 min-h-[84px] text-sm">
                      {worker.description ||
                        "Professional and reliable worker ready to provide quality service."}
                    </p>

                    {/* DETAILS */}

                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                        <p className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">
                          Completed Jobs
                        </p>

                        <p className="text-2xl font-bold text-emerald-700 mt-1" style={heading}>
                          {worker.completed_jobs ?? 0}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
                        <p className="text-xs uppercase tracking-wide text-amber-700 font-semibold">
                          Rating
                        </p>

                        <div className="flex items-center gap-2 mt-1">
                          <Star
                            size={20}
                            className="text-amber-500"
                            fill="currentColor"
                          />

                          <p className="text-2xl font-bold text-amber-700" style={heading}>
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
                          bg-[#0A1930]
                          hover:bg-[#12294D]
                          text-white
                          py-3.5
                          rounded-2xl
                          font-semibold
                          shadow-sm
                          transition-colors
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
                          border-slate-200
                          hover:border-[#0A1930]
                          hover:bg-slate-50
                          text-slate-700
                          py-3.5
                          rounded-2xl
                          font-semibold
                          transition-colors
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