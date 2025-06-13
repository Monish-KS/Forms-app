import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { nanoid } from "nanoid";
import type { Session } from "next-auth";

interface FormField {
  type: string;
  label: string;
  options?: string[];
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const forms = await prisma.form.findMany({
      include: {
        fields: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(forms);
  } catch (error: unknown) {
    console.error("Error fetching forms:", error);
    return NextResponse.json({ message: "Failed to fetch forms", error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session: Session | null = await getServerSession(authOptions);
    console.log("Session in /api/forms POST:", session);

    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { title, description, fields } = await req.json();

    if (!title || !fields || !Array.isArray(fields)) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    if (!session.user?.id) {
      return NextResponse.json({ message: "User ID not found in session" }, { status: 401 });
    }

    const joinCode = nanoid(8); // Generate an 8-character unique join code

    const newForm = await prisma.form.create({
      data: {
        title,
        description,
        createdById: session.user.id,
        joinCode, // Add the generated join code
        fields: {
          create: fields.map((field: FormField) => ({
            type: field.type,
            label: field.label,
            options: field.options || [],
          })),
        },
      },
      include: {
        fields: true,
      },
    });

    return NextResponse.json(newForm, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating form:", error);
    return NextResponse.json({ message: "Failed to create form", error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}