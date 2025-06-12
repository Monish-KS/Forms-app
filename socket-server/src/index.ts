import { Server } from "socket.io";
import http from "http";

const httpServer = http.createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins for now, refine in production
    methods: ["GET", "POST"],
  },
});

// Map to store active users in each form: formId -> Map<socketId, { id: string; name: string | null; email: string | null }>
const usersInForms = new Map<string, Map<string, { id: string; name: string | null; email: string | null }>>();

// Map to store which form a socket is currently in
const socketFormMap = new Map<string, string>();

function broadcastUserList(formId: string) {
  const users = Array.from(usersInForms.get(formId)?.values() || []);
  io.to(formId).emit("user-list-update", { formId, users });
  console.log(`Broadcasted user list for form ${formId}:`, users.map(u => u.name || u.email));
}

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join-form", (data: { formId: string; userId: string; userName: string | null; userEmail: string | null }) => {
    const { formId, userId, userName, userEmail } = data;

    // Leave any previously joined form
    const previousFormId = socketFormMap.get(socket.id);
    if (previousFormId && usersInForms.has(previousFormId)) {
      usersInForms.get(previousFormId)?.delete(socket.id);
      if (usersInForms.get(previousFormId)?.size === 0) {
        usersInForms.delete(previousFormId);
      }
      broadcastUserList(previousFormId);
    }

    socket.join(formId);
    socketFormMap.set(socket.id, formId);

    if (!usersInForms.has(formId)) {
      usersInForms.set(formId, new Map());
    }
    usersInForms.get(formId)?.set(socket.id, { id: userId, name: userName, email: userEmail });

    console.log(`User ${userName || userEmail} (${userId}) joined form: ${formId}`);
    broadcastUserList(formId);
  });

  socket.on("field-update", (data: { formId: string; fieldId: string; value: string | number | boolean | string[] }) => {
    console.log(`Field update in form ${data.formId}: ${data.fieldId} = ${data.value}`);
    socket.to(data.formId).emit("field-update", data); // Broadcast to others in the room
  });

  socket.on("field-lock", (data: { formId: string; fieldId: string; userId: string }) => {
    console.log(`Field lock in form ${data.formId}: ${data.fieldId} by ${data.userId}`);
    socket.to(data.formId).emit("field-lock", data);
  });

  socket.on("field-unlock", (data: { formId: string; fieldId: string; userId: string }) => {
    console.log(`Field unlock in form ${data.formId}: ${data.fieldId} by ${data.userId}`);
    socket.to(data.formId).emit("field-unlock", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    const formId = socketFormMap.get(socket.id);
    if (formId && usersInForms.has(formId)) {
      usersInForms.get(formId)?.delete(socket.id);
      if (usersInForms.get(formId)?.size === 0) {
        usersInForms.delete(formId);
      }
      broadcastUserList(formId);
    }
    socketFormMap.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server listening on port ${PORT}`);
});