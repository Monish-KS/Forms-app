"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const http_1 = __importDefault(require("http"));
const httpServer = http_1.default.createServer();
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*", // Allow specific origins in production, all for development
        methods: ["GET", "POST"],
    },
});
// Map to store active users in each form: formId -> Map<socketId, { id: string; name: string | null; email: string | null }>
const usersInForms = new Map();
// Map to store which form a socket is currently in
const socketFormMap = new Map();
function broadcastUserList(formId) {
    const users = Array.from(usersInForms.get(formId)?.values() || []);
    io.to(formId).emit("user-list-update", { formId, users });
    console.log(`Broadcasted user list for form ${formId}:`, users.map(u => u.name || u.email));
}
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    socket.on("join-form", (data) => {
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
    socket.on("field-update", (data) => {
        console.log(`Field update in form ${data.formId}: ${data.fieldId} = ${data.value}`);
        socket.to(data.formId).emit("field-update", data); // Broadcast to others in the room
    });
    socket.on("field-lock", (data) => {
        console.log(`Field lock in form ${data.formId}: ${data.fieldId} by ${data.userId}`);
        socket.to(data.formId).emit("field-lock", data);
    });
    socket.on("field-unlock", (data) => {
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
