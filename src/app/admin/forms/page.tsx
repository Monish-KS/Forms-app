"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import FormEditor from "@/components/forms/FormEditor";

interface FormField {
  id?: string;
  type: string;
  label: string;
  options?: string[];
}

interface Form {
  id: string;
  title: string;
  description?: string;
  joinCode?: string; // Add joinCode here
  fields: FormField[];
  createdById: string;
  createdBy: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
}

export default function AdminFormsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // Do nothing while loading
    const user = session?.user as { role?: string } | undefined;
    if (!session || !user?.role || user.role !== "admin") {
      router.push("/auth/signin"); // Redirect to sign-in if not authenticated or not admin
    }
  }, [session, status, router]);

  const [forms, setForms] = useState<Form[]>([]);
  const [editingForm, setEditingForm] = useState<Form | null>(null);
  const [showFormEditor, setShowFormEditor] = useState(false);

  const fetchForms = async () => {
    const res = await fetch("/api/forms");
    if (res.ok) {
      const data = await res.json();
      setForms(data);
    } else {
      console.error("Failed to fetch forms");
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    const user = session?.user as { role?: string } | undefined;
    if (!session || !user?.role || user.role !== "admin") {
      router.push("/auth/signin");
    } else {
      fetchForms();
    }
  }, [session, status, router]);

  const handleCreateForm = async (formData: { title: string; description?: string; fields: FormField[] }) => {
    const res = await fetch("/api/forms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      fetchForms();
      setShowFormEditor(false);
    } else {
      console.error("Failed to create form");
    }
  };

  const handleUpdateForm = async (formData: { title: string; description?: string; fields: FormField[] }) => {
    if (!editingForm) return;
    const res = await fetch(`/api/forms/${editingForm.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      fetchForms();
      setShowFormEditor(false);
      setEditingForm(null);
    } else {
      console.error("Failed to update form");
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (window.confirm("Are you sure you want to delete this form?")) {
      const res = await fetch(`/api/forms/${formId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchForms();
      } else {
        console.error("Failed to delete form");
      }
    }
  };

  const user = session?.user as { role?: string } | undefined;
  if (status === "loading" || !session || !user?.role || user.role !== "admin") {
    return <p>Loading admin dashboard...</p>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-8">
      <h1 className="text-4xl font-bold mb-8">Admin Forms Management</h1>
      <p className="text-xl mb-4">Welcome to the admin dashboard, {session.user?.name}!</p>

      <button
        onClick={() => {
          setEditingForm(null);
          setShowFormEditor(true);
        }}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-6"
      >
        Create New Form
      </button>

      {showFormEditor && (
        <FormEditor
          form={editingForm}
          onSave={editingForm ? handleUpdateForm : handleCreateForm}
          onCancel={() => {
            setShowFormEditor(false);
            setEditingForm(null);
          }}
        />
      )}

      <div className="w-full max-w-2xl mt-8">
        <h2 className="text-2xl font-bold mb-4">Existing Forms</h2>
        {forms.length === 0 ? (
          <p>No forms created yet.</p>
        ) : (
          <ul className="space-y-4">
            {forms.map((form: Form) => (
              <li key={form.id} className="border p-4 rounded-lg shadow bg-gray-50 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold">{form.title}</h3>
                  <p className="text-gray-600">{form.description}</p>
                  {form.joinCode && (
                    <p className="text-sm text-gray-700">
                      Join Code: <span className="font-mono bg-gray-200 px-1 rounded">{form.joinCode}</span>
                    </p>
                  )}
                  <p className="text-sm text-gray-500">Created by: {form.createdBy?.name || form.createdBy?.email}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleGenerateJoinCode(form.id)}
                    className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-1 px-3 rounded text-sm"
                  >
                    Generate New Join Code
                  </button>
                  <button
                    onClick={() => {
                      setEditingForm(form);
                      setShowFormEditor(true);
                    }}
                    className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-3 rounded text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteForm(form.id)}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  async function handleGenerateJoinCode(formId: string) {
    if (!window.confirm("Are you sure you want to generate a new join code for this form? The old one will become invalid.")) {
      return;
    }

    try {
      const res = await fetch(`/api/forms/${formId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "generateJoinCode" }),
      });

      if (res.ok) {
        const updatedForm = await res.json();
        setForms((prevForms) =>
          prevForms.map((form) =>
            form.id === updatedForm.id ? { ...form, joinCode: updatedForm.joinCode } : form
          )
        );
        alert(`New Join Code generated: ${updatedForm.joinCode}`);
      } else {
        const errorData = await res.json();
        alert(`Failed to generate new join code: ${errorData.message || "Unknown error"}`);
        console.error("Failed to generate new join code:", errorData);
      }
    } catch (error) {
      alert("An unexpected error occurred while generating a new join code.");
      console.error("Error generating new join code:", error);
    }
  }
}