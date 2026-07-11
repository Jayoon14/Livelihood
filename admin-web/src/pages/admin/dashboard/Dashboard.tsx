import { useEffect, useState } from "react";

import AdminLayout from "../../../layouts/AdminLayout";
import DashboardCard from "../../../components/layout/DashboardCard";

import {
  getDashboardStats,
  getRecentWorkers,
  getPendingWorkers,
} from "../../../services/dashboardService";

export default function Dashboard() {
  const [stats, setStats] = useState({
    workers: 0,
    customers: 0,
    bookings: 0,
    pending: 0,
  });

  const [workers, setWorkers] = useState<any[]>([]);
  const [pendingWorkers, setPendingWorkers] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const dashboardStats = await getDashboardStats();
    const recentWorkers = await getRecentWorkers();
    const pending = await getPendingWorkers();

    setStats(dashboardStats);
    setWorkers(recentWorkers);
    setPendingWorkers(pending);
  }

  return (
    <AdminLayout>
      <div className="p-8">

        {/* DASHBOARD CARDS */}
        <div className="grid grid-cols-4 gap-6">

          <DashboardCard
            title="Workers"
            value={stats.workers.toString()}
          />

          {/* UPDATED: Employers -> Customers */}
          <DashboardCard
            title="Customers"
            value={stats.customers.toString()}
          />

          <DashboardCard
            title="Bookings"
            value={stats.bookings.toString()}
          />

          <DashboardCard
            title="Pending Workers"
            value={stats.pending.toString()}
          />

        </div>


        {/* RECENT WORKERS */}
        <div className="mt-10 bg-white rounded-2xl shadow p-6">

          <h2 className="text-xl font-bold mb-5">
            Recent Worker Registrations
          </h2>


          <table className="w-full">

            <thead>
              <tr className="border-b">
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>


            <tbody>
              {workers.length > 0 ? (
                workers.map((worker) => (
                  <tr key={worker.id} className="border-b">

                    <td className="p-3">
                      {worker.first_name} {worker.last_name}
                    </td>

                    <td className="p-3">
                      {worker.email}
                    </td>

                    <td className="p-3">
                      {worker.status}
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center p-5">
                    No workers found.
                  </td>
                </tr>
              )}
            </tbody>


          </table>

        </div>



        {/* PENDING WORKERS */}
        <div className="mt-10 bg-white rounded-2xl shadow p-6">

          <h2 className="text-xl font-bold mb-5">
            Pending Worker Approvals
          </h2>


          <table className="w-full">

            <thead>
              <tr className="border-b">
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>


            <tbody>
              {pendingWorkers.length > 0 ? (
                pendingWorkers.map((worker) => (
                  <tr key={worker.id} className="border-b">

                    <td className="p-3">
                      {worker.first_name} {worker.last_name}
                    </td>

                    <td className="p-3">
                      {worker.email}
                    </td>

                    <td className="p-3 text-yellow-600 font-semibold">
                      {worker.status}
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center p-5">
                    No pending workers.
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