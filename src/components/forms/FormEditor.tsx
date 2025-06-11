"use client";

import { useState } from "react";

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
  fields: FormField[];
}

interface FormEditorProps {
  form: Form | null; // Allow null for editing existing forms
  onSave: (form: { title: string; description?: string; fields: FormField[] }) => void;
  onCancel: () => void;
}

export default function FormEditor({ form, onSave, onCancel }: FormEditorProps) {
  const [title, setTitle] = useState(form?.title || "");
  const [description, setDescription] = useState(form?.description || "");
  const [fields, setFields] = useState<FormField[]>(form?.fields || []);

  const handleAddField = () => {
    setFields([...fields, { type: "text", label: "", options: [] }]);
  };

  const handleFieldChange = (index: number, key: keyof FormField, value: string | string[]) => {
    const newFields = [...fields];
    if (key === "options" && typeof value === "string") {
      newFields[index][key] = value.split(",").map((opt) => opt.trim());
    } else {
      (newFields[index] as any)[key] = value; // Still need any for dynamic key assignment
    }
    setFields(newFields);
  };

  const handleRemoveField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    setFields(newFields);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ title, description, fields });
  };

  return (
    <div className="p-8 border rounded-lg shadow-lg bg-white w-full max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">{form ? "Edit Form" : "Create New Form"}</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="title" className="block text-gray-700 text-sm font-bold mb-2">
            Title:
          </label>
          <input
            type="text"
            id="title"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">
            Description:
          </label>
          <textarea
            id="description"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <h3 className="text-xl font-semibold mb-4">Form Fields</h3>
        {fields.map((field, index) => (
          <div key={field.id || index} className="border p-4 mb-4 rounded-lg bg-gray-50">
            <div className="mb-2">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Field Type:
              </label>
              <select
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={field.type}
                onChange={(e) => handleFieldChange(index, "type", e.target.value)}
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="dropdown">Dropdown</option>
              </select>
            </div>
            <div className="mb-2">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Label:
              </label>
              <input
                type="text"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={field.label}
                onChange={(e) => handleFieldChange(index, "label", e.target.value)}
                required
              />
            </div>
            {field.type === "dropdown" && (
              <div className="mb-2">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Options (comma-separated):
                </label>
                <input
                  type="text"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={field.options?.join(", ") || ""}
                  onChange={(e) =>
                    handleFieldChange(
                      index,
                      "options",
                      e.target.value.split(",").map((opt) => opt.trim())
                    )
                  }
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => handleRemoveField(index)}
              className="mt-2 bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm"
            >
              Remove Field
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={handleAddField}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded mb-6"
        >
          Add Field
        </button>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Save Form
          </button>
        </div>
      </form>
    </div>
  );
}