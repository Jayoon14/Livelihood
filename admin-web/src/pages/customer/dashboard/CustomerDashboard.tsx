import CustomerLayout from "../../../layouts/CustomerLayout";
import {
  Search,
  Hammer,
  Wrench,
  Zap,
  Paintbrush,
  Fan,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFeaturedWorkers } from "../../../services/customerDashboardService";

export default function CustomerDashboard() {
  const navigate = useNavigate();

  const categories = [
    {
      name: "Carpenter",
      icon: Hammer,
    },
    {
      name: "Plumber",
      icon: Wrench,
    },
    {
      name: "Electrician",
      icon: Zap,
    },
    {
      name: "Painter",
      icon: Paintbrush,
    },
    {
      name: "Cleaner",
      icon: Sparkles,
    },
    {
      name: "Aircon",
      icon: Fan,
    },
  ];

  const [workers, setWorkers] = useState<any[]>([]);

  useEffect(() => {
    loadWorkers();
  }, []);

  async function loadWorkers() {
    const data = await getFeaturedWorkers();
    setWorkers(data);
  }

  return (
    <CustomerLayout>
      {/* Welcome */}

      <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold">
          Welcome Back 👋
        </h1>

        <p className="mt-2 text-blue-100">
          Find skilled workers near your area.
        </p>
      </div>

      {/* Search */}

      <div className="bg-white rounded-2xl shadow mt-8 p-5 flex items-center gap-4">
        <Search className="text-gray-400" />

        <input
          type="text"
          placeholder="Search workers..."
          className="w-full outline-none"
        />
      </div>

      {/* Categories */}

      <h2 className="text-2xl font-bold mt-10 mb-5">
        Categories
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
        {categories.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.name}
              className="bg-white rounded-2xl shadow hover:shadow-xl transition p-6 cursor-pointer text-center"
            >
              <Icon
                size={38}
                className="mx-auto text-blue-600"
              />

              <p className="font-semibold mt-3">
                {item.name}
              </p>
            </div>
          );
        })}
      </div>

      {/* Featured Workers */}

      <h2 className="text-2xl font-bold mt-12 mb-5">
        Featured Workers
      </h2>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {workers.map((worker) => (
          <div
            key={worker.id}
            className="bg-white rounded-2xl shadow p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100"></div>

              <div>
                <h3 className="font-bold text-lg">
                  {worker.full_name}
                </h3>

                <p className="text-gray-500">
                  {worker.service_category || "Worker"}
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate(`/customer/workers/${worker.id}`)}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl"
            >
              View Profile
            </button>
          </div>
        ))}
      </div>
    </CustomerLayout>
  );
}