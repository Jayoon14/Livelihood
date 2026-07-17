import WorkerLayout from "../../../layouts/WorkerLayout";

export default function PaymentInformation() {
  return (
    <WorkerLayout>

      <div className="bg-white rounded-2xl shadow p-8">

        <h1 className="text-3xl font-bold">
          Payment Information
        </h1>

        <p className="mt-3 text-gray-500">
          Configure your payment methods here.
        </p>

      </div>

    </WorkerLayout>
  );
}