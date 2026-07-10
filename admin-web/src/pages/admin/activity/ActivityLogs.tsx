import { useEffect, useState } from "react";
import AdminLayout from "../../../layouts/AdminLayout";
import { getActivityLogs } from "../../../services/activityService";

export default function ActivityLogs() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    const data = await getActivityLogs();
    setLogs(data);
  }

  return (
    <AdminLayout>
      <div className="p-8">

        <h1 className="text-3xl font-bold mb-8">
          Activity Logs
        </h1>

        <div className="bg-white rounded-xl shadow overflow-hidden">

          <table className="w-full">

            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 text-left">User</th>
                <th className="p-4 text-left">Action</th>
                <th className="p-4 text-left">Module</th>
                <th className="p-4 text-left">Description</th>
                <th className="p-4 text-left">Date</th>
              </tr>
            </thead>

            <tbody>

              {logs.map((log) => (
                <tr key={log.id} className="border-t">

                  <td className="p-4">
                    {log.user?.first_name} {log.user?.last_name}
                  </td>

                  <td className="p-4">
                    {log.action}
                  </td>

                  <td className="p-4">
                    {log.module}
                  </td>

                  <td className="p-4">
                    {log.description}
                  </td>

                  <td className="p-4">
                    {new Date(log.created_at).toLocaleString()}
                  </td>

                </tr>
              ))}

            </tbody>

          </table>

        </div>

      </div>
    </AdminLayout>
  );
}