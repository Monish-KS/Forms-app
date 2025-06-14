import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next"; // Changed this line
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { formId } = await params;

    const sharedResponse = await prisma.sharedResponse.findUnique({
      where: { formId: formId },
    });

    if (!sharedResponse) {
      // If no shared response exists, create an empty one
      const newSharedResponse = await prisma.sharedResponse.create({
        data: {
          formId: formId,
          values: {}, // Initialize with an empty JSON object
        },
      });
      return NextResponse.json(newSharedResponse);
    }

    return NextResponse.json(sharedResponse);
  } catch (error: unknown) {
    console.error("Error fetching shared response:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch shared response",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { formId } = await params;
    const { values } = await req.json();

    if (typeof values !== "object" || values === null) {
      return NextResponse.json({ message: "Invalid values format" }, { status: 400 });
    }

    const updatedResponse = await prisma.sharedResponse.upsert({
      where: { formId: formId },
      update: {
        values: values,
      },
      create: {
        formId: formId,
        values: values,
      },
    });

    return NextResponse.json(updatedResponse);
  } catch (error: unknown) {
    console.error("Error updating shared response:", error);
    return NextResponse.json(
      {
        message: "Failed to update shared response",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}