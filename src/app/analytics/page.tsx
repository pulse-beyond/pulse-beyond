import type { Metadata } from "next";
import { BarChart3, Eye, Heart, MessageCircle, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/analytics/stat-card";
import { PostTable } from "@/components/analytics/post-table";
import { CsvUploadButton } from "@/components/analytics/csv-upload-button";

export const metadata: Metadata = {
  title: "Analytics | Pulse Beyond",
  description: "Track your LinkedIn newsletter performance over time",
};

export default function AnalyticsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary mt-0.5">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Track your LinkedIn post performance over time.
            </p>
          </div>
        </div>
        <CsvUploadButton />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Posts"
          value="24"
          delta="4 this month"
          deltaPositive={true}
          icon={BarChart3}
        />
        <StatCard
          label="Avg Impressions"
          value="4,637"
          delta="12% vs last month"
          deltaPositive={true}
          icon={Eye}
        />
        <StatCard
          label="Avg Eng. Rate"
          value="4.2%"
          delta="0.3pp vs last month"
          deltaPositive={true}
          icon={TrendingUp}
        />
        <StatCard
          label="Top Topic"
          value="Tech"
          delta="5.3% avg eng."
          deltaPositive={true}
          icon={Heart}
        />
      </div>

      {/* Filters + Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Post Performance</h2>
          <div className="flex items-center gap-2">
            <select className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">All periods</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="180">Last 6 months</option>
              <option value="365">Last year</option>
            </select>
            <select className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">All topics</option>
              <option value="Finance">Finance</option>
              <option value="Tech">Tech</option>
              <option value="Leadership">Leadership</option>
              <option value="Business">Business</option>
            </select>
          </div>
        </div>
        <PostTable />
      </div>
    </div>
  );
}
