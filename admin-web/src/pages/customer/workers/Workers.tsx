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

        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">

          <h1 className="text-3xl font-bold">
            Available Workers
          </h1>

          <input
            type="text"
            placeholder="Search worker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-xl px-4 py-3 w-full md:w-80"
          />

        </div>

        {loading ? (

          <div className="text-center py-20">
            Loading workers...
          </div>

        ) : workers.length === 0 ? (

          <div className="text-center py-20 text-gray-500">
            No workers found.
          </div>

        ) : (

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

            {workers.map((worker) => (

              <div
                key={worker.id}
                className="bg-white rounded-2xl shadow p-6"
              >

                <img
                  src={
                    worker.profile_image ||
                    "https://placehold.co/150x150"
                  }
                  alt=""
                  className="w-24 h-24 rounded-full mx-auto object-cover"
                />

                <h2 className="text-xl font-bold text-center mt-4">

                  {worker.first_name} {worker.last_name}

                </h2>

                <p className="text-center text-gray-500">

                  {worker.email}

                </p>

                <p className="text-center mt-2">

                  Status:

                  <span className="ml-2 text-green-600 font-semibold">

                    {worker.status}

                  </span>

                </p>

                <Link
                  to={`/customer/workers/${worker.id}`}
                  className="block mt-6 text-center bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl"
                >
                  View Details
                </Link>

              </div>

            ))}

          </div>

        )}

      </div>
    </CustomerLayout>
  );
}