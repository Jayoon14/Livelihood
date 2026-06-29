import { useEffect, useState } from "react";
import {
  getWorkers,
  approveWorker,
  rejectWorker,
} from "../../../services/workerService";
import { Link } from "react-router-dom";

export default function Workers() {
  const [workers, setWorkers] = useState<any[]>([]);

  useEffect(() => {
    loadWorkers();
  }, []);

  async function loadWorkers() {
    const data = await getWorkers();
    setWorkers(data);
  }

  async function handleApprove(id: string) {
    await approveWorker(id);
    loadWorkers();
  }

  async function handleReject(id: string) {
    await rejectWorker(id);
    loadWorkers();
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Workers</h1>

        <input
          placeholder="Search worker..."
          className="border rounded-lg px-4 py-2 w-80"
        />
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Email</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {workers.map((worker) => (
              <tr key={worker.id} className="border-b">
                <td className="p-4">{worker.full_name}</td>

                <td className="p-4">{worker.email}</td>

                <td className="p-4">{worker.status}</td>

                <td className="p-4">
                  <div className="flex gap-2">
                    <Link
                      to={`/workers/${worker.id}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                    >
                      View
                    </Link>

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
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}