import { lazy, Suspense } from "react";
  import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

  import PageLoader from "../components/common/PageLoader";
  import NavigationLoadingHandler from "../components/common/NavigationLoadingHandler";
  import ProtectedRoute from "./ProtectedRoute";
  import { WorkerLocationProvider } from "../context/WorkerLocationProvider";
  import { RealtimeProvider } from "../providers/RealtimeProvider";

  // ================= AUTH =================
  const Login = lazy(() => import("../pages/auth/Login"));
  const Register = lazy(() => import("../pages/auth/Register"));
  const RegisterChoice = lazy(() => import("../pages/auth/RegisterChoice"));
  const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword"));
  const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));
  const VerifyEmailOtp = lazy(
    () => import("../pages/auth/VerifyEmailOtp"),
  );

  // ================= CUSTOMER AUTH =================
  const CustomerLogin = lazy(() => import("../pages/auth/customer/Login"));
  const CustomerRegister = lazy(() => import("../pages/auth/customer/Register"));

  // ================= WORKER AUTH =================
  const WorkerRegister = lazy(() => import("../pages/auth/worker/Register"));

  // ================= ADMIN =================
  const Dashboard = lazy(() => import("../pages/admin/dashboard/Dashboard"));
  const AdminBookings = lazy(() => import("../pages/admin/bookings/Bookings"));
  const BookingHistory = lazy(
    () => import("../pages/admin/bookings/BookingHistory"),
  );
  const Workers = lazy(() => import("../pages/admin/workers/Workers"));
  const WorkerDetails = lazy(
    () => import("../pages/admin/workers/WorkerDetails"),
  );
  const Customers = lazy(() => import("../pages/admin/customers/Customers"));
  const CustomerDetails = lazy(
    () => import("../pages/admin/customers/CustomerDetails"),
  );
  const Reports = lazy(() => import("../pages/admin/reports/Reports"));
  const ReportsComplaints = lazy(() => import("../pages/admin/cases/ReportsComplaints"));
  const CaseReview = lazy(() => import("../pages/admin/cases/CaseReview"));
  const RiskManagement = lazy(() => import("../pages/admin/enforcement/RiskManagement"));
  const AdminServices = lazy(
    () => import("../pages/admin/services/Services"),
  );
  const Payments = lazy(() => import("../pages/admin/payments/Payments"));
  const ActivityLogs = lazy(
    () => import("../pages/admin/activity/ActivityLogs"),
  );
  const AdminNotifications = lazy(
    () => import("../pages/admin/notifications/Notifications"),
  );

  const AdminProfile = lazy(
    () => import("../pages/admin/profile/Profile"),
  );

  const AdminSettings = lazy(
    () => import("../pages/admin/settings/Settings"),
  );

  // ================= CUSTOMER =================
  const CustomerDashboard = lazy(
    () => import("../pages/customer/dashboard/CustomerDashboard"),
  );
  const CustomerWorkers = lazy(
    () => import("../pages/customer/workers/Workers"),
  );
  const CustomerBookings = lazy(
    () => import("../pages/customer/bookings/Bookings"),
  );
  const BookingDetails = lazy(
    () => import("../pages/customer/bookings/BookingDetails"),
  );
  const BookWorker = lazy(
    () => import("../pages/customer/bookings/BookWorker"),
  );
  const TrackWorker = lazy(
    () => import("../pages/customer/tracking/TrackWorker"),
  );
  const Profile = lazy(() => import("../pages/customer/profile/Profile"));
  const CustomerSettings = lazy(
    () => import("../pages/customer/profile/Settings"),
  );
  const Notifications = lazy(
    () => import("../pages/customer/notifications/Notifications"),
  );
  const CustomerWorkerProfile = lazy(
    () => import("../pages/customer/workers/WorkerProfile"),
  );
  const Categories = lazy(
    () => import("../pages/customer/categories/Categories"),
  );
  const WorkersByCategory = lazy(
    () => import("../pages/customer/categories/WorkersByCategory"),
  );
  const Favorites = lazy(
    () => import("../pages/customer/favorites/Favorites"),
  );
  const TrustedWorkers = lazy(
    () => import("../pages/customer/favorites/TrustedWorkers"),
  );
  const BookingConfirmation = lazy(
    () => import("../pages/customer/bookings/BookingConfirmation"),
  );
  const CustomerReceipt = lazy(
    () => import("../pages/customer/receipt/CustomerReceipt"),
  );
  const PaymentHistory = lazy(
    () => import("../pages/customer/payments/PaymentHistory"),
  );
  const CompareWorkers = lazy(
    () => import("../pages/customer/workers/CompareWorkers"),
  );
  const CompletionProof = lazy(
    () => import("../pages/customer/bookings/CompletionProof"),
  );
  const LeaveReview = lazy(
    () => import("../pages/customer/reviews/LeaveReview"),
  );
  const Payment = lazy(() => import("../pages/customer/payments/Payment"));
  const CustomerMyReports = lazy(() => import("../pages/customer/reports/MyReports"));
  const CustomerMyAppeals = lazy(() => import("../pages/customer/appeals/MyAppeals"));

  // ================= WORKER =================
  const WorkerDashboard = lazy(
    () => import("../pages/worker/dashboard/Dashboard"),
  );
  const WorkerBookings = lazy(
    () => import("../pages/worker/bookings/Bookings"),
  );
  const WorkerReviews = lazy(
    () => import("../pages/worker/reviews/Reviews"),
  );
  const WorkerProfile = lazy(
    () => import("../pages/worker/profile/Profile"),
  );

  const WorkerSettings = lazy(
    () => import("../pages/worker/settings/WorkerSettings"),
  );
  const WorkerSchedule = lazy(
    () => import("../pages/worker/schedule/Schedule"),
  );
  const Services = lazy(() => import("../pages/worker/Services/services"));
  const NavigateToCustomer = lazy(
    () => import("../pages/worker/navigation/NavigateToCustomer"),
  );
  const CompleteJob = lazy(
    () => import("../pages/worker/bookings/CompleteJob"),
  );
  const PaymentInformation = lazy(
    () => import("../pages/worker/payment/PaymentInformation"),
  );
  const PaymentRequests = lazy(
    () => import("../pages/worker/payment/PaymentRequests"),
  );
  const WorkerNotifications = lazy(
    () => import("../pages/worker/notifications/Notifications"),
  );
  const WorkerMyReports = lazy(() => import("../pages/worker/reports/MyReports"));
  const WorkerMyAppeals = lazy(() => import("../pages/worker/appeals/MyAppeals"));

  // ================= CHAT =================
  const ChatRoom = lazy(() => import("../pages/chat/ChatRoom"));
  const ChatList = lazy(() => import("../pages/chat/ChatList"));

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
            <NavigationLoadingHandler />
            <Suspense fallback={<PageLoader />}>
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
                <Route path="/verify-email" element={<VerifyEmailOtp />} />

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
                  path="/customer/trusted-workers"
                  element={
                    <ProtectedRoute allowedRoles={["customer"]}>
                      <TrustedWorkers />
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

                <Route path="/customer/reports" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerMyReports /></ProtectedRoute>} />
                <Route path="/customer/appeals" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerMyAppeals /></ProtectedRoute>} />

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
                  path="/customer/chat"
                  element={<Navigate to="/customer/messages" replace />}
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

                <Route path="/worker/reports" element={<ProtectedRoute allowedRoles={["worker"]}><WorkerMyReports /></ProtectedRoute>} />
                <Route path="/worker/appeals" element={<ProtectedRoute allowedRoles={["worker"]}><WorkerMyAppeals /></ProtectedRoute>} />

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
                  path="/worker/bookings/:bookingId/complete"
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
                  path="/worker/settings"
                  element={
                    <ProtectedRoute allowedRoles={["worker"]} requireApproved>
                      <WorkerSettings />
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

                {/* Backward-compatible route for old dashboard/sidebar links. */}
                <Route
                  path="/worker/chat"
                  element={<Navigate to="/worker/messages" replace />}
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
                  path="/bookings/:id"
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
                  path="/admin/cases"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <ReportsComplaints />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/cases/:reportId"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <CaseReview />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/risk-management"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <RiskManagement />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/services"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <AdminServices />
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

                <Route
                  path="/admin/profile"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <AdminProfile />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/profile/edit"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <AdminProfile />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <AdminSettings />
                    </ProtectedRoute>
                  }
                />

                {/* ================= FALLBACK ================= */}

                <Route path="/home" element={<Navigate to="/" replace />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </WorkerLocationProvider>
        </RealtimeProvider>
      </BrowserRouter>
    );
  }