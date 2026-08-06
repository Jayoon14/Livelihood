export type ChatRole = "customer" | "worker";

export function getChatListPath(role?: string | null): string {
  return String(role ?? "").toLowerCase() === "worker"
    ? "/worker/messages"
    : "/customer/messages";
}

export function getBookingChatPath(bookingId: number | string): string {
  return `/chat/${bookingId}`;
}

export function isChatPath(pathname: string): boolean {
  return (
    pathname === "/chat" ||
    pathname.startsWith("/chat/") ||
    pathname === "/customer/messages" ||
    pathname === "/worker/messages" ||
    pathname === "/customer/chat" ||
    pathname === "/worker/chat"
  );
}
