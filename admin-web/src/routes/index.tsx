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
import CustomerDashboard from "../pages/customer/dashboard/CustomerDashboard";
import CustomerWorkers from "../pages/customer/workers/Workers";
import CustomerBookings from "../pages/customer/bookings/Bookings";
import BookingDetails from "../pages/customer/bookings/BookingDetails";
import BookWorker from "../pages/customer/bookings/BookWorker";
import Profile from "../pages/customer/profile/Profile";
import Notifications from "../pages/customer/notifications/Notifications";
import CustomerWorkerProfile from "../pages/customer/workers/WorkerProfile";


// ================= WORKER =================
import WorkerDashboard from "../pages/worker/dashboard/Dashboard";
import WorkerBookings from "../pages/worker/bookings/Bookings";
import WorkerReviews from "../pages/worker/reviews/Reviews";
import WorkerProfile from "../pages/worker/profile/Profile";
import WorkerSchedule from "../pages/worker/schedule/Schedule";
import Services from "../pages/worker/Services/services";


// ================= ADMIN PAGES =================
import Workers from "../pages/admin/workers/Workers";
import WorkerDetails from "../pages/admin/workers/WorkerDetails";

import Customers from "../pages/admin/customers/Customers";
import CustomerDetails from "../pages/admin/customers/CustomerDetails";


// ================= CHAT =================
import ChatRoom from "../pages/chat/ChatRoom";


// ================= OTHER =================
import Reports from "../pages/admin/reports/Reports";
import CustomerSettings from "../pages/customer/profile/Settings";


// ================= PROTECTED =================
import ProtectedRoute from "./ProtectedRoute";


// ================= PAYMENT =================
import Payment from "../pages/customer/payments/Payment";
import Payments from "../pages/admin/payments/Payments";

import ActivityLogs from "../pages/admin/activity/ActivityLogs";

import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";
import LeaveReview from "../pages/customer/reviews/LeaveReview";

import ChatList from "../pages/chat/ChatList";

import Categories from "../pages/customer/categories/Categories";
import WorkersByCategory from "../pages/customer/categories/WorkersByCategory";
import Favorites from "../pages/customer/favorites/Favorites";

import BookingConfirmation from "../pages/customer/bookings/BookingConfirmation";
import CustomerReceipt from "../pages/customer/receipt/CustomerReceipt";
import PaymentHistory from "../pages/customer/payments/PaymentHistory";
import CompareWorkers from "../pages/customer/workers/CompareWorkers";
import CompleteJob from "../pages/worker/bookings/CompleteJob";
import CompletionProof from "../pages/customer/bookings/CompletionProof";
import PaymentInformation from "../pages/worker/payment/PaymentInformation";


export default function AppRoutes() {
  return (
    <BrowserRouter>

      <Routes>


        {/* ================= AUTH ================= */}

        <Route
          path="/"
          element={<Login />}
        />
       

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


        {/* ================= CUSTOMER AUTH ================= */}

        <Route
          path="/customer/login"
          element={<CustomerLogin />}
        />


        {/* ================= CUSTOMER ================= */}

        <Route
          path="/customer/dashboard"
          element={
            <ProtectedRoute>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customer/receipt/:id"
          element={<CustomerReceipt />}
      />

         <Route
        path="/customer/payment"
        element={<Payment />}
        />

        <Route
          path="/customer/payments"
          element={<PaymentHistory />}
        />


        <Route
          path="/customer/workers"
          element={
            <ProtectedRoute>
              <CustomerWorkers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/favorites"
          element={<Favorites />}
        />

        <Route
        path="/customer/booking-confirmation"
        element={
          <ProtectedRoute>
            <BookingConfirmation />
          </ProtectedRoute>
        }
      />


        <Route
          path="/customer/book/:workerId"
          element={
            <ProtectedRoute>
              <BookWorker />
            </ProtectedRoute>
          }
        />


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

        <Route
        path="/customer/workers/:id"
        element={
          <ProtectedRoute>
            <CustomerWorkerProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/review/:bookingId"
        element={
          <ProtectedRoute>
            <LeaveReview />
          </ProtectedRoute>
        }
      />

      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/categories"
        element={
          <ProtectedRoute>
            <Categories />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/categories/:category"
        element={
          <ProtectedRoute>
            <WorkersByCategory />
          </ProtectedRoute>
        }
      />

      <Route
      path="/customer/compare"
      element={<CompareWorkers />}
    />


        {/* ================= WORKER ================= */}

        <Route
          path="/worker/dashboard"
          element={
            <ProtectedRoute>
              <WorkerDashboard />
            </ProtectedRoute>
          }
        />


        <Route
          path="/worker/bookings"
          element={
            <ProtectedRoute>
              <WorkerBookings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/worker/bookings/complete/:bookingId"
          element={<CompleteJob />}
        />

        <Route
          path="/customer/completion-proof/:bookingId"
          element={<CompletionProof />}
        />

        <Route
          path="/worker/payment-information"
          element={
            <ProtectedRoute>
              <PaymentInformation />
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


        <Route
          path="/worker/schedule"
          element={
            <ProtectedRoute>
              <WorkerSchedule />
            </ProtectedRoute>
          }
        />

        <Route
        path="/worker/services"
        element={
          <ProtectedRoute>
            <Services />
          </ProtectedRoute>
        }
      />



        {/* ================= ADMIN ================= */}

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



        {/* ================= CHAT ================= */}

        <Route
          path="/chat/:bookingId"
          element={
            <ProtectedRoute>
              <ChatRoom />
            </ProtectedRoute>
          }
        />



        {/* ================= REPORTS ================= */}

        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />


        {/* ================= SETTINGS ================= */}

      <Route
        path="/customer/settings"
        element={
          <ProtectedRoute>
            <CustomerSettings />
          </ProtectedRoute>
        }
      />


        <Route
          path="/customer/payment/:id"
          element={
            <ProtectedRoute>
              <Payment />
            </ProtectedRoute>
          }
        />


        <Route
          path="/payments"
          element={
            <ProtectedRoute>
              <Payments />
            </ProtectedRoute>
          }
        />


        <Route
          path="/activity-logs"
          element={
            <ProtectedRoute>
              <ActivityLogs />
            </ProtectedRoute>
          }
        />


        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />


        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />


      </Routes>

    </BrowserRouter>
  );
}