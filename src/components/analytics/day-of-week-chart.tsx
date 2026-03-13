"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DayOfWeekMetric {
  day: string;
  impressions: number;
  engagements: number;
  engagementRate: number;
  count: number;
}

interface Props {
  data: DayOfWeekMetric[];
}

const DAY_ORDER = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return String(n);
}

export function DayOfWeekChart({ data }: Props) {
  const sorted = [...data].sort(
    (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
  );

  const chartData = sorted.map((d) => ({
    dia: d.day.slice(0, 3), // "Seg", "Ter"...
    Impressões: d.impressions,
    Engajamentos: d.engagements,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
        <XAxis
          dataKey="dia"
          tick={{ fontSize: 12, fill: "#888" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="left"
          orientation="left"
          tickFormatter={formatNumber}
          tick={{ fontSize: 11, fill: "#888" }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickFormatter={formatNumber}
          tick={{ fontSize: 11, fill: "#888" }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          formatter={(value, name) => [
            typeof value === "number" ? value.toLocaleString("pt-BR") : value,
            name,
          ]}
          contentStyle={{
            fontSize: 13,
            borderRadius: 8,
            border: "1px solid #e5e7eb",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
        <Bar yAxisId="left" dataKey="Impressões" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
        <Bar yAxisId="right" dataKey="Engajamentos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
