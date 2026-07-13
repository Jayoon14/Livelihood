import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";
import { getWorkers } from "../../../services/workerService";

export default function Workers() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkers();
  }, [search]);

  async function loadWorkers() {
    try {
      setLoading(true);

      const data = await getWorkers(search);

      setWorkers(data);
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

          <input
            type="text"
            placeholder="Search worker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-xl px-4 py-3 w-80"
          />

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

                  <p className="text-sm text-gray-400 mt-2">
                    {worker.description}
                  </p>

                  <div className="flex justify-between items-center mt-5">

                    <span className="text-green-600 font-bold text-lg">
                      ₱{worker.price}
                    </span>

                    <span className="text-yellow-500">
                      ⭐ 5.0
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