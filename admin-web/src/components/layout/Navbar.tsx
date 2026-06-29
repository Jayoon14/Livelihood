export default function Navbar() {
  return (
    <header className="bg-white shadow px-8 py-5 flex justify-between items-center">

      <div>

        <h2 className="text-2xl font-bold">
          Dashboard
        </h2>

        <p className="text-gray-500">
          Welcome back Administrator
        </p>

      </div>

      <div className="flex items-center gap-4">

        <div className="w-12 h-12 rounded-full bg-blue-600"></div>

        <div>

          <h4 className="font-semibold">
            Administrator
          </h4>

          <p className="text-sm text-gray-500">
            admin@livelihood.com
          </p>

        </div>

      </div>

    </header>
  );
}