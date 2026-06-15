import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateTicketSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "ESCALATED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assignedToId: z.string().optional().nullable(),
  rating: z.number().min(1).max(5).optional(),
  feedback: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        category: true,
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        onBehalfOf: { select: { id: true, name: true, email: true } },
        comments: {
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        attachments: {
          include: {
            uploadedBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Check permissions
    const userId = session.user.id;
    const role = session.user.role;

    let isDeptHead = false;
    if (role === "DEPARTMENT_HEAD") {
      const deptUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { department: true },
      });
      isDeptHead = !!deptUser?.department && deptUser.department === (ticket as any).category?.department;
    }

    const hasAccess =
      role === "ADMIN" ||
      role === "IT_SUPPORT" ||
      isDeptHead ||
      ticket.assignedToId === userId ||
      ticket.createdById === userId ||
      ticket.onBehalfOfId === userId;

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Filter internal comments for regular users
    let filteredComments = ticket.comments;
    if (role !== "ADMIN" && role !== "IT_SUPPORT" && role !== "DEPARTMENT_HEAD") {
      filteredComments = ticket.comments.filter((c) => !c.isInternal);
    }

    return NextResponse.json({ ...ticket, comments: filteredComments });
  } catch (error) {
    console.error("GET ticket error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const validated = updateTicketSchema.parse(body);

    const userId = session.user.id;
    const role = session.user.role;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Check permissions
    let deptHeadCanUpdate = false;
    if (role === "DEPARTMENT_HEAD") {
      const deptUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { department: true },
      });
      deptHeadCanUpdate =
        !!deptUser?.department &&
        deptUser.department === (ticket as any).category?.department;
    }

    const canUpdate =
      role === "ADMIN" ||
      deptHeadCanUpdate ||
      role === "IT_SUPPORT";

    if (!canUpdate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: any = { ...validated };

    // Track first response
    if (
      validated.status === "IN_PROGRESS" &&
      !ticket.firstResponseAt &&
      (role === "IT_SUPPORT" || role === "DEPARTMENT_HEAD")
    ) {
      updateData.firstResponseAt = new Date();
      
      // Check response SLA
      const createdAt = new Date(ticket.createdAt);
      const now = new Date();
      const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursElapsed > ticket.category.responseTimeHours) {
        updateData.responseSlaBreached = true;
      }
    }

    // Track resolved time and check SLA
    if (validated.status === "RESOLVED") {
      updateData.resolvedAt = new Date();
      
      const createdAt = new Date(ticket.createdAt);
      const now = new Date();
      const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursElapsed > ticket.category.resolveTimeHours) {
        updateData.slaBreached = true;
      }
    }

    // Track closed time
    if (validated.status === "CLOSED") {
      updateData.closedAt = new Date();
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    // Notifikasi ke assignee baru jika assignedToId berubah
    if (
      validated.assignedToId !== undefined &&
      validated.assignedToId !== ticket.assignedToId &&
      validated.assignedToId
    ) {
      await prisma.notification.create({
        data: {
          userId: validated.assignedToId,
          ticketId: id,
          type: "TICKET_ASSIGNED",
          message: `Tiket ${ticket.ticketNumber} — "${ticket.title}" telah di-assign ke Anda.`,
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("PATCH ticket error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
