import { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import { getReportSummary } from "../../services/reportService";

export default function Reports() {
  const [summary, setSummary] = useState({
    workers: 0,
    customers: 0,
    bookings: 0,
    completed: 0,
  });

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    const data = await getReportSummary();
    setSummary(data);
  }

  return (
    <AdminLayout>
      <div className="p-8">

        <h1 className="text-3xl font-bold mb-8">
          Reports Dashboard
        </h1>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-4 gap-6">

          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-gray-500">Total Workers</p>
            <h2 className="text-4xl font-bold mt-3 text-blue-600">
              {summary.workers}
            </h2>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-gray-500">Total Customers</p>
            <h2 className="text-4xl font-bold mt-3 text-green-600">
              {summary.customers}
            </h2>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-gray-500">Total Bookings</p>
            <h2 className="text-4xl font-bold mt-3 text-purple-600">
              {summary.bookings}
            </h2>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-gray-500">Completed Bookings</p>
            <h2 className="text-4xl font-bold mt-3 text-orange-600">
              {summary.completed}
            </h2>
          </div>

        </div>

        {/* CHART PLACEHOLDER */}
        <div className="mt-10 bg-white rounded-xl shadow p-8">
          <h2 className="text-2xl font-bold mb-4">Analytics</h2>

          <div className="h-96 flex items-center justify-center border-2 border-dashed rounded-lg">
            <p className="text-gray-400 text-lg">
              Charts will be displayed here.
            </p>
          </div>
        </div>

        {/* SYSTEM SUMMARY */}
        <div className="mt-10 bg-white rounded-xl shadow p-8">
          <h2 className="text-2xl font-bold mb-4">System Summary</h2>

          <table className="w-full">
            <tbody>

              <tr className="border-b">
                <td className="p-4 font-semibold">Registered Workers</td>
                <td className="p-4">{summary.workers}</td>
              </tr>

              <tr className="border-b">
                <td className="p-4 font-semibold">Registered Customers</td>
                <td className="p-4">{summary.customers}</td>
              </tr>

              <tr className="border-b">
                <td className="p-4 font-semibold">Total Bookings</td>
                <td className="p-4">{summary.bookings}</td>
              </tr>

              <tr>
                <td className="p-4 font-semibold">Completed Services</td>
                <td className="p-4">{summary.completed}</td>
              </tr>

            </tbody>
          </table>
        </div>

      </div>
    </AdminLayout>
  );
}