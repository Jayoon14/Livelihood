type Props = {
  title: string;
  value: string;
};

export default function DashboardCard({
  title,
  value,
}: Props) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">

      <p className="text-gray-500">
        {title}
      </p>

      <h2 className="text-4xl font-bold mt-3">
        {value}
      </h2>

    </div>
  );
}