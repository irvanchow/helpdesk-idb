"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  ticketCount: number;
  avgRating: number | null;
}

interface Props {
  data: AgentPerformance[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-md text-xs">
      <p className="font-semibold text-[#1E293B] mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: <span className="font-bold">{entry.value ?? "-"}</span>
        </p>
      ))}
    </div>
  );
};

export function AgentPerformanceChart({ data }: Props) {
  const chartData = data.map((d) => ({
    name: d.agentName.split(" ").slice(0, 2).join(" "),
    Tiket: d.ticketCount,
    Rating: d.avgRating,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 4, right: 24, left: 0, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12, fill: "#64748B" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="tiket"
          orientation="left"
          tick={{ fontSize: 11, fill: "#94A3B8" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          label={{ value: "Tiket", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 10, fill: "#94A3B8" } }}
        />
        <YAxis
          yAxisId="rating"
          orientation="right"
          domain={[0, 5]}
          tick={{ fontSize: 11, fill: "#94A3B8" }}
          axisLine={false}
          tickLine={false}
          label={{ value: "Rating", angle: 90, position: "insideRight", offset: 10, style: { fontSize: 10, fill: "#94A3B8" } }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
        <Bar yAxisId="tiket" dataKey="Tiket" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Bar yAxisId="rating" dataKey="Rating" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
