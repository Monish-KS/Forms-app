"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import { useFormStore } from "@/lib/store";
import { Socket } from "socket.io-client";

interface FormField {
  id: string;
  type: string;
  label: string;
  options?: string[];
}

interface Form {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  sharedResponse?: {
    id: string;
    values: { [key: string]: string | number | boolean | string[] };
  };
}

export default function CollaborativeFormPage({ params }: { params: { formId: string } }) {
  const { formId } = params; // This line is causing the error
  // To fix this, we need to unwrap params using React.use()
  // const { formId } = React.use(Promise.resolve(params)); // Example of how it might be used in a server component
  // However, since this is a client component, we need to ensure params is not a Promise.
  // The error message indicates it's a warning for migration, so direct access might still work for now,
  // but it's better to address the root cause or ensure it's not a Promise.
  // For now, let's assume params is directly accessible as per the current setup,
  // and the warning is just a heads-up for future Next.js versions.
  // If it truly is a Promise, the structure of the page component might need to change
  // to be a server component or fetch the formId differently.

  // Given the error, it seems `params` is indeed being treated as a Promise.
  // Let's try to destructure it directly, as the warning suggests it's still supported for migration.
  // If the issue persists, we might need to re-evaluate the component's rendering environment.
  const { data: session, status } = useSession();
  const router = useRouter();
  const { fields, sharedResponse, lockedFields, setForm, updateField, lockField, unlockField } = useFormStore();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    const fetchForm = async () => {
      const res = await fetch(`/api/forms/${formId}`);
      if (res.ok) {
        const form: Form = await res.json();
        setForm(form.id, form.fields, form.sharedResponse?.values || {});
      } else {
        console.error("Failed to fetch form");
        router.push("/"); // Redirect if form not found or error
      }
    };

    fetchForm();

    // Initialize Socket.IO
    const newSocket = getSocket();
    setSocket(newSocket);

    newSocket.emit("join-form", formId);

    newSocket.on("field-update", (data: { formId: string; fieldId: string; value: string | number | boolean | string[] }) => {
      if (data.formId === formId) {
        updateField(data.fieldId, data.value);
      }
    });

    newSocket.on("field-lock", (data: { formId: string; fieldId: string; userId: string }) => {
      if (data.formId === formId) {
        lockField(data.fieldId, data.userId);
      }
    });

    newSocket.on("field-unlock", (data: { formId: string; fieldId: string; userId: string }) => {
      if (data.formId === formId) {
        unlockField(data.fieldId);
      }
    });

    return () => {
      newSocket.off("field-update");
      newSocket.off("field-lock");
      newSocket.off("field-unlock");
      // Consider leaving the room or disconnecting if necessary
    };
  }, [formId, session, status, router, setForm, updateField, lockField, unlockField]);

  const handleFieldChange = (fieldId: string, value: string | number | boolean | string[]) => {
    if (!socket || !session?.user?.id) return;

    // Optimistic update
    updateField(fieldId, value);

    // Emit update to server
    socket.emit("field-update", { formId, fieldId, value });

    debouncedSave(formId, { ...sharedResponse, [fieldId]: value });
  };

  const debouncedSave = useCallback(
    debounce(async (currentFormId: string, currentSharedResponse: { [key: string]: string | number | boolean | string[] }) => {
      console.log("Saving to DB:", currentFormId, currentSharedResponse);
      const res = await fetch(`/api/forms/${currentFormId}/response`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: currentSharedResponse }),
      });

      if (!res.ok) {
        console.error("Failed to save shared response", await res.text());
      }
    }, 1000), // Debounce for 1 second
    []
  );

  // Simple debounce function
  function debounce<Args extends unknown[]>(func: (...args: Args) => unknown, delay: number): (...args: Args) => void {
    let timeout: NodeJS.Timeout;
    return ((...args: Args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    });
  }

  const handleFieldFocus = (fieldId: string) => {
    if (!socket || !session?.user?.id) return;
    socket.emit("field-lock", { formId, fieldId, userId: session.user.id });
  };

  const handleFieldBlur = (fieldId: string) => {
    if (!socket || !session?.user?.id) return;
    socket.emit("field-unlock", { formId, fieldId, userId: session.user.id });
  };

  if (status === "loading" || !session) {
    return <p>Loading form...</p>;
  }

  if (!formId || fields.length === 0) {
    return <p>Loading form details...</p>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-8">
      <h1 className="text-4xl font-bold mb-8">Collaborative Form: {formId}</h1>
      <div className="w-full max-w-2xl p-8 border rounded-lg shadow-lg bg-white">
        {fields.map((field) => (
          <div key={field.id} className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              {field.label}
              {lockedFields[field.id] && lockedFields[field.id] !== session.user?.id && (
                <span className="ml-2 text-red-500 text-xs">
                  (Locked by {lockedFields[field.id]})
                </span>
              )}
            </label>
            {field.type === "text" && (
              <input
                type="text"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={(sharedResponse[field.id] as string) || ""}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                onFocus={() => handleFieldFocus(field.id)}
                onBlur={() => handleFieldBlur(field.id)}
                disabled={!!lockedFields[field.id] && lockedFields[field.id] !== session.user?.id}
              />
            )}
            {field.type === "number" && (
              <input
                type="number"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={(sharedResponse[field.id] as number) || ""}
                onChange={(e) => handleFieldChange(field.id, parseFloat(e.target.value))}
                onFocus={() => handleFieldFocus(field.id)}
                onBlur={() => handleFieldBlur(field.id)}
                disabled={!!lockedFields[field.id] && lockedFields[field.id] !== session.user?.id}
              />
            )}
            {field.type === "dropdown" && (
              <select
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={(sharedResponse[field.id] as string) || ""}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                onFocus={() => handleFieldFocus(field.id)}
                onBlur={() => handleFieldBlur(field.id)}
                disabled={!!lockedFields[field.id] && lockedFields[field.id] !== session.user?.id}
              >
                <option value="">Select an option</option>
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}