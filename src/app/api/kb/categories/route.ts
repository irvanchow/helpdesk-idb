import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const admin = searchParams.get("admin");

    const session = await auth();
    const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "AGENT";

    const where: any = {};
    if (!admin || !isAdmin) {
      where.isActive = true;
    }

    const categories = await prisma.kBCategory.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            articles: admin && isAdmin ? {} : { where: { isPublished: true } },
          },
        },
      },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error("GET kb/categories error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, icon } = body;

    const category = await prisma.kBCategory.create({
      data: { name, description, icon },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("POST kb/categories error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
