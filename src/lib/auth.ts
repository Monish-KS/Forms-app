import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "./prisma";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    }
  }
  
  interface User {
    id: string;
    role: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: any) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // In a real application, you would hash passwords and compare securely.
        // For this example, we're using simple mock users.
        let user;
        if (credentials.email === "admin@example.com" && credentials.password === "password") {
          user = await prisma.user.upsert({
            where: { email: "admin@example.com" },
            update: { name: "Admin User", role: "admin" },
            create: { email: "admin@example.com", name: "Admin User", role: "admin" },
          });
        } else if (credentials.email === "user@example.com" && credentials.password === "password") {
          user = await prisma.user.upsert({
            where: { email: "user@example.com" },
            update: { name: "Regular User", role: "user" },
            create: { email: "user@example.com", name: "Regular User", role: "user" },
          });
        } else {
          return null;
        }
        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt" as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
  },
} as const;

export const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };