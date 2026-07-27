import { useState, type ReactNode } from "react";

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

  return (
    <ProfileProvider>
      <div className="flex min-h-screen bg-slate-100">
        <CustomerSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <CustomerNavbar onMenuClick={() => setSidebarOpen(true)} />

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
