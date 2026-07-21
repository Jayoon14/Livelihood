import { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";

import {
  getReportSummary,
  getMonthlyBookings,
  getMonthlyRevenue,
} from "../../services/reportService";

import { exportToPDF, exportToExcel } from "../../services/exportService";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

export default function Reports() {
  const [summary, setSummary] = useState({
    workers: 0,
    customers: 0,
    bookings: 0,
    completed: 0,
  });

  const [chart, setChart] = useState({
    labels: [] as string[],
    data: [] as number[],
  });

  const [revenueChart, setRevenueChart] = useState({
    labels: [] as string[],
    data: [] as number[],
  });

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      const data = await getReportSummary();
      setSummary(data);

      const monthly = await getMonthlyBookings();
      setChart(monthly);

      const revenue = await getMonthlyRevenue();
      setRevenueChart(revenue);
    } catch (error) {
      console.error("Error loading reports:", error);
    }
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Reports Dashboard</h1>

        {/* EXPORT BUTTONS */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => exportToPDF(summary)}
            className="
              bg-red-600 
              hover:bg-red-700 
              text-white 
              px-5 
              py-3 
              rounded-lg
            "
          >
            Export PDF
          </button>

          <button
            onClick={() => exportToExcel(summary)}
            className="
              bg-green-600 
              hover:bg-green-700 
              text-white 
              px-5 
              py-3 
              rounded-lg
            "
          >
            Export Excel
          </button>
        </div>

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

        {/* MONTHLY BOOKINGS CHART */}
        <div className="mt-10 bg-white rounded-xl shadow p-8">
          <h2 className="text-2xl font-bold mb-6">
            Monthly Bookings Analytics
          </h2>

          <Bar
            data={{
              labels: chart.labels,

              datasets: [
                {
                  label: "Monthly Bookings",

                  data: chart.data,

                  backgroundColor: "#3B82F6",

                  borderRadius: 8,
                },
              ],
            }}
            options={{
              responsive: true,

              plugins: {
                legend: {
                  display: true,
                  position: "top",
                },
              },
            }}
          />
        </div>

        {/* MONTHLY REVENUE CHART */}
        <div className="mt-10 bg-white rounded-xl shadow p-8">
          <h2 className="text-2xl font-bold mb-6">Monthly Revenue</h2>

          <Bar
            data={{
              labels: revenueChart.labels,

              datasets: [
                {
                  label: "Revenue (₱)",

                  data: revenueChart.data,

                  backgroundColor: "#10B981",

                  borderRadius: 8,
                },
              ],
            }}
            options={{
              responsive: true,

              plugins: {
                legend: {
                  display: true,
                  position: "top",
                },
              },
            }}
          />
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
