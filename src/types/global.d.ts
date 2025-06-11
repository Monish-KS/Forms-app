import { PrismaClient } from "@prisma/client";

import { PrismaClient } from "@prisma/client";
import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { Socket as NetSocket } from "net";
import { NextApiResponse } from "next";

declare global {
  let prisma: PrismaClient | undefined;
  let io: SocketIOServer | undefined;
}

interface SocketServer extends HttpServer {
  io?: SocketIOServer | undefined;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

export interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}