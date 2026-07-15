import type { ReactNode } from "react";

import CustomerSidebar from "../components/customer/CustomerSidebar";
import CustomerNavbar from "../components/customer/CustomerNavbar";
import Footer from "../components/common/Footer";
import { ProfileProvider } from "../context/ProfileContext";

interface Props {
  children: ReactNode;
}

export default function CustomerLayout({
  children,
}: Props) {
  return (
    <ProfileProvider>
      <div className="min-h-screen flex bg-slate-100">

        <CustomerSidebar />

        <div className="flex-1 flex flex-col">

          <CustomerNavbar />

          <main className="flex-1 p-8 overflow-auto">
            {children}
          </main>

          <Footer />

        </div>

      </div>
    </ProfileProvider>
  );
}