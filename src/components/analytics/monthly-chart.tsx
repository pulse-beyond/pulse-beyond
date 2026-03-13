"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface MonthlyMetric {
  month: string;
  impressions: number;
  engagements: number;
  engagementRate: number;
}

interface Props {
  data: MonthlyMetric[];
}

function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1);
  return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return String(n);
}

export function MonthlyChart({ data }: Props) {
  const chartData = data.map((d) => ({
    month: formatMonth(d.month),
    Impressões: d.impressions,
    Engajamentos: d.engagements,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorEng" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.22} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
        <XAxis
          dataKey="month"
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
        <Legend
          wrapperStyle={{ fontSize: 13, paddingTop: 8 }}
        />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="Impressões"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#colorImp)"
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Area
          yAxisId="right"
          type="monotone"
          dataKey="Engajamentos"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#colorEng)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
