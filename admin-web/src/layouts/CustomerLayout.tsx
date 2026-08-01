import { useEffect, useState, type ReactNode } from "react";

import CustomerSidebar from "../components/customer/CustomerSidebar";
import CustomerNavbar from "../components/customer/CustomerNavbar";
import Footer from "../components/common/Footer";
import FloatingChatWidget from "../components/chat/FloatingChatWidget";
import { ProfileProvider } from "../context/ProfileContext";

interface Props {
  children: ReactNode;
}

export default function CustomerLayout({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <ProfileProvider>
      <div className="min-h-dvh bg-(--app-bg) text-(--app-text) transition-colors duration-300">
        <div className="flex min-h-dvh min-w-0">
          <CustomerSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
            <CustomerNavbar onMenuClick={() => setSidebarOpen(true)} />

            <main className="min-w-0 flex-1 overflow-x-hidden">
              <div className="mx-auto w-full max-w-[1800px] px-3 py-4 sm:px-5 sm:py-6 lg:px-7 xl:px-8">
                {children}
              </div>
            </main>

            <Footer />
          </div>

          <FloatingChatWidget />
        </div>
      </div>
    </ProfileProvider>
  );
}