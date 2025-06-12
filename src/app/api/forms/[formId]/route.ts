import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { nanoid } from "nanoid";

interface FormField {
  id?: string; // id is optional for new fields
  type: string;
  label: string;
  options?: string[];
}

export async function GET(
  req: Request,
  { params }: { params: { formId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { formId } = await params;

    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        fields: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sharedResponse: true,
      },
    });

    if (!form) {
      return NextResponse.json({ message: "Form not found" }, { status: 404 });
    }

    return NextResponse.json(form);
  } catch (error) {
    console.error("Error fetching form:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { formId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { formId } = await params;
    const { title, description, fields } = await req.json();

    if (!title || !fields || !Array.isArray(fields)) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Fetch existing form to compare fields
    const existingForm = await prisma.form.findUnique({
      where: { id: formId },
      include: { fields: true },
    });

    if (!existingForm) {
      return NextResponse.json({ message: "Form not found" }, { status: 404 });
    }

    const existingFieldIds = new Set(existingForm.fields.map((f) => f.id));
    const incomingFieldIds = new Set(fields.map((f: FormField) => f.id).filter(Boolean));

    // Fields to delete
    const fieldsToDelete = existingForm.fields.filter(
      (field) => !incomingFieldIds.has(field.id)
    );

    // Fields to update or create
    const fieldUpdates = fields.map((field: FormField) => {
      if (field.id && existingFieldIds.has(field.id)) {
        // Update existing field
        return prisma.field.update({
          where: { id: field.id },
          data: {
            type: field.type,
            label: field.label,
            options: field.options || [],
          },
        });
      } else {
        // Create new field
        return prisma.field.create({
          data: {
            formId: formId,
            type: field.type,
            label: field.label,
            options: field.options || [],
          },
        });
      }
    });

    // Delete fields that are no longer present
    const deleteOperations = fieldsToDelete.map((field) =>
      prisma.field.delete({ where: { id: field.id } })
    );

    await prisma.$transaction([...deleteOperations, ...fieldUpdates]);

    const updatedForm = await prisma.form.update({
      where: { id: formId },
      data: {
        title,
        description,
      },
      include: {
        fields: true,
      },
    });

    return NextResponse.json(updatedForm);
  } catch (error) {
    console.error("Error updating form:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { formId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { formId } = await params;

    await prisma.form.delete({
      where: { id: formId },
    });

    return NextResponse.json({ message: "Form deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting form:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { formId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { formId } = params;
    const { action } = await req.json();

    if (action === "generateJoinCode") {
      const newJoinCode = nanoid(8); // Generate an 8-character unique join code

      const updatedForm = await prisma.form.update({
        where: { id: formId },
        data: {
          joinCode: newJoinCode,
        },
        select: {
          id: true,
          joinCode: true,
        },
      });
      return NextResponse.json(updatedForm, { status: 200 });
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating form with PATCH:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}