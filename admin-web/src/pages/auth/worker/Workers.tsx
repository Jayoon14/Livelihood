import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import AdminLayout from "../../../layouts/AdminLayout";

import {
  getWorkers,
  approveWorker,
  rejectWorker,
} from "../../../services/workerService";

export default function Workers() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");

  useEffect(() => {
    loadWorkers();
  }, [status]);

  async function loadWorkers() {
    const data = await getWorkers(status);
    setWorkers(data);
  }

  async function handleApprove(id: string) {
    if (!window.confirm("Approve this worker?")) return;

    await approveWorker(id);
    loadWorkers();
  }

  async function handleReject(id: string) {
    if (!window.confirm("Reject this worker?")) return;

    await rejectWorker(id);
    loadWorkers();
  }

  const filteredWorkers = useMemo(() => {
    return workers.filter((worker) =>
      worker.full_name?.toLowerCase().includes(search.toLowerCase())
    );
  }, [workers, search]);

  return (
    <AdminLayout>

      <div className="p-8">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">

          <h1 className="text-3xl font-bold">
            Workers Management
          </h1>

          <div className="flex gap-4">

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search worker..."
              className="border rounded-lg px-4 py-2 w-72"
            />

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border rounded-lg px-4 py-2"
            >
              <option>All</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>

          </div>

        </div>

        {/* TABLE */}
        <div className="bg-white rounded-xl shadow overflow-hidden">

          <table className="w-full">

            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 text-left">Name</th>
                <th className="p-4 text-left">Email</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Action</th>
              </tr>
            </thead>

            <tbody>

              {filteredWorkers.length > 0 ? (
                filteredWorkers.map((worker) => (
                  <tr key={worker.id} className="border-b">

                    <td className="p-4">{worker.full_name}</td>
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

                        <Link
                          to={`/workers/${worker.id}`}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                        >
                          View
                        </Link>

                        {worker.status === "Pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(worker.id)}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                            >
                              Approve
                            </button>

                            <button
                              onClick={() => handleReject(worker.id)}
                              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                            >
                              Reject
                            </button>
                          </>
                        )}

                      </div>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-10">
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