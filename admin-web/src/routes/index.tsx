import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

// ================= AUTH =================
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import RegisterChoice from "../pages/auth/RegisterChoice";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";

// ================= CUSTOMER AUTH =================
import CustomerLogin from "../pages/auth/customer/Login";
import CustomerRegister from "../pages/auth/customer/Register";

// ================= WORKER AUTH =================
import WorkerRegister from "../pages/auth/worker/Register";

// ================= ADMIN =================
import Dashboard from "../pages/admin/dashboard/Dashboard";
import AdminBookings from "../pages/admin/bookings/Bookings";
import BookingHistory from "../pages/admin/bookings/BookingHistory";
import Workers from "../pages/admin/workers/Workers";
import WorkerDetails from "../pages/admin/workers/WorkerDetails";
import Customers from "../pages/admin/customers/Customers";
import CustomerDetails from "../pages/admin/customers/CustomerDetails";
import Reports from "../pages/admin/reports/Reports";
import Payments from "../pages/admin/payments/Payments";
import ActivityLogs from "../pages/admin/activity/ActivityLogs";
import AdminNotifications from "../pages/admin/notifications/Notifications";

// ================= CUSTOMER =================
import CustomerDashboard from "../pages/customer/dashboard/CustomerDashboard";
import CustomerWorkers from "../pages/customer/workers/Workers";
import CustomerBookings from "../pages/customer/bookings/Bookings";
import BookingDetails from "../pages/customer/bookings/BookingDetails";
import BookWorker from "../pages/customer/bookings/BookWorker";
import TrackWorker from "../pages/customer/tracking/TrackWorker";
import Profile from "../pages/customer/profile/Profile";
import CustomerSettings from "../pages/customer/profile/Settings";
import Notifications from "../pages/customer/notifications/Notifications";
import CustomerWorkerProfile from "../pages/customer/workers/WorkerProfile";
import Categories from "../pages/customer/categories/Categories";
import WorkersByCategory from "../pages/customer/categories/WorkersByCategory";
import Favorites from "../pages/customer/favorites/Favorites";
import BookingConfirmation from "../pages/customer/bookings/BookingConfirmation";
import CustomerReceipt from "../pages/customer/receipt/CustomerReceipt";
import PaymentHistory from "../pages/customer/payments/PaymentHistory";
import CompareWorkers from "../pages/customer/workers/CompareWorkers";
import CompletionProof from "../pages/customer/bookings/CompletionProof";
import LeaveReview from "../pages/customer/reviews/LeaveReview";
import Payment from "../pages/customer/payments/Payment";

// ================= WORKER =================
import WorkerDashboard from "../pages/worker/dashboard/Dashboard";
import WorkerBookings from "../pages/worker/bookings/Bookings";
import WorkerReviews from "../pages/worker/reviews/Reviews";
import WorkerProfile from "../pages/worker/profile/Profile";
import WorkerSchedule from "../pages/worker/schedule/Schedule";
import Services from "../pages/worker/Services/services";
import NavigateToCustomer from "../pages/worker/navigation/NavigateToCustomer";
import CompleteJob from "../pages/worker/bookings/CompleteJob";
import PaymentInformation from "../pages/worker/payment/PaymentInformation";
import PaymentRequests from "../pages/worker/payment/PaymentRequests";
import WorkerNotifications from "../pages/worker/notifications/Notifications";

// ================= CHAT =================
import ChatRoom from "../pages/chat/ChatRoom";
import ChatList from "../pages/chat/ChatList";

// ================= SECURITY =================
import ProtectedRoute from "./ProtectedRoute";

// ================= PROVIDERS =================
import { WorkerLocationProvider } from "../context/WorkerLocationProvider";
import { RealtimeProvider } from "../providers/RealtimeProvider";

function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">
          !
        </div>

        <h1 className="mt-5 text-3xl font-black text-slate-900">
          Access denied
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your account does not have permission to open this page.
        </p>

        <button
          type="button"
          onClick={() => window.history.back()}
          className="mt-7 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
        >
          Go back
        </button>
      </section>
    </main>
  );
}

function AccountPendingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl">
          ⏳
        </div>

        <h1 className="mt-5 text-3xl font-black text-slate-900">
          Account pending
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your worker account must be approved by an administrator before you
          can access worker features.
        </p>

        <button
          type="button"
          onClick={() => window.location.assign("/")}
          className="mt-7 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
        >
          Return to login
        </button>
      </section>
    </main>
  );
}

function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <p className="text-7xl font-black text-emerald-600">404</p>

        <h1 className="mt-4 text-3xl font-black text-slate-900">
          Page not found
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          The page may have been moved, deleted, or the address may be
          incorrect.
        </p>

        <button
          type="button"
          onClick={() => window.location.assign("/")}
          className="mt-7 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
        >
          Return to login
        </button>
      </section>
    </main>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <RealtimeProvider>
        <WorkerLocationProvider>
          <Routes>
            {/* ================= PUBLIC AUTH ROUTES ================= */}

            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register-choice" element={<RegisterChoice />} />
            <Route path="/register/customer" element={<CustomerRegister />} />
            <Route path="/register/worker" element={<WorkerRegister />} />
            <Route path="/customer/login" element={<CustomerLogin />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Temporary security/status pages. These can be moved into
                separate page files later without changing the route paths. */}
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/account-pending" element={<AccountPendingPage />} />

            {/* ================= CUSTOMER-ONLY ROUTES ================= */}

            <Route
              path="/customer/dashboard"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <CustomerDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/customer/receipt/:id"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <CustomerReceipt />
                </ProtectedRoute>
              }
            />

            <Route
              path="/customer/payments"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <PaymentHistory />
                </ProtectedRoute>
              }
            />

            <Route
              path="/customer/workers"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <CustomerWorkers />
                </ProtectedRoute>
              }
            />

            <Route
              path="/customer/favorites"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <Favorites />
                </ProtectedRoute>
              }
            />

            <Route
              path="/customer/booking-confirmation"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <BookingConfirmation />
                </ProtectedRoute>
              }
            />

            <Route
              path="/customer/book/:workerId"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <BookWorker />
                </ProtectedRoute>
              }
            />

            <Route
              path="/customer/bookings"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <CustomerBookings />
                </ProtectedRoute>
              }
            />

            <Route
              path="/customer/tracking/:bookingId"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <TrackWorker />
                </ProtectedRoute>
              }
            />

            <Route
              path="/customer/bookings/:id"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <BookingDetails />
                </ProtectedRoute>
              }
            />

            <Route
              path="/customer/profile"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <Profile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/customer/settings"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <CustomerSettings />
                </ProtectedRoute>
              }
            />

            <Route
              path="/customer/notifications"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <Notifications />
                </ProtectedRoute>
              }
            />

            <Route
              path="/customer/workers/:id"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <CustomerWorkerProfile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/customer/review/:bookingId"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <LeaveReview />
                </ProtectedRoute>
              }
            />

            <Route
              path="/customer/messages"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <ChatList />
                </ProtectedRoute>
              }
            />

            <Route
              path="/customer/categories"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <Categories />
                </ProtectedRoute>
              }
            />

            <Route
              path="/customer/categories/:category"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <WorkersByCategory />
                </ProtectedRoute>
              }
            />

            <Route
              path="/customer/compare"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <CompareWorkers />
                </ProtectedRoute>
              }
            />

            <Route
              path="/customer/completion-proof/:bookingId"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <CompletionProof />
                </ProtectedRoute>
              }
            />

            <Route
              path="/customer/payment/:id"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <Payment />
                </ProtectedRoute>
              }
            />

            {/* ================= WORKER-ONLY ROUTES ================= */}

            <Route
              path="/worker/dashboard"
              element={
                <ProtectedRoute allowedRoles={["worker"]} requireApproved>
                  <WorkerDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/worker/bookings"
              element={
                <ProtectedRoute allowedRoles={["worker"]} requireApproved>
                  <WorkerBookings />
                </ProtectedRoute>
              }
            />

            <Route
              path="/worker/navigation/:bookingId"
              element={
                <ProtectedRoute allowedRoles={["worker"]} requireApproved>
                  <NavigateToCustomer />
                </ProtectedRoute>
              }
            />

            <Route
              path="/worker/bookings/complete/:bookingId"
              element={
                <ProtectedRoute allowedRoles={["worker"]} requireApproved>
                  <CompleteJob />
                </ProtectedRoute>
              }
            />

            <Route
              path="/worker/notifications"
              element={
                <ProtectedRoute allowedRoles={["worker"]} requireApproved>
                  <WorkerNotifications />
                </ProtectedRoute>
              }
            />

            <Route
              path="/worker/payment-information"
              element={
                <ProtectedRoute allowedRoles={["worker"]} requireApproved>
                  <PaymentInformation />
                </ProtectedRoute>
              }
            />

            <Route
              path="/worker/reviews"
              element={
                <ProtectedRoute allowedRoles={["worker"]} requireApproved>
                  <WorkerReviews />
                </ProtectedRoute>
              }
            />

            <Route
              path="/worker/profile"
              element={
                <ProtectedRoute allowedRoles={["worker"]} requireApproved>
                  <WorkerProfile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/worker/schedule"
              element={
                <ProtectedRoute allowedRoles={["worker"]} requireApproved>
                  <WorkerSchedule />
                </ProtectedRoute>
              }
            />

            <Route
              path="/worker/services"
              element={
                <ProtectedRoute allowedRoles={["worker"]} requireApproved>
                  <Services />
                </ProtectedRoute>
              }
            />

            <Route
              path="/worker/payments"
              element={
                <ProtectedRoute allowedRoles={["worker"]} requireApproved>
                  <PaymentRequests />
                </ProtectedRoute>
              }
            />

            <Route
              path="/worker/messages"
              element={
                <ProtectedRoute allowedRoles={["worker"]} requireApproved>
                  <ChatList />
                </ProtectedRoute>
              }
            />

            {/* ================= SHARED CUSTOMER/WORKER CHAT ================= */}

            <Route
              path="/chat"
              element={
                <ProtectedRoute allowedRoles={["customer", "worker"]}>
                  <ChatList />
                </ProtectedRoute>
              }
            />

            <Route
              path="/chat/:bookingId"
              element={
                <ProtectedRoute allowedRoles={["customer", "worker"]}>
                  <ChatRoom />
                </ProtectedRoute>
              }
            />

            {/* ================= ADMIN-ONLY ROUTES ================= */}

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/workers"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Workers />
                </ProtectedRoute>
              }
            />

            <Route
              path="/workers/:id"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <WorkerDetails />
                </ProtectedRoute>
              }
            />

            <Route
              path="/customers"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Customers />
                </ProtectedRoute>
              }
            />

            <Route
              path="/customers/:id"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <CustomerDetails />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/notifications"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminNotifications />
                </ProtectedRoute>
              }
            />

            <Route
              path="/bookings"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminBookings />
                </ProtectedRoute>
              }
            />

            <Route
              path="/bookings/history"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <BookingHistory />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Reports />
                </ProtectedRoute>
              }
            />

            <Route
              path="/payments"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Payments />
                </ProtectedRoute>
              }
            />

            <Route
              path="/activity-logs"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <ActivityLogs />
                </ProtectedRoute>
              }
            />

            {/* ================= FALLBACK ================= */}

            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </WorkerLocationProvider>
      </RealtimeProvider>
    </BrowserRouter>
  );
}
