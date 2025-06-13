declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string; // "admin" or "user"
    };
  }

  interface User {
    role: string; // "admin" or "user"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
  }
}