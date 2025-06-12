import { io, Socket } from "socket.io-client";

export interface UserPresence {
  id: string;
  name: string | null;
  email: string | null;
}

let socket: Socket | undefined;
const userListUpdateListeners: ((users: UserPresence[]) => void)[] = [];

export const getSocket = () => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001");

    socket.on("connect", () => {
      console.log("Connected to Socket.IO server");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from Socket.IO server");
    });

    socket.on("connect_error", (err) => {
      console.error("Socket.IO connection error:", err.message);
    });

    socket.on("user-list-update", (data: { formId: string; users: UserPresence[] }) => {
      console.log(`Received user list update for form ${data.formId}:`, data.users);
      userListUpdateListeners.forEach(listener => listener(data.users));
    });
  }
  return socket;
};

export const onUserListUpdate = (listener: (users: UserPresence[]) => void) => {
  userListUpdateListeners.push(listener);
  return () => {
    const index = userListUpdateListeners.indexOf(listener);
    if (index > -1) {
      userListUpdateListeners.splice(index, 1);
    }
  };
};