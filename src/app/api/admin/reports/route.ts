import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    const role = session?.user?.role;
    if (!session?.user?.id || (role !== "ADMIN" && role !== "EXECUTIVE")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      statusCounts,
      priorityCounts,
      categoryCounts,
      slaStats,
      technicianStats,
      ticketsLast7Days,
      ticketsLast30Days,
      avgResolutionTime,
      totalTickets,
      openTickets,
      technicianTickets,
    ] = await Promise.all([
      // Tickets by status
      prisma.ticket.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      // Tickets by priority
      prisma.ticket.groupBy({
        by: ["priority"],
        _count: { id: true },
      }),
      // Tickets by category
      prisma.ticket.groupBy({
        by: ["categoryId"],
        _count: { id: true },
      }),
      // SLA breach stats
      prisma.ticket.aggregate({
        _count: { id: true },
        where: { slaBreached: true },
      }),
      // Technician performance (resolved tickets)
      prisma.ticket.groupBy({
        by: ["assignedToId"],
        where: {
          assignedToId: { not: null },
          status: { in: ["RESOLVED", "CLOSED"] },
        },
        _count: { id: true },
      }),
      // Tickets created last 7 days
      prisma.ticket.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true, status: true },
        orderBy: { createdAt: "asc" },
      }),
      // Tickets created last 30 days
      prisma.ticket.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, status: true },
        orderBy: { createdAt: "asc" },
      }),
      // Average resolution time
      prisma.ticket.findMany({
        where: { resolvedAt: { not: null } },
        select: { createdAt: true, resolvedAt: true },
      }),
      // Total tickets
      prisma.ticket.count(),
      // Open tickets
      prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      // All tickets with technician data for detailed metrics
      prisma.ticket.findMany({
        where: { assignedToId: { not: null } },
        select: {
          assignedToId: true,
          assignedTo: { select: { name: true } },
          createdAt: true,
          resolvedAt: true,
          firstResponseAt: true,
          slaBreached: true,
          rating: true,
          status: true,
        },
      }),
    ]);

    // Get category names
    const categories = await prisma.category.findMany({
      select: { id: true, name: true },
    });
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    // Calculate overall avg resolution hours
    let avgResolutionHours = 0;
    if (avgResolutionTime.length > 0) {
      const totalHours = avgResolutionTime.reduce((sum, ticket) => {
        const created = new Date(ticket.createdAt);
        const resolved = new Date(ticket.resolvedAt!);
        return sum + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
      }, 0);
      avgResolutionHours = Math.round(totalHours / avgResolutionTime.length);
    }

    // Calculate technician performance metrics
    const techMetrics: Record<string, {
      name: string;
      resolvedCount: number;
      totalAssigned: number;
      avgResponseHours: number;
      avgResolutionHours: number;
      avgRating: number;
      slaCompliantCount: number;
      slaComplianceRate: number;
      escalationCount: number;
      escalationRate: number;
    }> = {};

    technicianTickets.forEach((ticket) => {
      const techId = ticket.assignedToId!;
      if (!techMetrics[techId]) {
        techMetrics[techId] = {
          name: ticket.assignedTo?.name || "Unknown",
          resolvedCount: 0,
          totalAssigned: 0,
          avgResponseHours: 0,
          avgResolutionHours: 0,
          avgRating: 0,
          slaCompliantCount: 0,
          slaComplianceRate: 0,
          escalationCount: 0,
          escalationRate: 0,
        };
      }

      const metrics = techMetrics[techId];
      metrics.totalAssigned++;

      if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") {
        metrics.resolvedCount++;
      }

      if (ticket.status === "ESCALATED") {
        metrics.escalationCount++;
      }

      if (!ticket.slaBreached) {
        metrics.slaCompliantCount++;
      }
    });

    // Calculate averages per technician
    Object.keys(techMetrics).forEach((techId) => {
      const metrics = techMetrics[techId];

      // Response time: assigned to first response
      const responseTimes: number[] = [];
      const resolutionTimes: number[] = [];
      const ratings: number[] = [];

      technicianTickets
        .filter((t) => t.assignedToId === techId)
        .forEach((ticket) => {
          if (ticket.firstResponseAt) {
            const assigned = new Date(ticket.createdAt);
            const firstResponse = new Date(ticket.firstResponseAt);
            responseTimes.push(
              (firstResponse.getTime() - assigned.getTime()) / (1000 * 60 * 60)
            );
          }

          if (ticket.resolvedAt) {
            const assigned = new Date(ticket.createdAt);
            const resolved = new Date(ticket.resolvedAt);
            resolutionTimes.push(
              (resolved.getTime() - assigned.getTime()) / (1000 * 60 * 60)
            );
          }

          if (ticket.rating) {
            ratings.push(ticket.rating);
          }
        });

      metrics.avgResponseHours =
        responseTimes.length > 0
          ? Math.round(
              responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            )
          : 0;

      metrics.avgResolutionHours =
        resolutionTimes.length > 0
          ? Math.round(
              resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
            )
          : 0;

      metrics.avgRating =
        ratings.length > 0
          ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
          : 0;

      metrics.slaComplianceRate =
        metrics.totalAssigned > 0
          ? Math.round((metrics.slaCompliantCount / metrics.totalAssigned) * 100)
          : 0;

      metrics.escalationRate =
        metrics.totalAssigned > 0
          ? Math.round((metrics.escalationCount / metrics.totalAssigned) * 100)
          : 0;
    });

    // Daily ticket counts for last 7 days
    const dailyCounts: Record<string, { created: number; resolved: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = date.toISOString().split("T")[0];
      dailyCounts[key] = { created: 0, resolved: 0 };
    }

    ticketsLast7Days.forEach((t) => {
      const key = new Date(t.createdAt).toISOString().split("T")[0];
      if (dailyCounts[key]) dailyCounts[key].created++;
    });

    ticketsLast30Days
      .filter((t) => t.status === "RESOLVED" || t.status === "CLOSED")
      .forEach((t) => {
        const key = new Date(t.createdAt).toISOString().split("T")[0];
        if (dailyCounts[key]) dailyCounts[key].resolved++;
      });

    return NextResponse.json({
      statusCounts: statusCounts.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      priorityCounts: priorityCounts.map((p) => ({
        priority: p.priority,
        count: p._count.id,
      })),
      categoryCounts: categoryCounts.map((c) => ({
        category: categoryMap.get(c.categoryId) || "Unknown",
        count: c._count.id,
      })),
      slaBreached: slaStats._count.id,
      totalTickets,
      openTickets,
      avgResolutionHours,
      technicianPerformance: Object.values(techMetrics).sort(
        (a, b) => b.resolvedCount - a.resolvedCount
      ),
      dailyTrends: Object.entries(dailyCounts).map(([date, counts]) => ({
        date,
        ...counts,
      })),
    });
  } catch (error) {
    console.error("GET admin/reports error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
