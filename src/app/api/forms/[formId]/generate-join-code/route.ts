import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Function to generate a simple alphanumeric join code
function generateJoinCode(length: number = 6): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export async function POST(
  req: Request,
  { params }: { params: { formId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "admin") {
      return new NextResponse(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { formId } = params;

    // Generate a unique join code
    let newJoinCode: string;
    let isUnique = false;
    while (!isUnique) {
      newJoinCode = generateJoinCode();
      const existingForm = await prisma.form.findUnique({
        where: { joinCode: newJoinCode },
      });
      if (!existingForm) {
        isUnique = true;
      }
    }

    const updatedForm = await prisma.form.update({
      where: { id: formId },
      data: { joinCode: newJoinCode },
    });

    return new NextResponse(JSON.stringify(updatedForm), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating join code:", error);
    return new NextResponse(
      JSON.stringify({ message: "Failed to generate join code" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}