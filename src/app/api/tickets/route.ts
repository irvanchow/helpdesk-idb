import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const attachmentSchema = z.object({
  fileName: z.string(),
  fileUrl: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
});

const createTicketSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  categoryId: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  onBehalfOfId: z.string().optional(),
  attachments: z.array(attachmentSchema).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const search = searchParams.get("search");

    const userId = session.user.id;
    const role = session.user.role;

    let where: any = {};

    if (role === "ADMIN" || role === "EXECUTIVE") {
      // Admin and Executive see all tickets
    } else if (role === "AGENT") {
      // Agent sees: tickets in their department's categories + assigned to them + created by them
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { department: true },
      });
      if (user?.department) {
        where = {
          OR: [
            { assignedToId: userId },
            { createdById: userId },
            { category: { department: user.department } },
          ],
        };
      } else {
        where = {
          OR: [{ assignedToId: userId }, { createdById: userId }],
        };
      }
    } else if (role === "SUPERVISOR") {
      // Supervisor sees all tickets in their department's categories
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { department: true },
      });
      if (user?.department) {
        where = {
          OR: [
            { assignedToId: userId },
            { createdById: userId },
            { category: { department: user.department } },
          ],
        };
      } else {
        where = {
          OR: [{ assignedToId: userId }, { createdById: userId }],
        };
      }
    } else {
      where = {
        OR: [{ createdById: userId }, { onBehalfOfId: userId }],
      };
    }

    if (status) {
      where.status = status;
    }
    if (priority) {
      where.priority = priority;
    }
    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        category: true,
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        onBehalfOf: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tickets);
  } catch (error) {
    console.error("GET tickets error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = createTicketSchema.parse(body);

    const userId = session.user.id;
    const role = session.user.role;

    // Generate ticket number: TKT-YYYY-NNNNN
    const year = new Date().getFullYear();
    const count = await prisma.ticket.count({
      where: {
        createdAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
    });
    const ticketNumber = `TKT-${year}-${String(count + 1).padStart(5, "0")}`;

    // Only admin/agent/supervisor can create on behalf of another user
    const onBehalfOfId =
      validated.onBehalfOfId &&
      (role === "ADMIN" || role === "AGENT" || role === "SUPERVISOR")
        ? validated.onBehalfOfId
        : null;

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        title: validated.title,
        description: validated.description,
        categoryId: validated.categoryId,
        priority: validated.priority,
        createdById: userId,
        onBehalfOfId: onBehalfOfId || undefined,
        status: "OPEN",
      },
      include: {
        category: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (validated.attachments?.length) {
      await prisma.ticketAttachment.createMany({
        data: validated.attachments.map((a) => ({
          ticketId: ticket.id,
          fileName: a.fileName,
          fileUrl: a.fileUrl,
          fileSize: a.fileSize,
          mimeType: a.mimeType,
          uploadedById: userId,
        })),
      });
    }

    // Kirim notifikasi ke penerima yang relevan
    const categoryDept = (ticket.category as any).department as string | null;
    const creatorName = ticket.createdBy.name;
    const notifMessage = `Tiket baru dari ${creatorName}: ${ticket.ticketNumber} — ${ticket.title}`;

    // Auto-assign: ke SUPERVISOR yang departemennya sesuai kategori
    // Khusus kategori IT Support: tidak auto-assign (ditangani manual oleh tim IT)
    let autoAssignedId: string | null = null;
    if (categoryDept && categoryDept !== "Sistem Informasi & IT Support") {
      const supervisor = await prisma.user.findFirst({
        where: {
          role: "SUPERVISOR",
          department: categoryDept,
          isActive: true,
        },
        select: { id: true },
      });
      if (supervisor) {
        autoAssignedId = supervisor.id;
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { assignedToId: supervisor.id },
        });
      }
    }

    const recipients = await prisma.user.findMany({
      where: {
        isActive: true,
        id: { not: userId },
        OR: [
          { role: "ADMIN" },
          { role: "EXECUTIVE" },
          ...(categoryDept === "Sistem Informasi & IT Support"
            ? [{ role: "AGENT" as const }]
            : []),
          ...(categoryDept
            ? [{ role: "SUPERVISOR" as const, department: categoryDept }]
            : []),
        ],
      },
      select: { id: true },
    });

    const notifRecipients = recipients.map((r) => ({
      userId: r.id,
      ticketId: ticket.id,
      type: "NEW_TICKET",
      message: notifMessage,
    }));

    // Notifikasi TICKET_ASSIGNED ke department head yang di-auto-assign
    if (autoAssignedId && autoAssignedId !== userId) {
      notifRecipients.push({
        userId: autoAssignedId,
        ticketId: ticket.id,
        type: "TICKET_ASSIGNED",
        message: `Tiket ${ticket.ticketNumber} — "${ticket.title}" telah di-assign ke Anda secara otomatis.`,
      });
    }

    if (notifRecipients.length > 0) {
      await prisma.notification.createMany({
        data: notifRecipients,
      });
    }

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("POST ticket error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
