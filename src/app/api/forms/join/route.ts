import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { joinCode } = await req.json();

    if (!joinCode) {
      return NextResponse.json({ message: "Join code is required" }, { status: 400 });
    }

    // Find the form associated with the join code
    const form = await prisma.form.findUnique({
      where: { joinCode: joinCode },
      select: { id: true }, // Only need the form ID
    });

    if (!form) {
      return NextResponse.json({ message: "Invalid or expired join code" }, { status: 404 });
    }

    // Redirect to the collaborative form page
    // In a real application, you might want to create a session or record the user joining
    return NextResponse.json({ formId: form.id }, { status: 200 });
  } catch (error) {
    console.error("Error joining form:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}