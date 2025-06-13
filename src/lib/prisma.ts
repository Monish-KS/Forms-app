import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!(globalThis as typeof globalThis & { prisma?: PrismaClient }).prisma) {
    (globalThis as typeof globalThis & { prisma: PrismaClient }).prisma = new PrismaClient();
  }
  prisma = (globalThis as typeof globalThis & { prisma: PrismaClient }).prisma;
}

export default prisma;