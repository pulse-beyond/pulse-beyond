import type { Metadata } from "next";
import {
  BarChart3,
  Eye,
  TrendingUp,
  Users,
  UserPlus,
  BookOpen,
  Heart,
} from "lucide-react";
import { StatCard } from "@/components/analytics/stat-card";
import { PostTable } from "@/components/analytics/post-table";
import { ExcelUploadButton } from "@/components/analytics/excel-upload-button";
import { NewsletterUploadButton } from "@/components/analytics/newsletter-upload-button";
import { MonthlyChart } from "@/components/analytics/monthly-chart";
import { DayOfWeekChart } from "@/components/analytics/day-of-week-chart";
import { AiInsightsCard } from "@/components/analytics/ai-insights-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLinkedInSnapshot, getNewsletterStats } from "@/lib/actions/analytics";
import type {
  MonthlyMetric,
  DayOfWeekMetric,
  TopPost,
  Demographic,
} from "@/lib/actions/analytics";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Analytics | Snapshot Builder",
  description: "Acompanhe a performance dos seus posts no LinkedIn",
};

export default async function AnalyticsPage() {
  const [snapshot, newsletter] = await Promise.all([
    getLinkedInSnapshot(),
    getNewsletterStats(),
  ]);

  const hasData = !!snapshot;

  const monthlyMetrics = hasData ? ((snapshot!.monthlyMetrics as unknown) as MonthlyMetric[]) : [];
  const dayOfWeekMetrics = hasData ? ((snapshot!.dayOfWeekMetrics as unknown) as DayOfWeekMetric[]) : [];
  const topPosts = hasData ? (((snapshot!.topPosts as unknown) as TopPost[]).slice(0, 20)) : [];
  const demographics = hasData ? ((snapshot!.demographics as unknown) as Demographic[]) : [];

  const engRate =
    snapshot && snapshot.totalImpressions > 0
      ? ((snapshot.totalEngagements / snapshot.totalImpressions) * 100).toFixed(2) + "%"
      : "—";

  const formatPeriod = (snap: NonNullable<typeof snapshot>) => {
    const start = new Date(snap.periodStart).toLocaleDateString("pt-BR", {
      month: "short",
      year: "numeric",
    });
    const end = new Date(snap.periodEnd).toLocaleDateString("pt-BR", {
      month: "short",
      year: "numeric",
    });
    return `${start} – ${end}`;
  };

  const demoGroups = demographics.reduce<Record<string, Demographic[]>>((acc, d) => {
    (acc[d.category] ??= []).push(d);
    return acc;
  }, {});

  const demoCategoryLabels: Record<string, string> = {
    seniority: "Senioridade",
    industry: "Indústria",
    jobTitle: "Cargo",
    geography: "País / Região",
    company: "Empresa",
    unknown: "Outros",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary mt-0.5">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Performance dos posts no LinkedIn
              {snapshot && (
                <span className="ml-1 text-xs">
                  · {formatPeriod(snapshot)}
                </span>
              )}
            </p>
          </div>
        </div>
        <ExcelUploadButton />
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium mb-1">Nenhum dado importado ainda</p>
            <p className="text-sm">
              Clique em &ldquo;Importar Excel do LinkedIn&rdquo; para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Newsletter section — shows stats if available, upload button otherwise */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Newsletter
              </h2>
              <NewsletterUploadButton />
            </div>
            {newsletter ? (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                  label="Assinantes"
                  value={newsletter.subscribers.toLocaleString("pt-BR")}
                  icon={Users}
                />
                <StatCard
                  label="Visualizações de artigo"
                  value={newsletter.articleViews.toLocaleString("pt-BR")}
                  icon={BookOpen}
                />
                <StatCard
                  label="Impressões (artigos)"
                  value={newsletter.impressions.toLocaleString("pt-BR")}
                  icon={Eye}
                />
                <StatCard
                  label="Engajamentos (artigos)"
                  value={newsletter.engagements.toLocaleString("pt-BR")}
                  icon={Heart}
                />
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  Faça upload do screenshot da sua newsletter para importar os dados automaticamente.
                </CardContent>
              </Card>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              LinkedIn — Posts
            </h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <StatCard
                label="Total de Impressões"
                value={snapshot!.totalImpressions.toLocaleString("pt-BR")}
                icon={Eye}
              />
              <StatCard
                label="Total de Engajamentos"
                value={snapshot!.totalEngagements.toLocaleString("pt-BR")}
                icon={Heart}
              />
              <StatCard
                label="Taxa de Engajamento"
                value={engRate}
                icon={TrendingUp}
              />
              <StatCard
                label="Seguidores"
                value={snapshot!.totalFollowers.toLocaleString("pt-BR")}
                icon={Users}
              />
              <StatCard
                label="Novos Seguidores"
                value={snapshot!.newFollowers.toLocaleString("pt-BR")}
                icon={UserPlus}
              />
            </div>
          </section>

          {monthlyMetrics.length > 0 && (
            <section>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Tendência Mensal</CardTitle>
                </CardHeader>
                <CardContent>
                  <MonthlyChart data={monthlyMetrics} />
                </CardContent>
              </Card>
            </section>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {dayOfWeekMetrics.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Por Dia da Semana</CardTitle>
                  <p className="text-xs text-muted-foreground">Médias diárias</p>
                </CardHeader>
                <CardContent>
                  <DayOfWeekChart data={dayOfWeekMetrics} />
                </CardContent>
              </Card>
            )}

            {Object.keys(demoGroups).length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Perfil do Público</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(demoGroups).map(([category, items]) => (
                    <div key={category}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        {demoCategoryLabels[category] ?? category}
                      </p>
                      <div className="space-y-1.5">
                        {items.slice(0, 5).map((item) => (
                          <div key={item.name} className="flex items-center gap-2">
                            <div
                              className="w-24 shrink-0 text-xs text-muted-foreground truncate"
                              title={item.name}
                            >
                              {item.name}
                            </div>
                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary/70"
                                style={{ width: `${Math.min(item.percentage, 100)}%` }}
                              />
                            </div>
                            <div className="w-10 shrink-0 text-right text-xs text-muted-foreground">
                              {item.percentage.toFixed(0)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <section>
            <h2 className="text-base font-semibold mb-3">
              Top Posts por Taxa de Engajamento
            </h2>
            <PostTable posts={topPosts} />
          </section>

          <section>
            <AiInsightsCard
              snapshotId={snapshot!.id}
              insights={snapshot!.aiInsights ?? null}
              generatedAt={
                snapshot!.aiInsightsAt ? new Date(snapshot!.aiInsightsAt) : null
              }
            />
          </section>
        </>
      )}

    </div>
  );
}
