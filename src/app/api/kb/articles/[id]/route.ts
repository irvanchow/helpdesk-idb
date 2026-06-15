import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 100);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const admin = searchParams.get("admin");

    const session = await auth();
    const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "IT_SUPPORT";

    const where: any = { OR: [{ id }, { slug: id }] };
    if (!admin || !isAdmin) {
      where.isPublished = true;
    }

    const article = await prisma.kBArticle.findFirst({
      where,
      include: {
        category: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
        tags: { include: { tag: { select: { name: true, slug: true } } } },
      },
    });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error("GET kb/articles/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== "ADMIN" && role !== "IT_SUPPORT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, content, excerpt, categoryId, isPublished, tags } = body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    if (title) {
      let slug = slugify(title);
      const existing = await prisma.kBArticle.findFirst({
        where: { slug, NOT: { id } },
      });
      if (existing) {
        slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
      }
      updateData.slug = slug;
    }

    const article = await prisma.kBArticle.update({
      where: { id },
      data: updateData,
    });

    if (tags) {
      await prisma.kBArticleTag.deleteMany({ where: { articleId: id } });
      for (const tagName of tags) {
        const tagSlug = slugify(tagName);
        const tag = await prisma.kBTag.upsert({
          where: { slug: tagSlug },
          update: {},
          create: { name: tagName, slug: tagSlug },
        });
        await prisma.kBArticleTag.create({
          data: { articleId: article.id, tagId: tag.id },
        });
      }
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error("PATCH kb/articles/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== "ADMIN" && role !== "IT_SUPPORT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.kBArticle.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE kb/articles/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
