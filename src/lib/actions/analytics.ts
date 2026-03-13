"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DailyMetric {
  date: string;
  impressions: number;
  engagements: number;
}

export interface MonthlyMetric {
  month: string; // "2025-10"
  impressions: number;
  engagements: number;
  engagementRate: number;
}

export interface DayOfWeekMetric {
  day: string; // "Segunda", "Terça", etc.
  impressions: number;
  engagements: number;
  engagementRate: number;
  count: number;
}

export interface TopPost {
  url: string;
  impressions: number;
  engagements: number;
  engagementRate: number;
  date: string;
}

export interface Demographic {
  category: string; // "seniority" | "industry" | "jobTitle" | "geography"
  name: string;
  percentage: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function findSheet(wb: XLSX.WorkBook, keywords: string[]): XLSX.WorkSheet | null {
  for (const name of wb.SheetNames) {
    const lower = name.toLowerCase();
    if (keywords.some((kw) => lower.includes(kw))) {
      return wb.Sheets[name];
    }
  }
  return null;
}

function sheetToRows(ws: XLSX.WorkSheet): Record<string, unknown>[] {
  return XLSX.utils.sheet_to_json(ws, { defval: null }) as Record<string, unknown>[];
}

function colVal(row: Record<string, unknown>, candidates: string[]): unknown {
  for (const c of candidates) {
    const key = Object.keys(row).find((k) => k.toLowerCase().includes(c.toLowerCase()));
    if (key !== undefined && row[key] !== null && row[key] !== undefined) return row[key];
  }
  return null;
}

function toNum(v: unknown): number {
  if (typeof v === "number") return Math.round(v);
  if (typeof v === "string") return parseInt(v.replace(/[^0-9.-]/g, ""), 10) || 0;
  return 0;
}

function toFloat(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v.replace(/[^0-9.-]/g, "")) || 0;
  return 0;
}

function xlsxDateToISO(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  if (typeof v === "string") {
    // Try to parse date strings like "2025-10-01" or "01/10/2025" or "Oct 1, 2025"
    const cleaned = v.trim();
    const iso = new Date(cleaned);
    if (!isNaN(iso.getTime())) {
      return iso.toISOString().slice(0, 10);
    }
  }
  return null;
}

const DOW_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// ─── Excel Parser ────────────────────────────────────────────────────────────

function parseLinkedInExcel(buffer: Buffer): {
  periodStart: Date;
  periodEnd: Date;
  totalImpressions: number;
  totalEngagements: number;
  totalFollowers: number;
  newFollowers: number;
  dailyMetrics: DailyMetric[];
  monthlyMetrics: MonthlyMetric[];
  dayOfWeekMetrics: DayOfWeekMetric[];
  topPosts: TopPost[];
  demographics: Demographic[];
} {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });

  // ── ENGAGEMENT sheet → daily metrics ──────────────────────────────────────
  const engSheet = findSheet(wb, ["engagement", "engajamento"]);
  const dailyMetrics: DailyMetric[] = [];

  if (engSheet) {
    const rows = sheetToRows(engSheet);
    for (const row of rows) {
      const rawDate = colVal(row, ["date", "data"]);
      const dateStr = xlsxDateToISO(rawDate);
      if (!dateStr) continue;
      const impressions = toNum(colVal(row, ["impression", "impressão", "impressao"]));
      const engagements = toNum(colVal(row, ["engagement", "engajamento"]));
      dailyMetrics.push({ date: dateStr, impressions, engagements });
    }
  }

  // ── Derive period ──────────────────────────────────────────────────────────
  const dates = dailyMetrics.map((d) => new Date(d.date)).filter((d) => !isNaN(d.getTime()));
  const periodStart = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : new Date();
  const periodEnd = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : new Date();

  // ── Aggregate totals from daily ────────────────────────────────────────────
  const totalImpressions = dailyMetrics.reduce((s, d) => s + d.impressions, 0);
  const totalEngagements = dailyMetrics.reduce((s, d) => s + d.engagements, 0);

  // ── Monthly metrics ────────────────────────────────────────────────────────
  const monthMap = new Map<string, { impressions: number; engagements: number }>();
  for (const d of dailyMetrics) {
    const month = d.date.slice(0, 7); // "2025-10"
    const existing = monthMap.get(month) ?? { impressions: 0, engagements: 0 };
    monthMap.set(month, {
      impressions: existing.impressions + d.impressions,
      engagements: existing.engagements + d.engagements,
    });
  }
  const monthlyMetrics: MonthlyMetric[] = Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({
      month,
      impressions: v.impressions,
      engagements: v.engagements,
      engagementRate: v.impressions > 0 ? (v.engagements / v.impressions) * 100 : 0,
    }));

  // ── Day-of-week metrics ────────────────────────────────────────────────────
  const dowMap = new Map<number, { impressions: number; engagements: number; count: number }>();
  for (let i = 0; i < 7; i++) dowMap.set(i, { impressions: 0, engagements: 0, count: 0 });
  for (const d of dailyMetrics) {
    const dow = new Date(d.date + "T12:00:00Z").getUTCDay();
    const existing = dowMap.get(dow)!;
    dowMap.set(dow, {
      impressions: existing.impressions + d.impressions,
      engagements: existing.engagements + d.engagements,
      count: existing.count + 1,
    });
  }
  const dayOfWeekMetrics: DayOfWeekMetric[] = Array.from(dowMap.entries()).map(([dow, v]) => ({
    day: DOW_LABELS[dow],
    impressions: v.count > 0 ? Math.round(v.impressions / v.count) : 0,
    engagements: v.count > 0 ? Math.round(v.engagements / v.count) : 0,
    engagementRate:
      v.count > 0 && v.impressions > 0 ? (v.engagements / v.impressions) * 100 : 0,
    count: v.count,
  }));

  // ── TOP POSTS sheet ────────────────────────────────────────────────────────
  const postsSheet = findSheet(wb, ["top post", "top_post", "posts"]);
  let topPosts: TopPost[] = [];

  if (postsSheet) {
    const rows = sheetToRows(postsSheet);
    for (const row of rows) {
      const rawDate = colVal(row, ["date", "data", "published"]);
      const dateStr = xlsxDateToISO(rawDate) ?? "";
      const rawUrl = colVal(row, ["link", "url", "post_link"]);
      const url = typeof rawUrl === "string" ? rawUrl.trim() : "";
      const impressions = toNum(colVal(row, ["impression", "impressão", "impressao"]));
      const engagements = toNum(colVal(row, ["engagement", "engajamento"]));
      if (!url) continue;
      const engagementRate = impressions > 0 ? (engagements / impressions) * 100 : 0;
      topPosts.push({ url, impressions, engagements, engagementRate, date: dateStr });
    }
    // Dedupe by URL, keep highest engagement
    const seen = new Map<string, TopPost>();
    for (const p of topPosts) {
      const existing = seen.get(p.url);
      if (!existing || p.engagements > existing.engagements) seen.set(p.url, p);
    }
    topPosts = Array.from(seen.values())
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, 50);
  }

  // ── FOLLOWERS sheet ────────────────────────────────────────────────────────
  const followersSheet = findSheet(wb, ["follower", "seguidor"]);
  let totalFollowers = 0;
  let newFollowers = 0;

  if (followersSheet) {
    const rows = sheetToRows(followersSheet);
    if (rows.length > 0) {
      // Last row has the latest follower count
      const lastRow = rows[rows.length - 1];
      totalFollowers = toNum(colVal(lastRow, ["total", "followers", "seguidores"]));
      // Sum "new" column for the period
      for (const row of rows) {
        newFollowers += toNum(colVal(row, ["new", "novo", "gained"]));
      }
    }
  }

  // ── DISCOVERY sheet (optional override for totals) ─────────────────────────
  const discoverySheet = findSheet(wb, ["discovery", "descoberta", "overview", "summary", "resumo"]);
  if (discoverySheet) {
    const rows = sheetToRows(discoverySheet);
    if (rows.length > 0) {
      // Try to find a summary row with large numbers
      for (const row of rows) {
        const imp = toNum(colVal(row, ["unique impression", "impressão", "impression"]));
        if (imp > totalImpressions && imp > 1000) {
          // This is likely the total
          break;
        }
      }
    }
  }

  // ── DEMOGRAPHICS sheet ─────────────────────────────────────────────────────
  const demoSheet = findSheet(wb, ["demographic", "demograph", "audience", "público", "audiência"]);
  const demographics: Demographic[] = [];

  if (demoSheet) {
    const rows = sheetToRows(demoSheet);
    let currentCategory = "unknown";
    for (const row of rows) {
      // LinkedIn demographics have category headers followed by rows
      const keys = Object.keys(row);
      if (keys.length === 0) continue;

      const firstKey = keys[0];
      const firstVal = row[firstKey];

      // Check if this row looks like a category header (single string value)
      if (
        typeof firstVal === "string" &&
        firstVal.trim().length > 0 &&
        keys.filter((k) => row[k] !== null).length <= 2
      ) {
        const lower = firstVal.toLowerCase();
        if (lower.includes("seniorit") || lower.includes("seniori")) currentCategory = "seniority";
        else if (lower.includes("industr") || lower.includes("indústr")) currentCategory = "industry";
        else if (lower.includes("job") || lower.includes("função") || lower.includes("cargo")) currentCategory = "jobTitle";
        else if (lower.includes("geo") || lower.includes("region") || lower.includes("país") || lower.includes("countr")) currentCategory = "geography";
        else if (lower.includes("compan") || lower.includes("empresa")) currentCategory = "company";
        continue;
      }

      const name = String(colVal(row, ["name", "nome", "category", "categoria", firstKey]) ?? "").trim();
      const percentage = toFloat(colVal(row, ["percentage", "percent", "%", "porcentagem", "taxa"]));
      if (name && percentage > 0) {
        demographics.push({ category: currentCategory, name, percentage });
      }
    }
  }

  return {
    periodStart,
    periodEnd,
    totalImpressions,
    totalEngagements,
    totalFollowers,
    newFollowers,
    dailyMetrics,
    monthlyMetrics,
    dayOfWeekMetrics,
    topPosts,
    demographics,
  };
}

// ─── Server Actions ──────────────────────────────────────────────────────────

export async function uploadLinkedInExcel(
  formData: FormData
): Promise<{ error?: string }> {
  const file = formData.get("file") as File | null;
  if (!file) return { error: "Nenhum arquivo enviado." };

  const allowedTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/octet-stream",
  ];
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext !== "xlsx" && ext !== "xls") {
    return { error: "Apenas arquivos .xlsx ou .xls são aceitos." };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsed = parseLinkedInExcel(buffer);

    await prisma.linkedInSnapshot.create({
      data: {
        periodStart: parsed.periodStart,
        periodEnd: parsed.periodEnd,
        totalImpressions: parsed.totalImpressions,
        totalEngagements: parsed.totalEngagements,
        totalFollowers: parsed.totalFollowers,
        newFollowers: parsed.newFollowers,
        dailyMetrics: parsed.dailyMetrics as unknown as object[],
        monthlyMetrics: parsed.monthlyMetrics as unknown as object[],
        dayOfWeekMetrics: parsed.dayOfWeekMetrics as unknown as object[],
        topPosts: parsed.topPosts as unknown as object[],
        demographics: parsed.demographics as unknown as object[],
      },
    });

    revalidatePath("/analytics");
    return {};
  } catch (e) {
    console.error("Error parsing LinkedIn Excel:", e);
    return { error: "Erro ao processar o arquivo. Verifique se é um export válido do LinkedIn." };
  }
}

export async function getLinkedInSnapshot() {
  return prisma.linkedInSnapshot.findFirst({
    orderBy: { uploadedAt: "desc" },
  });
}

export async function generateAiInsights(
  snapshotId: string
): Promise<{ insights?: string; error?: string }> {
  const snapshot = await prisma.linkedInSnapshot.findUnique({ where: { id: snapshotId } });
  if (!snapshot) return { error: "Snapshot não encontrado." };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY não configurada." };

  const monthly = (snapshot.monthlyMetrics as unknown) as MonthlyMetric[];
  const dow = (snapshot.dayOfWeekMetrics as unknown) as DayOfWeekMetric[];
  const posts = ((snapshot.topPosts as unknown) as TopPost[]).slice(0, 20);
  const demos = (snapshot.demographics as unknown) as Demographic[];

  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const monthlyText = monthly
    .map((m) => `  ${m.month}: ${m.impressions.toLocaleString("pt-BR")} imp, ${m.engagements.toLocaleString("pt-BR")} eng (${m.engagementRate.toFixed(2)}%)`)
    .join("\n");

  const dowText = dow
    .map((d) => `  ${d.day}: média de ${d.impressions.toLocaleString("pt-BR")} imp / ${d.engagements.toLocaleString("pt-BR")} eng (${d.engagementRate.toFixed(2)}%)`)
    .join("\n");

  const postsText = posts
    .map((p, i) => `  ${i + 1}. Taxa: ${p.engagementRate.toFixed(2)}% | ${p.impressions.toLocaleString("pt-BR")} imp / ${p.engagements.toLocaleString("pt-BR")} eng — ${p.url}`)
    .join("\n");

  const demoGroups = demos.reduce<Record<string, Demographic[]>>((acc, d) => {
    (acc[d.category] ??= []).push(d);
    return acc;
  }, {});
  const demoText = Object.entries(demoGroups)
    .map(([cat, items]) => `  ${cat}:\n` + items.slice(0, 5).map((i) => `    - ${i.name}: ${i.percentage.toFixed(1)}%`).join("\n"))
    .join("\n");

  const engRate = snapshot.totalImpressions > 0
    ? ((snapshot.totalEngagements / snapshot.totalImpressions) * 100).toFixed(2)
    : "0";

  const prompt = `Você é um especialista em marketing de conteúdo B2B analisando dados do LinkedIn para Roberto, investidor de venture capital com foco em tecnologia espacial, IA, defesa e geopolítica.

## Dados do Período: ${formatDate(snapshot.periodStart)} a ${formatDate(snapshot.periodEnd)}

### KPIs Totais
- Impressões: ${snapshot.totalImpressions.toLocaleString("pt-BR")}
- Engajamentos: ${snapshot.totalEngagements.toLocaleString("pt-BR")}
- Taxa de engajamento: ${engRate}%
- Seguidores totais: ${snapshot.totalFollowers.toLocaleString("pt-BR")}
- Novos seguidores: ${snapshot.newFollowers.toLocaleString("pt-BR")}

### Evolução Mensal
${monthlyText}

### Padrão por Dia da Semana (médias diárias)
${dowText}

### Top 20 Posts por Taxa de Engajamento
${postsText}

### Perfil do Público
${demoText}

---

Com base nesses dados, forneça um análise estratégica em português brasileiro com os seguintes pontos:

1. **Tendência de crescimento** — análise da evolução mês a mês, destacando pontos de inflexão
2. **Melhores dias para postar** — baseado nos padrões de dia da semana
3. **Padrões de conteúdo** — o que os posts com maior engajamento têm em comum? (temas, formato, abordagem)
4. **Perfil do público** — quem é o público do Roberto no LinkedIn e o que isso significa para a estratégia de conteúdo?
5. **Recomendações práticas** — 3 a 5 ações concretas para aumentar o alcance e engajamento

Seja específico, direto e baseado nos dados. Evite generalismos. Use números quando relevante.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic error:", err);
      return { error: "Erro ao chamar a API de IA." };
    }

    const data = await response.json();
    const insights = data.content?.[0]?.text ?? "";

    await prisma.linkedInSnapshot.update({
      where: { id: snapshotId },
      data: { aiInsights: insights, aiInsightsAt: new Date() },
    });

    revalidatePath("/analytics");
    return { insights };
  } catch (e) {
    console.error("AI insights error:", e);
    return { error: "Erro ao gerar insights. Tente novamente." };
  }
}

export async function getNewsletterStats() {
  return prisma.newsletterStats.findFirst({
    orderBy: { updatedAt: "desc" },
  });
}

export async function upsertNewsletterStats(data: {
  subscribers: number;
  articleViews: number;
  impressions: number;
  engagements: number;
}): Promise<{ error?: string }> {
  try {
    await prisma.newsletterStats.create({ data });
    revalidatePath("/analytics");
    return {};
  } catch (e) {
    console.error("Error upserting newsletter stats:", e);
    return { error: "Erro ao salvar dados da newsletter." };
  }
}
