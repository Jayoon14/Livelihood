import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../lib/supabase";
import { getChatList } from "../../services/chatService";

export default function ChatList() {
  const navigate = useNavigate();

  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    loadChats();
  }, []);

  async function loadChats() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const chats = await getChatList(user.id);

    // Show chats only for approved, ongoing, or completed bookings
    const approvedChats = chats.filter(
      (booking: any) =>
        booking.status === "Approved" ||
        booking.status === "On Going" ||
        booking.status === "Completed",
    );

    const items = approvedChats.map((booking: any) => {
      const other =
        booking.customer_id === user.id ? booking.worker : booking.customer;

      return {
        bookingId: booking.id,
        user: other,
        status: booking.status,
      };
    });

    setList(items);
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Messages</h1>

      <div className="bg-white rounded-2xl shadow">
        {list.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No available conversations.
          </div>
        ) : (
          list.map((chat) => (
            <button
              key={chat.bookingId}
              onClick={() => navigate(`/chat/${chat.bookingId}`)}
              className="w-full flex items-center gap-5 p-5 border-b hover:bg-slate-50"
            >
              <img
                src={chat.user.profile_picture || "https://placehold.co/70"}
                alt="Profile"
                className="w-14 h-14 rounded-full object-cover"
              />

              <div className="flex-1 text-left">
                <h3 className="font-bold">
                  {chat.user.first_name} {chat.user.last_name}
                </h3>

                <p className="text-gray-500">Booking Status: {chat.status}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
