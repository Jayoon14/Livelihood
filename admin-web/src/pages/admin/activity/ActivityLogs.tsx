import { useEffect, useState } from "react";
import AdminLayout from "../../../layouts/AdminLayout";
import { getActivityLogs } from "../../../services/activityService";

export default function ActivityLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    const data = await getActivityLogs();
    setLogs(data);
  }

  const filteredLogs = logs.filter((log) => {
    const fullname =
      `${log.user?.first_name ?? ""} ${log.user?.last_name ?? ""}`.toLowerCase();

    return (
      fullname.includes(search.toLowerCase()) ||
      (log.action ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (log.module ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (log.description ?? "").toLowerCase().includes(search.toLowerCase())
    );
  });

  function badgeColor(action: string) {
    switch (action) {
      case "LOGIN":
        return "bg-blue-500";
      case "LOGOUT":
        return "bg-gray-500";
      case "REGISTER":
        return "bg-purple-500";
      case "APPROVED":
        return "bg-green-600";
      case "REJECTED":
        return "bg-red-600";
      default:
        return "bg-yellow-500";
    }
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Activity Logs</h1>

          <input
            type="text"
            placeholder="Search activity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-4 py-2 w-80"
          />
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-4">User</th>
                <th className="text-left p-4">Module</th>
                <th className="text-left p-4">Action</th>
                <th className="text-left p-4">Description</th>
                <th className="text-left p-4">Time</th>
              </tr>
            </thead>

            <tbody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="border-t hover:bg-gray-50">
                    <td className="p-4">
                      {log.user
                        ? `${log.user.first_name} ${log.user.last_name}`
                        : "Unknown"}
                    </td>

                    <td className="p-4">{log.module}</td>

                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-white text-sm ${badgeColor(
                          log.action,
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="p-4">{log.description}</td>

                    <td className="p-4">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-gray-500">
                    No activity found.
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
