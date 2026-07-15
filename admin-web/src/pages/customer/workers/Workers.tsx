import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";
import {
  searchDashboard,
  getCategories,
  isWorkerAvailable,
} from "../../../services/workerService";

export default function Workers() {
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
  }, [
    search,
    category,
    priceRange,
    rating,
    availability,
  ]);

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

      const data = await searchDashboard(
        search,
        category,
        min,
        max
      );

      let filtered = data;

      // Rating Filter
      if (rating) {
        filtered = filtered.filter((worker: any) => {
          const average = Number(worker.average_rating ?? 0);
          return average >= Number(rating);
        });
      }

      // Availability Filter
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">
            Find Skilled Workers
          </h1>

          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search worker..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded-xl px-4 py-3 w-72"
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border rounded-xl px-4"
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
              className="border rounded-xl px-4"
            >
              <option value="">All Prices</option>
              <option value="100-300">₱100-₱300</option>
              <option value="300-500">₱300-₱500</option>
              <option value="500-1000">₱500-₱1000</option>
              <option value="1000+">₱1000+</option>
            </select>

            <select
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="border rounded-xl px-4"
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
              className="border rounded-xl px-4"
            >
              <option value="">
                All Availability
              </option>

              <option value="today">
                Available Today
              </option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            Loading...
          </div>
        ) : workers.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            No workers found.
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6">
            {workers.map((worker) => (
              <div
                key={worker.id}
                className="bg-white rounded-2xl shadow overflow-hidden"
              >
                <img
                  src={
                    worker.profile_image ||
                    "https://placehold.co/600x350?text=Worker"
                  }
                  alt={`${worker.first_name} ${worker.last_name}`}
                  className="h-52 w-full object-cover"
                />

                <div className="p-6">
                  <h2 className="text-xl font-bold">
                    {worker.first_name} {worker.last_name}
                  </h2>

                  <p className="text-blue-600 mt-1">
                    {worker.category}
                  </p>

                  <p className="text-gray-500 mt-2">
                    {worker.service_name}
                  </p>

                  <p className="text-sm text-gray-400 mt-2 line-clamp-3">
                    {worker.description}
                  </p>

                  <div className="flex justify-between items-center mt-5">
                    <span className="text-green-600 font-bold text-lg">
                      ₱{worker.price}
                    </span>

                    <span className="flex items-center gap-1 text-yellow-500 font-semibold">
                      ⭐ {Number(worker.average_rating ?? 0).toFixed(1)}
                    </span>
                  </div>

                  <Link
                    to={`/customer/workers/${worker.id}`}
                    className="block mt-6 text-center bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl"
                  >
                    View Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}