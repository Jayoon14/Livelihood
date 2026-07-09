import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getMessages,
  sendMessage,
} from "../../services/chatService";

export default function ChatRoom() {
  const { bookingId } = useParams();

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    const data = await getMessages(
      Number(bookingId)
    );

    setMessages(data as any);
  }

  return (
    <div>
      Chat Room
    </div>
  );
}