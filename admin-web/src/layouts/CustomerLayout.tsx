import type { ReactNode } from "react";

import CustomerSidebar from "../components/layout/CustomerSidebar";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

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

          <Navbar />

          <main className="flex-1 p-8 overflow-auto">
            {children}
          </main>

          <Footer />

        </div>

      </div>

    </ProfileProvider>
  );
}