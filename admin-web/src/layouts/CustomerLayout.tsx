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
        {/*
          IMPORTANT: CustomerSidebar itself must be responsible for its own
          positioning so it never reserves horizontal space in this flex row
          on mobile/tablet. It should render something like:

            <aside
              className={`
                fixed inset-y-0 left-0 z-50 w-64 sm:w-72 bg-white
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? "translate-x-0" : "-translate-x-full"}
                lg:static lg:translate-x-0 lg:z-auto lg:w-64 xl:w-72
                overflow-y-auto
              `}
            >
              ...
            </aside>

          If CustomerSidebar instead renders a normal (non-fixed) block with
          a fixed width that's only visually hidden (e.g. via `hidden` /
          opacity), it will still occupy layout width in this flex container
          on small screens — which is exactly the bug in the screenshot
          (empty gray column eating most of the viewport on mobile).
        */}
        <CustomerSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] lg:hidden"
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <CustomerNavbar onMenuClick={() => setSidebarOpen(true)} />

          <main className="flex-1 overflow-x-hidden p-3 sm:p-6 lg:p-8">
            {children}
          </main>

          <Footer />
        </div>

        <FloatingChatWidget />
      </div>
    </ProfileProvider>
  );
}