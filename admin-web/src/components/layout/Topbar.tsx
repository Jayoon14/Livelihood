import {
  Bell,
  Search,
} from "lucide-react";

export default function Topbar() {

  return (

    <header className="bg-white shadow-sm px-8 py-5 flex justify-between">

      <div className="relative">

        <Search
          className="absolute left-3 top-3 text-gray-400"
        />

        <input
          placeholder="Search..."
          className="pl-10 w-96 border rounded-lg p-2"
        />

      </div>

      <div className="flex items-center gap-6">

        <Bell />

        <img
          src="https://i.pravatar.cc/50"
          className="w-10 h-10 rounded-full"
        />
        

      </div>

    </header>

  );
}