"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <p>Loading...</p>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Collaborative Forms</h1>

      {session ? (
        <div className="text-center">
          <p className="text-xl mb-4">Welcome, {session.user?.name || session.user?.email}!</p>
          <p className="text-lg mb-4">Your role: {session.user?.role}</p>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Sign Out
          </button>
          {session.user?.role === "admin" && (
            <div className="mt-8">
              <Link href="/admin/forms" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                Go to Admin Dashboard
              </Link>
            </div>
          )}
          <div className="mt-8">
            <Link href="/forms" className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
              View All Forms
            </Link>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-xl mb-4">You are not signed in.</p>
          <Link href="/auth/signin" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Sign In
          </Link>
        </div>
      )}
    </main>
  );
}
