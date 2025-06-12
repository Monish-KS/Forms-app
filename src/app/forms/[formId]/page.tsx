"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getSocket, onUserListUpdate, UserPresence } from "@/lib/socket";
import { useFormStore } from "@/lib/store";
import { Socket } from "socket.io-client";
import { use } from "react";

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

export default function CollaborativeFormPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const { fields, sharedResponse, lockedFields, setForm, updateField, lockField, unlockField } = useFormStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isFormLoading, setIsFormLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    const fetchForm = async () => {
      try {
        setIsFormLoading(true);
        setFormError(null);
        const res = await fetch(`/api/forms/${formId}`);
        if (res.ok) {
          const form: Form = await res.json();
          setForm(form.id, form.fields, form.sharedResponse?.values || {});
        } else {
          const errorText = await res.text();
          console.error("Failed to fetch form:", errorText);
          setFormError(`Failed to load form: ${res.status}`);
          if (res.status === 404) {
            router.push("/"); // Redirect if form not found
          }
        }
      } catch (error) {
        console.error("Error fetching form:", error);
        setFormError("Network error while loading form");
      } finally {
        setIsFormLoading(false);
      }
    };

    fetchForm();

    // Initialize Socket.IO
    const newSocket = getSocket();
    setSocket(newSocket);

    // Emit join-form with user details
    newSocket.emit("join-form", {
      formId,
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
    });

    const unsubscribeUserList = onUserListUpdate((users) => {
      setActiveUsers(users);
    });

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
      unsubscribeUserList();
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

  if (isFormLoading) {
    return <p>Loading form details...</p>;
  }

  if (formError) {
    return <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <p className="text-red-500 mb-4">Error: {formError}</p>
      <button 
        onClick={() => window.location.reload()} 
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Retry
      </button>
    </div>;
  }

  if (!formId || fields.length === 0) {
    return <p>No form data available.</p>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-8">
      <h1 className="text-4xl font-bold mb-8">Collaborative Form: {formId}</h1>

      {activeUsers.length > 0 && (
        <div className="mb-4 p-3 bg-blue-100 rounded-lg w-full max-w-2xl">
          <p className="text-blue-800 text-sm font-semibold">
            Active Users:{" "}
            {activeUsers.map((user, index) => (
              <span key={user.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-200 text-blue-800 mr-2">
                {user.name || user.email}
                {user.id === session.user?.id && " (You)"}
              </span>
            ))}
          </p>
        </div>
      )}

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