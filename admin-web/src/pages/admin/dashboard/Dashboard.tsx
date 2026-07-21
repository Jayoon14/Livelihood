import { useEffect, useState } from "react";

import AdminLayout from "../../../layouts/AdminLayout";
import DashboardCard from "../../../components/layout/DashboardCard";

import {
  getDashboardStats,
  getRecentWorkers,
  getPendingWorkers,
  getRecentBookings,
  getBookingStatusCounts,
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

  const [recentBookings, setRecentBookings] = useState<any[]>([]);

  const [bookingStatus, setBookingStatus] = useState({
    Pending: 0,
    Approved: 0,
    Completed: 0,
    Cancelled: 0,
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const [dashboardStats, recentWorkers, pending, bookings, status] =
      await Promise.all([
        getDashboardStats(),
        getRecentWorkers(),
        getPendingWorkers(),
        getRecentBookings(),
        getBookingStatusCounts(),
      ]);

    setStats(dashboardStats);
    setWorkers(recentWorkers);
    setPendingWorkers(pending);
    setRecentBookings(bookings);
    setBookingStatus(status);
  }

  return (
    <AdminLayout>
      <div className="p-8">
        {/* DASHBOARD CARDS */}

        <div className="grid grid-cols-4 gap-6">
          <DashboardCard title="Workers" value={stats.workers.toString()} />

          <DashboardCard title="Customers" value={stats.customers.toString()} />

          <DashboardCard title="Bookings" value={stats.bookings.toString()} />

          <DashboardCard
            title="Pending Workers"
            value={stats.pending.toString()}
          />
        </div>

        {/* BOOKING ANALYTICS */}

        <div className="grid md:grid-cols-4 gap-5 mt-8">
          <div className="bg-yellow-100 rounded-xl p-5">
            <h3 className="font-semibold">Pending</h3>

            <p className="text-3xl font-bold">{bookingStatus.Pending}</p>
          </div>

          <div className="bg-green-100 rounded-xl p-5">
            <h3 className="font-semibold">Approved</h3>

            <p className="text-3xl font-bold">{bookingStatus.Approved}</p>
          </div>

          <div className="bg-blue-100 rounded-xl p-5">
            <h3 className="font-semibold">Completed</h3>

            <p className="text-3xl font-bold">{bookingStatus.Completed}</p>
          </div>

          <div className="bg-red-100 rounded-xl p-5">
            <h3 className="font-semibold">Cancelled</h3>

            <p className="text-3xl font-bold">{bookingStatus.Cancelled}</p>
          </div>
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

                    <td className="p-3">{worker.email}</td>

                    <td className="p-3">{worker.status}</td>
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
          <h2 className="text-xl font-bold mb-5">Pending Worker Approvals</h2>

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

                    <td className="p-3">{worker.email}</td>

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

        {/* RECENT BOOKINGS */}

        <div className="mt-10 bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-bold mb-5">Recent Bookings</h2>

          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">Customer</th>

                <th className="text-left p-3">Worker</th>

                <th className="text-left p-3">Date</th>

                <th className="text-left p-3">Status</th>
              </tr>
            </thead>

            <tbody>
              {recentBookings.length > 0 ? (
                recentBookings.map((booking) => (
                  <tr key={booking.id} className="border-b">
                    <td className="p-3">
                      {booking.customer?.first_name}{" "}
                      {booking.customer?.last_name}
                    </td>

                    <td className="p-3">
                      {booking.worker?.first_name} {booking.worker?.last_name}
                    </td>

                    <td className="p-3">{booking.booking_date}</td>

                    <td className="p-3">{booking.status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center p-5">
                    No bookings found.
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
