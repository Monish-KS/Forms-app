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
// In-memory store for active field locks: Map<formId-fieldId, { userId: string, timestamp: number }>
const activeLocks = new Map();
const LOCK_TIMEOUT = 15 * 1000; // 15 seconds
// Function to clean up expired locks
setInterval(() => {
    const now = Date.now();
    activeLocks.forEach((lock, key) => {
        if (now - lock.timestamp > LOCK_TIMEOUT) {
            console.log(`Releasing expired lock for ${key} by ${lock.userId}`);
            activeLocks.delete(key);
            const [formId, fieldId] = key.split('-');
            io.to(formId).emit("field-unlock", { formId, fieldId, userId: lock.userId, expired: true });
        }
    });
}, 5000); // Check every 5 seconds
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    socket.on("join-form", (formId) => {
        socket.join(formId);
        console.log(`User ${socket.id} joined form: ${formId}`);
        // When a user joins, send them all current locks for this form
        const currentFormLocks = [];
        activeLocks.forEach((lock, key) => {
            const [lockFormId, fieldId] = key.split('-');
            if (lockFormId === formId) {
                currentFormLocks.push({ fieldId, userId: lock.userId });
            }
        });
        socket.emit("current-locks", { formId, locks: currentFormLocks });
    });
    socket.on("field-update", (data) => {
        console.log(`Field update in form ${data.formId}: ${data.fieldId} = ${data.value}`);
        // Check if the field is locked by someone else
        const lockKey = `${data.formId}-${data.fieldId}`;
        const currentLock = activeLocks.get(lockKey);
        if (currentLock && currentLock.userId !== socket.id) {
            // Field is locked by another user, reject update
            console.log(`Update rejected: Field ${data.fieldId} in form ${data.formId} is locked by ${currentLock.userId}`);
            socket.emit("field-locked-by-other", { formId: data.formId, fieldId: data.fieldId, lockedBy: currentLock.userId });
            return;
        }
        // If it's locked by this user, update timestamp
        if (currentLock && currentLock.userId === socket.id) {
            activeLocks.set(lockKey, { userId: socket.id, timestamp: Date.now() });
        }
        socket.to(data.formId).emit("field-update", data); // Broadcast to others in the room
    });
    socket.on("field-lock", (data) => {
        const lockKey = `${data.formId}-${data.fieldId}`;
        if (activeLocks.has(lockKey)) {
            const currentLock = activeLocks.get(lockKey);
            if (currentLock && currentLock.userId !== data.userId) {
                // Field is already locked by another user
                console.log(`Lock rejected: Field ${data.fieldId} in form ${data.formId} is already locked by ${currentLock.userId}`);
                socket.emit("field-locked-by-other", { formId: data.formId, fieldId: data.fieldId, lockedBy: currentLock.userId });
                return;
            }
        }
        // Acquire lock or update timestamp if already locked by this user
        activeLocks.set(lockKey, { userId: data.userId, timestamp: Date.now() });
        console.log(`Field lock acquired for ${data.formId}: ${data.fieldId} by ${data.userId}`);
        socket.to(data.formId).emit("field-lock", data); // Broadcast to others in the room
    });
    socket.on("field-unlock", (data) => {
        const lockKey = `${data.formId}-${data.fieldId}`;
        if (activeLocks.has(lockKey)) {
            const currentLock = activeLocks.get(lockKey);
            if (currentLock && currentLock.userId === data.userId) {
                activeLocks.delete(lockKey);
                console.log(`Field unlock for ${data.formId}: ${data.fieldId} by ${data.userId}`);
                socket.to(data.formId).emit("field-unlock", data); // Broadcast to others in the room
            }
            else {
                console.log(`Unlock rejected: Field ${data.fieldId} in form ${data.formId} is locked by ${currentLock?.userId || 'unknown'} not ${data.userId}`);
            }
        }
    });
    socket.on("typing-start", (data) => {
        console.log(`Typing start in form ${data.formId}: ${data.fieldId} by ${data.userName}`);
        socket.to(data.formId).emit("typing-start", data); // Broadcast to others in the room
    });
    socket.on("typing-stop", (data) => {
        console.log(`Typing stop in form ${data.formId}: ${data.fieldId} by ${data.userName}`);
        socket.to(data.formId).emit("typing-stop", data); // Broadcast to others in the room
    });
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        // Release all locks held by the disconnected user
        activeLocks.forEach((lock, key) => {
            if (lock.userId === socket.id) {
                activeLocks.delete(key);
                const [formId, fieldId] = key.split('-');
                io.to(formId).emit("field-unlock", { formId, fieldId, userId: socket.id, disconnected: true });
                console.log(`Released lock for ${key} due to disconnect of ${socket.id}`);
            }
        });
    });
});
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Socket.IO server listening on port ${PORT}`);
});
