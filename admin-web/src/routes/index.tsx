import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import Dashboard from "../pages/dashboard/Dashboard";
import Workers from "../pages/auth/worker/Workers";
import WorkerDetails from "../pages/auth/worker/WorkerDetails";

import RegisterChoice from "../pages/auth/RegisterChoice";
import CustomerRegister from "../pages/auth/customer/Register";
import WorkerRegister from "../pages/auth/worker/Register";

import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        {/* AUTH ROUTES */}
        <Route path="/" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route path="/register-choice" element={<RegisterChoice />} />

        <Route
          path="/register/customer"
          element={<CustomerRegister />}
        />

        <Route
          path="/register/worker"
          element={<WorkerRegister />}
        />

        {/* PROTECTED ROUTES */}
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

      </Routes>
    </BrowserRouter>
  );
}