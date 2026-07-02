import { BrowserRouter, Routes, Route } from "react-router-dom";

// ================= AUTH =================
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import RegisterChoice from "../pages/auth/RegisterChoice";

// ================= CUSTOMER AUTH =================
import CustomerLogin from "../pages/auth/customer/Login";
import CustomerRegister from "../pages/auth/customer/Register";

// ================= WORKER AUTH =================
import WorkerRegister from "../pages/auth/worker/Register";

// ================= ADMIN =================
import Dashboard from "../pages/admin/dashboard/Dashboard";
import AdminBookings from "../pages/admin/bookings/Bookings";
import BookingHistory from "../pages/admin/bookings/BookingHistory";

// ================= CUSTOMER =================
import CustomerDashboard from "../pages/customer/dashboard/Dashboard";
import CustomerWorkers from "../pages/customer/workers/Workers";
import WorkerDetails from "../pages/customer/workers/WorkerDetails";
import CustomerBookings from "../pages/customer/bookings/Bookings";
import BookingDetails from "../pages/customer/bookings/BookingDetails";
import BookWorker from "../pages/customer/bookings/BookWorker";
import Profile from "../pages/customer/profile/Profile";
import Notifications from "../pages/customer/notifications/Notifications";

// ================= WORKER =================
import WorkerDashboard from "../pages/worker/dashboard/Dashboard";
import WorkerBookings from "../pages/worker/bookings/Bookings";
import WorkerReviews from "../pages/worker/reviews/Reviews";
import WorkerProfile from "../pages/worker/profile/Profile";

// ================= ADMIN PAGES =================
import Workers from "../pages/auth/worker/Workers";
import Customers from "../pages/auth/customer/Customers";
import CustomerDetails from "../pages/auth/customer/CustomerDetails";

// ================= OTHER =================
import Reports from "../pages/reports/Reports";
import Settings from "../pages/settings/Settings";

import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ================= AUTH ================= */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register-choice" element={<RegisterChoice />} />
        <Route path="/register/customer" element={<CustomerRegister />} />
        <Route path="/register/worker" element={<WorkerRegister />} />

        {/* ================= CUSTOMER AUTH ================= */}
        <Route path="/customer/login" element={<CustomerLogin />} />

        {/* ================= CUSTOMER DASHBOARD ================= */}
        <Route
          path="/customer/dashboard"
          element={
            <ProtectedRoute>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />

        {/* ================= CUSTOMER WORKERS ================= */}
        <Route
          path="/customer/workers"
          element={
            <ProtectedRoute>
              <CustomerWorkers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customer/workers/:id"
          element={
            <ProtectedRoute>
              <WorkerDetails />
            </ProtectedRoute>
          }
        />

        {/* ================= BOOK WORKER ================= */}
        <Route
          path="/customer/book/:workerId"
          element={
            <ProtectedRoute>
              <BookWorker />
            </ProtectedRoute>
          }
        />

        {/* ================= CUSTOMER BOOKINGS ================= */}
        <Route
          path="/customer/bookings"
          element={
            <ProtectedRoute>
              <CustomerBookings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customer/bookings/:id"
          element={
            <ProtectedRoute>
              <BookingDetails />
            </ProtectedRoute>
          }
        />

        {/* ================= CUSTOMER PROFILE ================= */}
        <Route
          path="/customer/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customer/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />

        {/* ================= WORKER DASHBOARD ================= */}
        <Route
          path="/worker/dashboard"
          element={
            <ProtectedRoute>
              <WorkerDashboard />
            </ProtectedRoute>
          }
        />

        {/* ================= WORKER ================= */}
        <Route
          path="/worker/bookings"
          element={
            <ProtectedRoute>
              <WorkerBookings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/worker/reviews"
          element={
            <ProtectedRoute>
              <WorkerReviews />
            </ProtectedRoute>
          }
        />

        <Route
          path="/worker/profile"
          element={
            <ProtectedRoute>
              <WorkerProfile />
            </ProtectedRoute>
          }
        />

        {/* ================= ADMIN DASHBOARD ================= */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/workers"
          element={
            <ProtectedRoute>
              <Workers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/workers/:id"
          element={
            <ProtectedRoute>
              <WorkerDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <Customers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customers/:id"
          element={
            <ProtectedRoute>
              <CustomerDetails />
            </ProtectedRoute>
          }
        />

        {/* ================= ADMIN BOOKINGS ================= */}
        <Route
          path="/bookings"
          element={
            <ProtectedRoute>
              <AdminBookings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/bookings/history"
          element={
            <ProtectedRoute>
              <BookingHistory />
            </ProtectedRoute>
          }
        />

        {/* ================= REPORTS ================= */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />

        {/* ================= SETTINGS ================= */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}