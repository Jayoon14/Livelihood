import { useEffect, useState, type ReactNode } from "react";

import CustomerSidebar from "../components/customer/CustomerSidebar";
import CustomerNavbar from "../components/customer/CustomerNavbar";
import Footer from "../components/common/Footer";
import FloatingChatWidget from "../components/chat/FloatingChatWidget";
import GlobalReviewPrompt from "../components/customer/GlobalReviewPrompt";
import { ProfileProvider } from "../context/ProfileContext";

interface Props {
  children: ReactNode;
}

export default function CustomerLayout({
  children,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen
      ? "hidden"
      : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  function closeSidebar(): void {
    setSidebarOpen(false);
  }

  function openSidebar(): void {
    setSidebarOpen(true);
  }

  return (
    <ProfileProvider>
      <div className="min-h-dvh bg-(--app-bg) text-(--app-text) transition-colors duration-300">
        <div className="flex min-h-dvh min-w-0">
          <CustomerSidebar
            isOpen={sidebarOpen}
            onClose={closeSidebar}
          />

          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={closeSidebar}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            />
          )}

          <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
            <CustomerNavbar
              onMenuClick={openSidebar}
            />

            {/* Space reserved for the fixed header so page content never slides underneath it. */}
            <div aria-hidden="true" className="h-16 shrink-0 sm:h-20" />

            <main className="min-w-0 flex-1 overflow-x-hidden">
              <div className="mx-auto w-full max-w-[1800px] px-3 py-4 sm:px-5 sm:py-6 lg:px-7 xl:px-8">
                {children}
              </div>
            </main>

            <Footer />
          </div>

          <FloatingChatWidget />
          <GlobalReviewPrompt />
        </div>
      </div>
    </ProfileProvider>
  );
}
