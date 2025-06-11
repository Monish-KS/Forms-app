"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinFormPage() {
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!joinCode) {
      setError("Please enter a join code.");
      return;
    }

    try {
      const res = await fetch("/api/forms/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ joinCode }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/forms/${data.formId}`);
      } else {
        const errorData = await res.json();
        setError(errorData.message || "Failed to join form. Please check the code.");
      }
    } catch (err) {
      console.error("Error joining form:", err);
      setError("An unexpected error occurred.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-8">Join a Collaborative Form</h1>
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <div className="mb-4">
          <label htmlFor="joinCode" className="block text-gray-700 text-sm font-bold mb-2">
            Enter Join Code:
          </label>
          <input
            type="text"
            id="joinCode"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="e.g., ABC-123"
          />
        </div>
        {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
        >
          Join Form
        </button>
      </form>
    </div>
  );
}