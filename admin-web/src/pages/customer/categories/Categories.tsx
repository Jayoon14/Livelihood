import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";

import { getCategoryPreview } from "../../../services/serviceService";

export default function Categories() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    const data = await getCategoryPreview();

    setCategories(data);
  }

  function getCategoryIcon(category: string) {
    if (category === "Cleaning") return "🧹";
    if (category === "Barber") return "💇";
    if (category === "Plumbing") return "🔧";
    if (category === "Electrician") return "⚡";
    if (category === "Painter") return "🎨";
    if (category === "Gardening") return "🌿";
    if (category === "Moving") return "🚚";
    if (category === "Carpentry") return "🪚";

    return "🛠️";
  }

  return (
    <CustomerLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Browse Services</h1>

          <p className="text-gray-500 mt-2">Choose a service category.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {categories.map((category) => (
            <div
              key={category.category}
              className="bg-white rounded-2xl shadow hover:shadow-xl transition p-6"
            >
              <div className="flex flex-col items-center">
                <div className="text-5xl">
                  {getCategoryIcon(category.category)}
                </div>

                <h2 className="font-bold text-lg mt-3">{category.category}</h2>

                <div className="space-y-1 mt-3 w-full">
                  {category.workers.slice(0, 3).map((worker: any) => (
                    <div key={worker.id} className="text-sm text-gray-600">
                      ⭐ {worker.first_name} {worker.last_name}
                    </div>
                  ))}
                </div>

                <p className="text-sm text-blue-600 font-semibold mt-4">
                  {category.totalWorkers} Available Worker
                  {category.totalWorkers > 1 && "s"}
                </p>

                <button
                  onClick={() =>
                    navigate(`/customer/categories/${category.category}`)
                  }
                  className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl"
                >
                  View Workers
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </CustomerLayout>
  );
}
