import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

import CustomerLogin from "../pages/auth/customer/Login";
import CustomerRegister from "../pages/auth/customer/Register";
import WorkerRegister from "../pages/auth/worker/Register";
import RegisterChoice from "../pages/auth/RegisterChoice";

import Dashboard from "../pages/admin/dashboard/Dashboard";
import CustomerDashboard from "../pages/admin/dashboard/Dashboard";

import Workers from "../pages/auth/worker/Workers";
import WorkerDetails from "../pages/customer/workers/WorkerDetails";

import Customers from "../pages/auth/customer/Customers";
import CustomerDetails from "../pages/auth/customer/CustomerDetails";

import CustomerBookings from "../pages/customer/bookings/Bookings";
import BookingDetails from "../pages/customer/bookings/BookingDetails";

import Profile from "../pages/customer/profile/Profile";
import Notifications from "../pages/customer/notifications/Notifications";

import Reports from "../pages/reports/Reports";
import Settings from "../pages/settings/Settings";

import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        {/* AUTH */}
        <Route path="/" element={<Login />} />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/register-choice"
          element={<RegisterChoice />}
        />

        <Route
          path="/register/customer"
          element={<CustomerRegister />}
        />

        <Route
          path="/register/worker"
          element={<WorkerRegister />}
        />


        {/* CUSTOMER AUTH */}

        <Route
          path="/customer/login"
          element={<CustomerLogin />}
        />


        {/* CUSTOMER DASHBOARD */}

        <Route
          path="/customer/dashboard"
          element={
            <ProtectedRoute>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />


        {/* CUSTOMER WORKERS */}

        <Route
          path="/customer/workers/:id"
          element={
            <ProtectedRoute>
              <WorkerDetails />
            </ProtectedRoute>
          }
        />


        {/* CUSTOMER BOOKINGS */}

        <Route
          path="/customer/bookings"
          element={
            <ProtectedRoute>
              <CustomerBookings />
            </ProtectedRoute>
          }
        />


        {/* CUSTOMER PROFILE */}

        <Route
          path="/customer/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />


        {/* CUSTOMER NOTIFICATIONS */}

        <Route
          path="/customer/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />


        {/* ADMIN DASHBOARD */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />


        {/* WORKERS */}

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


        {/* CUSTOMERS */}

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


        {/* BOOKINGS */}

        <Route
          path="/bookings"
          element={
            <ProtectedRoute>
              <CustomerBookings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/bookings/:id"
          element={
            <ProtectedRoute>
              <BookingDetails />
            </ProtectedRoute>
          }
        />


        {/* REPORTS */}

        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />


        {/* SETTINGS */}

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