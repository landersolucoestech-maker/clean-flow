import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BusinessMetrics {
  // Customer metrics
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
  recurringRate: number;
  
  // Job metrics
  totalJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  cancellationRate: number;
  onTimeRate: number;
  avgCompletionTime: number;
  
  // Financial metrics
  totalRevenue: number;
  totalExpenses: number;
  fixedExpenses: number;
  variableExpenses: number;
  netProfit: number;
  profitMargin: number;
  revenuePerJob: number;
  tips: number;
  
  // Team metrics
  totalStaff: number;
  activeStaff: number;
  totalPayroll: number;
  
  // Schedule metrics
  scheduledJobs: number;
  inProgressJobs: number;
  
  // Communications
  totalMessages: number;
  unreadMessages: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { metrics } = await req.json() as { metrics: BusinessMetrics };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Você é um Consultor de Performance de Negócios especializado em empresas de serviços (limpeza, manutenção, etc.).

Seu papel é analisar métricas do negócio e fornecer:
1. **Diagnóstico da Saúde do Negócio** - Avaliação geral
2. **Gargalos Detectados** - Problemas identificados nos dados
3. **Riscos Antecipados** - Potenciais problemas futuros
4. **Ações Práticas** - Recomendações específicas e acionáveis
5. **Priorização de Melhorias** - O que fazer primeiro baseado em impacto financeiro

Responda SEMPRE em português brasileiro.
Seja direto, prático e focado em resultados financeiros.
Use emojis para destacar pontos importantes.
Formate com markdown para fácil leitura.`;

    const userPrompt = `Analise as seguintes métricas do meu negócio e forneça insights acionáveis:

## Métricas de Clientes
- Total de Clientes: ${metrics.totalCustomers}
- Clientes Ativos: ${metrics.activeCustomers}
- Novos Clientes (este mês): ${metrics.newCustomersThisMonth}
- Taxa de Recorrência: ${metrics.recurringRate}%

## Métricas Operacionais (Jobs)
- Total de Jobs: ${metrics.totalJobs}
- Jobs Concluídos: ${metrics.completedJobs}
- Jobs Cancelados: ${metrics.cancelledJobs}
- Taxa de Cancelamento: ${metrics.cancellationRate}%
- Taxa On-Time: ${metrics.onTimeRate}%
- Tempo Médio de Conclusão: ${metrics.avgCompletionTime} minutos
- Jobs Agendados: ${metrics.scheduledJobs}
- Jobs em Progresso: ${metrics.inProgressJobs}

## Métricas Financeiras
- Receita Total: $${metrics.totalRevenue.toFixed(2)}
- Despesas Totais: $${metrics.totalExpenses.toFixed(2)}
- Despesas Fixas: $${metrics.fixedExpenses.toFixed(2)}
- Despesas Variáveis: $${metrics.variableExpenses.toFixed(2)}
- Lucro Líquido: $${metrics.netProfit.toFixed(2)}
- Margem de Lucro: ${metrics.profitMargin}%
- Receita por Job: $${metrics.revenuePerJob.toFixed(2)}
- Gorjetas (Tips): $${metrics.tips.toFixed(2)}

## Equipe
- Total de Funcionários: ${metrics.totalStaff}
- Funcionários Ativos: ${metrics.activeStaff}
- Folha de Pagamento Total: $${metrics.totalPayroll.toFixed(2)}

## Comunicações
- Total de Mensagens: ${metrics.totalMessages}
- Mensagens Não Lidas: ${metrics.unreadMessages}

Forneça uma análise completa com diagnóstico, gargalos, riscos, ações práticas e priorização.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Business consultant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
