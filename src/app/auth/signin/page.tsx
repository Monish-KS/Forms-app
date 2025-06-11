"use client";

import { signIn } from "next-auth/react";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Sign In</h1>
      <button
        onClick={() => signIn("credentials", { email: "admin@example.com", password: "password", callbackUrl: "/" })}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Sign in as Admin
      </button>
      <button
        onClick={() => signIn("credentials", { email: "user@example.com", password: "password", callbackUrl: "/" })}
        className="mt-4 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
      >
        Sign in as User
      </button>
    </div>
  );
}