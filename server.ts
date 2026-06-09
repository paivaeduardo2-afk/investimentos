import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Helper to fetch actual B3 stock price from Yahoo Finance
async function fetchB3Quote(ticker: string): Promise<number | null> {
  const cleanTicker = ticker.toUpperCase().replace(/[^A-Z0-9.]/g, '').trim();
  const symbol = cleanTicker.endsWith('.SA') ? cleanTicker : `${cleanTicker}.SA`;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`Yahoo Finance chart request failed for ${symbol} with status ${response.status}`);
      return null;
    }

    const data: any = await response.json();
    const result = data?.chart?.result?.[0];
    if (result) {
      const regularMarketPrice = result.meta?.regularMarketPrice;
      if (typeof regularMarketPrice === 'number' && regularMarketPrice > 0) {
        return regularMarketPrice;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error loading quote for ${symbol}:`, error);
    return null;
  }
}

// Ensure Gemini Client is initialized with user-agent for telemetry as required
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not defined. AI features will require this key configured in Settings > Secrets.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "MOCK_KEY_FALLBACK_IF_MISSING",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Route: Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API Route: Multiple B3 Ticker Quotes in Real Time
  app.get("/api/b3/quotes", async (req, res) => {
    try {
      const tickersParam = req.query.tickers;
      if (!tickersParam || typeof tickersParam !== "string") {
        return res.status(400).json({ error: "O parâmetro 'tickers' (separados por vírgula) é obrigatório." });
      }

      const tickers = tickersParam
        .split(",")
        .map(t => t.trim().toUpperCase())
        .filter(t => t.length > 0);

      const quotes: Record<string, number> = {};

      const promises = tickers.map(async (ticker) => {
        const price = await fetchB3Quote(ticker);
        if (price !== null) {
          quotes[ticker] = price;
        }
      });

      // Fetch with an aggregate timeout of 4 seconds to maintain response reactivity
      await Promise.race([
        Promise.all(promises),
        new Promise(resolve => setTimeout(resolve, 4000))
      ]);

      res.json({ success: true, quotes });
    } catch (err: any) {
      console.error("Erro na rota /api/b3/quotes:", err);
      res.status(500).json({ error: err.message || "Erro ao consultar as cotações da B3." });
    }
  });

  // API Route: AI Parse B3 Extract Transcripts / PDF Paste / CSV text
  app.post("/api/b3/parse", async (req, res) => {
    try {
      const { textContent } = req.body;
      if (!textContent || typeof textContent !== 'string') {
        return res.status(400).json({ error: "O conteúdo de texto é obrigatório para extração." });
      }

      const ai = getGeminiClient();
      
      const prompt = `Analise o seguinte extrato, tabela, CSV ou texto de movimentações financeiras da B3 (Bolsa de Valores do Brasil). 
Sua tarefa é extrair e estruturar TODAS as operações de compra e venda de ações encontradas.

Texto do extrato / movimentação:
"""
${textContent}
"""

Retorne uma lista estruturada de transações de forma precisa. 
Siga estritamente as regras abaixo para cada transação:
1. Identifique o Ticker da ação brasileira (ex: PETR4, VALE3, ITUB4, WEGE3). Converta para maiúsculas.
2. Identifique o Tipo de Operação: Deve ser 'COMPRA' ou 'VENDA'. Se for um termo como 'C' ou 'Compra', mapeie para 'COMPRA'. Se for 'V', 'Venda' ou 'Alienação', mapeie para 'VENDA'.
3. Identifique a Data: Converta para o formato legal 'YYYY-MM-DD'. Se for '05/03/2025', converta para '2025-03-05'. Se o ano não for informado, assuma 2025 ou 2026 dependendo do contexto.
4. Identifique a Quantidade: Inteiro positivo (ex: 100).
5. Identifique o Preço por unidade: Número decimal positivo.
6. Estime os Encargos (Taxas B3/Corretagem) se não estiver explícito, ou use 0 se não encontrar nada.

Mapeie suas estimativas no seguinte schema JSON válido.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            description: "Lista de transações extraídas da movimentação da B3",
            items: {
              type: Type.OBJECT,
              properties: {
                ticker: { type: Type.STRING, description: "Código do ativo na B3 (ex: ITUB4)" },
                type: { type: Type.STRING, enum: ["COMPRA", "VENDA"], description: "Mapeamento da operação" },
                date: { type: Type.STRING, description: "Data da transação no formato YYYY-MM-DD" },
                quantity: { type: Type.INTEGER, description: "Quantidade negociada" },
                price: { type: Type.NUMBER, description: "Preço unitário pago ou recebido" },
                charges: { type: Type.NUMBER, description: "Taxas ou emolumentos calculados ou estimados" },
                total: { type: Type.NUMBER, description: "Valor financeiro total (Quantidade * Preço)" }
              },
              required: ["ticker", "type", "date", "quantity", "price"]
            }
          }
        }
      });

      const parsedText = response.text || "[]";
      let transactions = [];
      try {
        transactions = JSON.parse(parsedText);
        // Clean and guarantee totals
        transactions = transactions.map((t: any, index: number) => {
          const qty = Number(t.quantity) || 1;
          const prc = Number(t.price) || 0;
          const chg = Number(t.charges) || 0;
          return {
            id: `b3-ai-${Date.now()}-${index}`,
            ticker: String(t.ticker).toUpperCase().replace(/[^A-Z0-9]/g, '').trim(),
            type: t.type === 'VENDA' ? 'VENDA' : 'COMPRA',
            date: t.date || new Date().toISOString().substring(0, 10),
            quantity: qty,
            price: prc,
            charges: chg,
            total: Number((t.type === 'VENDA' ? (qty * prc) - chg : (qty * prc) + chg).toFixed(2))
          };
        });
      } catch (parseErr) {
        console.error("Falha ao parsear JSON gerado pela IA:", parsedText);
        return res.status(500).json({ error: "Erro ao estruturar dados extraídos pela IA." });
      }

      res.json({ success: true, transactions });
    } catch (err: any) {
      console.error("Erro na rota /api/b3/parse:", err);
      res.status(500).json({ error: err.message || "Erro interno do servidor ao consultar IA." });
    }
  });

  // API Route: AI Financial Advisor Chat (focusing on Brazilian taxes & portfolio decisions)
  app.post("/api/b3/chat", async (req, res) => {
    try {
      const { currentPositions, proventos, message, history = [] } = req.body;
      
      const ai = getGeminiClient();

      // Formulate a compact summary of the user's active portfolio so Gemini can speak with real context!
      const portfolioDescription = currentPositions && currentPositions.length > 0
        ? currentPositions.map((p: any) => `Ativo: ${p.ticker} | Qtd: ${p.totalQuantity} | Preço Médio: R$ ${p.averagePrice.toFixed(2)} | Custo Total: R$ ${p.totalCost.toFixed(2)}`).join('\n')
        : "Nenhum ativo em custódia no momento.";

      const proventosDescription = proventos && proventos.length > 0
        ? proventos.slice(0, 15).map((pr: any) => `${pr.date}: ${pr.ticker} pagou R$ ${pr.netAmount.toFixed(2)} como ${pr.type}`).join('\n')
        : "Nenhum rendimento/provento recebido.";

      const systemInstruction = `Você é um Consultor Financeiro AI especialista em Bolsa de Valores Brasileira (B3) e Imposto de Renda Pessoa Física (IRPF).
Sua missão é ajudar o usuário a tirar dúvidas sobre o controle de sua carteira de ações, dividendos, Juros sobre Capital Próprio (JCP), cálculo de preço médio e declaração de IRPF à Receita Federal.

Aqui está a carteira atual do usuário para você tomar como base de contexto ao responder:
=== CARTEIRA ATUAL ===
${portfolioDescription}

=== ÚLTIMOS PROVENTOS RECEBIDOS ===
${proventosDescription}

REGRAS DE CONDUTA & TRIBUTAÇÃO DO BRASIL:
1. Sempre responda em Português brasileiro de forma clara, prestativa e objetiva.
2. Seja humilde e indique que as respostas seguem as normas oficiais da Receita Federal do Brasil, mas que sempre vale checar o site oficial em caso de regras muito específicas.
3. Se perguntado sobre Preço Médio, ensine a regra: Compras somam quantidade e custo ponderado. Vendas apenas diminuem a quantidade disponível, sem alterar o preço médio.
4. Se perguntado sobre Imposto de Renda de Ações:
   - Ganhos sob Vendas totais de ações até R$ 20.000 ao mês são ISENTOS (exceto Day Trade e FIIs, que não possuem essa isenção). Mapear na ficha 'Rendimentos Isentos e Não Tributáveis', tipo 20.
   - Ganhos com vendas acima de R$ 20.000 ou Day Trade pagam imposto (15% Swing Trade, 20% Day Trade). Deve-se declarar na ficha 'Renda Variável - Operações Comuns/Day Trade'.
   - Dividendos são totalmente ISENTOS e não tributáveis. Declarar na ficha 'Rendimentos Isentos e Não Tributáveis', código 09.
   - Juros sobre Capital Próprio (JCP) sofrem tributação exclusiva na fonte de 15%. Declarar na ficha 'Rendimentos Sujeitos à Tributação Exclusiva/Definitiva', código 10, informando o valor bruto com retenção.
5. Seja focado e proativo. Mantenha as respostas formadas em markdown elegante e sem enrolações técnicas desnecessárias. Use os dados concretos do usuário se ele perguntar de sua própria carteira ou de seus rendimentos!`;

      // Use modern Gemini chats instance to stream or send messages
      const chat = ai.chats.create({
        model: "gemini-3.5-flash",
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      // Populate history if provided
      if (history.length > 0) {
        // Prepare pre-existing rounds. Wait, since @google/genai chats.create manages its own session,
        // we can seed or directly send messages. Let's send the latest message with history loaded.
        // Or we can construct custom contents containing the history. Let's do a direct chat sendMessage.
      }

      // To keep it clean and robust, we supply the full history directly inside the text prompt payload
      // or send it to the model. Let's build a simple history formatted payload.
      let fullMessage = "";
      if (history && history.length > 0) {
        fullMessage += "Histórico da conversa recente:\n";
        history.forEach((h: any) => {
          fullMessage += `${h.role === 'user' ? 'Usuário' : 'Assistente AI'}: ${h.text}\n`;
        });
        fullMessage += `Mensagem atual do Usuário: ${message}`;
      } else {
        fullMessage = message;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: fullMessage,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });

      res.json({
        success: true,
        answer: response.text || "Desculpe, não consegui elaborar uma resposta no momento."
      });
    } catch (err: any) {
      console.error("Erro na rota /api/b3/chat:", err);
      res.status(500).json({ error: err.message || "Erro ao consultar o assistente AI." });
    }
  });

  // Vite development vs production compiler modes
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`B3 Invest server successfully running on port http://0.0.0.0:${PORT}`);
  });
}

startServer();
