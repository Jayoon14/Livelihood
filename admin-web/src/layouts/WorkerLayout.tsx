import { useEffect, useState, type ReactNode } from "react";

import WorkerSidebar from "../components/worker/WorkerSidebar";
import WorkerNavbar from "../components/worker/WorkerNavbar";
import Footer from "../components/common/Footer";
import FloatingChatWidget from "../components/chat/FloatingChatWidget";
import { ProfileProvider } from "../context/ProfileContext";
import { useWorkerLocation } from "../context/WorkerLocationContext";
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
      <div className="flex min-h-dvh min-w-0 bg-(--app-bg) text-(--app-text)">
        <WorkerSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={closeSidebar}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          />
        )}

        <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
          <WorkerNavbar onMenuClick={openSidebar} />

          {/* Space reserved for the fixed header so page content never slides underneath it. */}
          <div aria-hidden="true" className="h-16 shrink-0 sm:h-20" />

          <main className="min-w-0 flex-1 overflow-x-hidden">
            <div className="mx-auto w-full max-w-[1800px] px-3 py-4 sm:px-5 sm:py-6 lg:px-7 lg:py-8 xl:px-8">
              {children}
            </div>
          </main>

          <Footer />
        </div>

        <FloatingChatWidget />
      </div>
    </ProfileProvider>
  );
}
