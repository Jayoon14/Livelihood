type Props = {
  search: string;
  statusFilter: string;
  sortBy: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSortChange: (value: string) => void;
};

export default function BookingFilters(props: Props) {
  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px_180px]">
      <input
        type="search"
        placeholder="Search worker or status..."
        value={props.search}
        onChange={(event) => props.onSearchChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
      <select value={props.statusFilter} onChange={(e) => props.onStatusChange(e.target.value)} className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
        {['All','Pending','Approved','On Going','Waiting Customer Confirmation','Completed','Cancelled'].map((status) => <option key={status}>{status}</option>)}
      </select>
      <select value={props.sortBy} onChange={(e) => props.onSortChange(e.target.value)} className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
        {['Newest','Oldest','Upcoming','Completed'].map((sort) => <option key={sort}>{sort}</option>)}
      </select>
    </div>
  );
}
