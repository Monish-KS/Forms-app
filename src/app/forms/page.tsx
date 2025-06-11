"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Form {
  id: string;
  title: string;
  description?: string;
}

export default function FormsListPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    const fetchForms = async () => {
      try {
        const res = await fetch("/api/forms");
        if (res.ok) {
          const data = await res.json();
          setForms(data);
        } else {
          setError("Failed to fetch forms.");
          console.error("Failed to fetch forms:", await res.text());
        }
      } catch (err) {
        setError("An unexpected error occurred.");
        console.error("An unexpected error occurred:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchForms();
  }, [session, status, router]);

  if (loading || status === "loading") {
    return <p>Loading forms...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (!session) {
    return <p>Please sign in to view forms.</p>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-8">
      <h1 className="text-4xl font-bold mb-8">Available Forms</h1>
      <div className="w-full max-w-2xl">
        {forms.length === 0 ? (
          <p>No forms available yet.</p>
        ) : (
          <ul className="space-y-4">
            {forms.map((form) => (
              <li key={form.id} className="p-4 border rounded-lg shadow-sm bg-white flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">{form.title}</h2>
                  {form.description && <p className="text-gray-600">{form.description}</p>}
                </div>
                <Link href={`/forms/${form.id}`} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                  Open Form
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}