import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

import { useAuth, type UserRole } from "../context/AuthContextValue";

type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requireApproved?: boolean;
};

function isApproved(status: string | null) {
  return status?.trim().toLowerCase() === "approved";
}

function getDashboardByRole(role: UserRole | null) {
  switch (role) {
    case "admin":
      return "/dashboard";

    case "worker":
      return "/worker/dashboard";

    case "customer":
      return "/customer/dashboard";

    default:
      return "/";
  }
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  requireApproved = false,
}: ProtectedRouteProps) {
  const location = useLocation();

  const {
    loading,
    user,
    profile,
    role,
    status,
  } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
          <p className="font-semibold text-slate-700">
            Checking your account...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/"
        replace
        state={{
          from: location.pathname,
          message: "Please log in to continue.",
        }}
      />
    );
  }

  if (!profile) {
    return (
      <Navigate
        to="/unauthorized"
        replace
        state={{
          message: "Your account profile could not be verified.",
        }}
      />
    );
  }

  if (
    allowedRoles &&
    allowedRoles.length > 0 &&
    role &&
    !allowedRoles.includes(role)
  ) {
    return (
      <Navigate
        to={getDashboardByRole(role)}
        replace
        state={{
          message:
            "You do not have permission to access that page.",
        }}
      />
    );
  }

  const normalizedStatus = status?.trim().toLowerCase() ?? "";

  if (role !== "admin" && (normalizedStatus === "disabled" || normalizedStatus === "blocked" || normalizedStatus === "rejected")) {
    return (
      <Navigate
        to="/"
        replace
        state={{
          message:
            normalizedStatus === "disabled"
              ? "Your account has been disabled. Please contact the administrator for assistance."
              : normalizedStatus === "blocked"
                ? "Your account has been blocked. Please contact the administrator for assistance."
                : "Your account is not allowed to access the system.",
        }}
      />
    );
  }

  if (requireApproved && !isApproved(status)) {
    return (
      <Navigate
        to="/account-pending"
        replace
        state={{
          status,
          message:
            "Your account must be approved before accessing this page.",
        }}
      />
    );
  }

  return <>{children}</>;
}