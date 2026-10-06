import { auditCaughtError } from "../../lib/processAudit";
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContextValue";
import { supabase } from "../../lib/supabase";
import { reportAuditFailure, sendAudit } from "../../lib/activityAudit";

export default function ActivityAuditTracker() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const lastVisit = useRef("");

  useEffect(() => {
    const show = (event: Event) => {
      const detail: unknown = event instanceof CustomEvent ? event.detail : undefined;
      toast.error(typeof detail === "string" ? detail : "Activity audit could not be saved. Check the audit setup.", { duration: 12000 });
    };
    window.addEventListener("activity-audit-unavailable", show);
    return () => window.removeEventListener("activity-audit-unavailable", show);
  }, []);

  useEffect(() => {
    const context = () => ({ module: /auth|login|register|password|otp/i.test(window.location.pathname) || window.location.pathname === "/" ? "Authentication" : "System", process: "Unhandled application error", action: "EXECUTE" });
    const error = (event: ErrorEvent) => auditCaughtError(context(), event.error ?? event.message);
    const rejection = (event: PromiseRejectionEvent) => auditCaughtError(context(), event.reason);
    window.addEventListener("error", error);
    window.addEventListener("unhandledrejection", rejection);
    return () => { window.removeEventListener("error", error); window.removeEventListener("unhandledrejection", rejection); };
  }, []);

  useEffect(() => {
    const recent = new Map<string, number>();
    const invalid = (event: Event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement || input instanceof HTMLTextAreaElement)) return;
      const field = (input.name || input.id || "form field").replace(/[^a-zA-Z0-9 _-]/g, "").slice(0, 60);
      const previous = recent.get(field) ?? 0;
      if (Date.now() - previous < 1000) return;
      recent.set(field, Date.now());
      const type = input.validity.valueMissing ? "required field missing" : input.validity.typeMismatch ? "invalid field format" : "field constraint not satisfied";
      const path = window.location.pathname;
      auditCaughtError({ module: path === "/" || /auth|login|register|password|otp/i.test(path) ? "Authentication" : "Forms", process: "Form validation", action: "EXECUTE" }, `${field}: ${type}. No field value recorded.`);
    };
    document.addEventListener("invalid", invalid, true);
    return () => document.removeEventListener("invalid", invalid, true);
  }, []);

  useEffect(() => {
    if (!user) return;
    const trackDownload = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target.closest("a[download]") : null;
      if (!element) return;
      void supabase.auth.getSession().then(async ({ data }) => {
        if (!data.session || data.session.user.id !== user.id) return;
        await sendAudit(`Bearer ${data.session.access_token}`, "EXPORT", "Downloads", "Requested a browser file download/export.");
      }).catch(reportAuditFailure);
    };
    document.addEventListener("click", trackDownload, true);
    return () => document.removeEventListener("click", trackDownload, true);
  }, [user]);

  useEffect(() => {
    if (loading || !user) { lastVisit.current = ""; return; }
    const key = `${user.id}:${location.key}:${location.pathname}`;
    if (lastVisit.current === key) return;
    lastVisit.current = key;
    const pathname = location.pathname;
    const section = pathname.split("/").filter(Boolean);
    const module = section[0] === "worker" || section[0] === "customer" ? section[1] ?? "Dashboard" : section[0] ?? "Home";
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session || data.session.user.id !== user.id) return;
      await sendAudit(`Bearer ${data.session.access_token}`, "VIEW", module, `Opened page ${pathname}.`);
    }).catch(reportAuditFailure);
  }, [loading, user, location.key, location.pathname]);

  return null;
}
