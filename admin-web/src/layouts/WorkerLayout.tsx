import { useEffect, useState, type ReactNode } from "react";

import WorkerSidebar from "../components/worker/WorkerSidebar";
import WorkerNavbar from "../components/worker/WorkerNavbar";
import Footer from "../components/common/Footer";
import FloatingChatWidget from "../components/chat/FloatingChatWidget";
import { ProfileProvider } from "../context/ProfileContext";
import { useWorkerLocation } from "../context/WorkerLocationProvider";
import {
  WORKER_HEARTBEAT_INTERVAL_MS,
  markCurrentWorkerOffline,
  updateCurrentWorkerHeartbeat,
} from "../services/presenceService";

interface WorkerLayoutProps {
  children: ReactNode;
}

export default function WorkerLayout({ children }: WorkerLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isOnline } = useWorkerLocation();

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | null = null;

    async function syncOffline() {
      try {
        await markCurrentWorkerOffline();
      } catch (error) {
        if (!cancelled) {
          console.error("Unable to sync worker offline presence:", error);
        }
      }
    }

    async function sendHeartbeat() {
      try {
        await updateCurrentWorkerHeartbeat();
      } catch (error) {
        if (!cancelled) {
          console.error("Unable to update worker online presence:", error);
        }
      }
    }

    // Important: being logged in is not the same as being online.
    // Heartbeat runs only after the worker explicitly turns GPS/status online.
    if (!isOnline) {
      void syncOffline();
      return () => {
        cancelled = true;
      };
    }

    void sendHeartbeat();

    intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void sendHeartbeat();
      }
    }, WORKER_HEARTBEAT_INTERVAL_MS);

    function handleVisibleOrFocused() {
      if (
        isOnline &&
        document.visibilityState === "visible" &&
        navigator.onLine
      ) {
        void sendHeartbeat();
      }
    }

    document.addEventListener("visibilitychange", handleVisibleOrFocused);
    window.addEventListener("focus", handleVisibleOrFocused);
    window.addEventListener("online", handleVisibleOrFocused);

    return () => {
      cancelled = true;

      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }

      document.removeEventListener("visibilitychange", handleVisibleOrFocused);
      window.removeEventListener("focus", handleVisibleOrFocused);
      window.removeEventListener("online", handleVisibleOrFocused);
    };
  }, [isOnline]);

  function openSidebar() {
    setSidebarOpen(true);
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <ProfileProvider>
      <div className="flex min-h-screen bg-slate-100">
        <WorkerSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={closeSidebar}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <WorkerNavbar onMenuClick={openSidebar} />

          <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
            {children}
          </main>

          <Footer />
        </div>

        <FloatingChatWidget />
      </div>
    </ProfileProvider>
  );
}
