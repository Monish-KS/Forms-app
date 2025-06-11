import { io, Socket } from "socket.io-client";

let socket: Socket | undefined;

export const getSocket = () => {
  if (!socket) {
    // Connect to the Socket.IO server running on the Next.js API route
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000", {
      path: "/api/socket", // This is important for Next.js API routes
      addTrailingSlash: false,
    });

    socket.on("connect", () => {
      console.log("Connected to Socket.IO server");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from Socket.IO server");
    });

    socket.on("connect_error", (err) => {
      console.error("Socket.IO connection error:", err.message);
    });
  }
  return socket;
};