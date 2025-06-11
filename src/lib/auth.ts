import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id; // Add user ID to the token
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string; // Add user ID to the session
        session.user.role = token.role;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/signin", // Custom sign-in page
  },
};

export default NextAuth(authOptions);