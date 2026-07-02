import { useEffect, useState } from "react";
import AdminLayout from "../../../layouts/AdminLayout";

import {
  getPendingWorkers,
  approveWorker,
  rejectWorker,
} from "../../../services/workerApprovalService";

export default function Workers() {
  const [workers, setWorkers] = useState<any[]>([]);

  useEffect(() => {
    loadWorkers();
  }, []);

  async function loadWorkers() {
    const data = await getPendingWorkers();
    setWorkers(data);
  }

  async function approve(id: string) {
    await approveWorker(id);
    loadWorkers();
  }

  async function reject(id: string) {
    await rejectWorker(id);
    loadWorkers();
  }

  return (
    <AdminLayout>

      <h1 className="text-3xl font-bold mb-8">
        Pending Worker Approvals
      </h1>

      <div className="bg-white rounded-xl shadow overflow-hidden">

        <table className="w-full">

          <thead className="bg-slate-100">

            <tr>

              <th className="p-4 text-left">
                Name
              </th>

              <th className="p-4 text-left">
                Email
              </th>

              <th className="p-4 text-left">
                Status
              </th>

              <th className="p-4 text-left">
                Action
              </th>

            </tr>

          </thead>

          <tbody>

            {workers.map((worker) => (

              <tr
                key={worker.id}
                className="border-t"
              >

                <td className="p-4">
                  {worker.full_name}
                </td>

                <td className="p-4">
                  {worker.email}
                </td>

                <td className="p-4">
                  {worker.status}
                </td>

                <td className="p-4 flex gap-2">

                  <button
                    onClick={() => approve(worker.id)}
                    className="bg-green-600 text-white px-3 py-2 rounded"
                  >
                    Approve
                  </button>

                  <button
                    onClick={() => reject(worker.id)}
                    className="bg-red-600 text-white px-3 py-2 rounded"
                  >
                    Reject
                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </AdminLayout>
  );
}