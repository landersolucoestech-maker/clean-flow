import { T } from "@/shared/components/i18n/T";
import { useState } from "react";
import DOMPurify from "dompurify";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BusinessMetrics {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
  recurringRate: number;
  totalJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  cancellationRate: number;
  onTimeRate: number;
  avgCompletionTime: number;
  totalRevenue: number;
  totalExpenses: number;
  fixedExpenses: number;
  variableExpenses: number;
  netProfit: number;
  profitMargin: number;
  revenuePerJob: number;
  tips: number;
  totalStaff: number;
  activeStaff: number;
  totalPayroll: number;
  scheduledJobs: number;
  inProgressJobs: number;
  totalMessages: number;
  unreadMessages: number;
}

interface AIConsultantCardProps {
  metrics: BusinessMetrics;
}

export function AIConsultantCard({ metrics }: AIConsultantCardProps) {
  const [analysis, setAnalysis] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/business-consultant`;

  const handleAnalyze = async () => {
    setIsLoading(true);
    setAnalysis("");

    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ metrics }),
      });

      if (response.status === 429) {
        toast.error("Limite de requisições excedido. Tente novamente mais tarde.");
        setIsLoading(false);
        return;
      }

      if (response.status === 402) {
        toast.error("Créditos insuficientes. Adicione créditos ao seu workspace.");
        setIsLoading(false);
        return;
      }

      if (!response.ok || !response.body) {
        throw new Error("Failed to start analysis");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let analysisText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              analysisText += content;
              setAnalysis(analysisText);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      setHasAnalyzed(true);
      toast.success("Análise concluída!");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Erro ao realizar análise. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatMarkdown = (text: string) => {
    const formatted = text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
      .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
      .replace(/\n/g, "<br/>");

    return DOMPurify.sanitize(formatted);
  };

  return (
    <Card className="border-primary/20 bg-primary/[0.025] shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <T k="literal.reports.consultor_ia_de_performance.f8ef44d9" />
                <Badge variant="outline" className="border-primary/20 text-primary">
                  <Sparkles className="w-3 h-3 mr-1" />
                  <T k="literal.reports.ai_powered.2650d468" />
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                <T k="literal.reports.analise_inteligente_do_seu_negocio_com_diagn.5dea3528" />
              </p>
            </div>
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={isLoading}
            size="sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <T k="literal.reports.analisando.b7fe80ab" />
              </>
            ) : hasAnalyzed ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                <T k="literal.reports.reanalisar.11de78d5" />
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                <T k="literal.reports.analisar_negocio.df923cb0" />
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!hasAnalyzed && !isLoading && !analysis && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <h3 className="mb-1.5 text-sm font-semibold"><T k="literal.reports.pronto_para_analisar_seu_negocio.e4679b34" /></h3>
            <p className="max-w-md text-xs text-muted-foreground">
              Clique em "Analisar Negócio" para receber diagnósticos, identificar gargalos, 
              antecipar riscos e obter ações práticas para melhorar sua performance.
            </p>
          </div>
        )}

        {(isLoading || analysis) && (
          <ScrollArea className="h-[320px] pr-3">
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: formatMarkdown(analysis) }}
            />
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground mt-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span><T k="literal.reports.gerando_analise.8c7fbf83" /></span>
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
