import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import AdminLayout from "../../../layouts/AdminLayout";

import { getWorkers } from "../../../services/workerService";

export default function Workers() {
  const [workers, setWorkers] = useState<any[]>([]);

  useEffect(() => {
    console.log("Workers page loaded");

    loadWorkers();
  }, []);

  async function loadWorkers() {
    console.log("Loading workers...");

    try {
      const data = await getWorkers();

      console.log("Returned data:", data);

      setWorkers(data);
    } catch (error) {
      console.error("Failed to load workers:", error);
    }
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8">Workers Management</h1>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-4 text-left">Name</th>

                <th className="p-4 text-left">Email</th>

                <th className="p-4 text-left">Status</th>

                <th className="p-4 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {workers.map((worker) => (
                <tr key={worker.id} className="border-t">
                  <td className="p-4">
                    {worker.first_name} {worker.last_name}
                  </td>

                  <td className="p-4">{worker.email}</td>

                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        worker.status === "Approved"
                          ? "bg-green-100 text-green-700"
                          : worker.status === "Rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {worker.status}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="flex gap-2">
                      {worker.status === "Pending" && (
                        <Link
                          to={`/workers/${worker.id}`}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg"
                        >
                          Review
                        </Link>
                      )}

                      {worker.status === "Approved" && (
                        <Link
                          to={`/workers/${worker.id}`}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                        >
                          View
                        </Link>
                      )}

                      {worker.status === "Rejected" && (
                        <Link
                          to={`/workers/${worker.id}`}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                        >
                          Details
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {workers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-gray-500">
                    No workers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
