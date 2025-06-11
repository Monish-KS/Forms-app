import { Server } from "socket.io";
import { NextApiRequest } from "next";
import { NextApiResponseWithSocket } from "@/types/global";

// This is a placeholder for the Socket.IO server.
// In a real Next.js App Router setup, you might need a custom server
// or a different approach for a persistent WebSocket server.
// For this example, we'll simulate a basic setup.

const SocketHandler = (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  if (res.socket.server.io) {
    console.log("Socket.IO already running");
  } else {
    console.log("Socket.IO initializing");
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    io.on("connection", (socket) => {
      console.log("A user connected:", socket.id);

      socket.on("join-form", (formId: string) => {
        socket.join(formId);
        console.log(`User ${socket.id} joined form: ${formId}`);
      });

      socket.on("field-update", (data: { formId: string; fieldId: string; value: string | number | boolean | string[] }) => {
        console.log(`Field update in form ${data.formId}: ${data.fieldId} = ${data.value}`);
        socket.to(data.formId).emit("field-update", data); // Broadcast to others in the room
        // TODO: Save to database (debounced)
      });

      socket.on("field-lock", (data: { formId: string; fieldId: string; userId: string }) => {
        console.log(`Field lock in form ${data.formId}: ${data.fieldId} by ${data.userId}`);
        socket.to(data.formId).emit("field-lock", data);
        // TODO: Implement actual locking mechanism (e.g., Redis)
      });

      socket.on("field-unlock", (data: { formId: string; fieldId: string; userId: string }) => {
        console.log(`Field unlock in form ${data.formId}: ${data.fieldId} by ${data.userId}`);
        socket.to(data.formId).emit("field-unlock", data);
        // TODO: Release lock
      });

      socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
      });
    });
  }
  res.end();
};

export default SocketHandler;