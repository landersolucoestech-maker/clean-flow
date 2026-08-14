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
    <Card className="bg-gradient-to-br from-violet-500/5 via-purple-500/10 to-fuchsia-500/5 border-purple-500/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Bot className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                Consultor IA de Performance
                <Badge variant="outline" className="text-purple-500 border-purple-500/30">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI Powered
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Análise inteligente do seu negócio com diagnósticos e recomendações
              </p>
            </div>
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="bg-purple-500 hover:bg-purple-600"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analisando...
              </>
            ) : hasAnalyzed ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reanalisar
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analisar Negócio
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!hasAnalyzed && !isLoading && !analysis && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-4 bg-purple-500/10 rounded-full mb-4">
              <Bot className="w-12 h-12 text-purple-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Pronto para analisar seu negócio</h3>
            <p className="text-muted-foreground max-w-md">
              Clique em "Analisar Negócio" para receber diagnósticos, identificar gargalos, 
              antecipar riscos e obter ações práticas para melhorar sua performance.
            </p>
          </div>
        )}

        {(isLoading || analysis) && (
          <ScrollArea className="h-[400px] pr-4">
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: formatMarkdown(analysis) }}
            />
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground mt-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Gerando análise...</span>
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
