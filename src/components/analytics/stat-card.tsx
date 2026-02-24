import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  icon: LucideIcon;
}

export function StatCard({
  label,
  value,
  delta,
  deltaPositive = true,
  icon: Icon,
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {delta && (
              <p
                className={cn(
                  "text-xs font-medium",
                  deltaPositive ? "text-green-600" : "text-red-500"
                )}
              >
                {deltaPositive ? "↑" : "↓"} {delta}
              </p>
            )}
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
