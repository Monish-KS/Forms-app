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
        origin: "*", // Allow all origins for now, refine in production
        methods: ["GET", "POST"],
    },
});
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    socket.on("join-form", (formId) => {
        socket.join(formId);
        console.log(`User ${socket.id} joined form: ${formId}`);
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
    });
});
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Socket.IO server listening on port ${PORT}`);
});
