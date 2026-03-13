"use client";

import { useState } from "react";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generateAiInsights } from "@/lib/actions/analytics";

interface Props {
  snapshotId: string;
  insights: string | null;
  generatedAt: Date | null;
}

export function AiInsightsCard({ snapshotId, insights: initialInsights, generatedAt: initialGeneratedAt }: Props) {
  const [insights, setInsights] = useState(initialInsights);
  const [generatedAt, setGeneratedAt] = useState(initialGeneratedAt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const result = await generateAiInsights(snapshotId);
      if (result?.error) {
        setError(result.error);
      } else if (result?.insights) {
        setInsights(result.insights);
        setGeneratedAt(new Date());
      }
    } catch {
      setError("Erro ao gerar insights. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            AI Insights
          </CardTitle>
          <div className="flex items-center gap-2">
            {generatedAt && (
              <span className="text-xs text-muted-foreground">
                Gerado em:{" "}
                {new Date(generatedAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={loading}
              className="gap-1.5"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {loading ? "Gerando..." : insights ? "Regenerar" : "Gerar Insights com IA"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="text-sm text-red-600 mb-3">{error}</p>
        )}
        {insights ? (
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
              {insights}
            </pre>
          </div>
        ) : !loading ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Clique em &quot;Gerar Insights com IA&quot; para obter uma análise estratégica dos seus dados do LinkedIn.
            <br />
            <span className="text-xs mt-1 block">Pode levar alguns segundos.</span>
          </div>
        ) : (
          <div className="flex items-center justify-center p-8 text-sm text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analisando seus dados...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
