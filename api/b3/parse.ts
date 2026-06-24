import { Type } from "@google/genai";
import { getGeminiClient } from "./shared.js";

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { textContent } = req.body || {};
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

    res.status(200).json({ success: true, transactions });
  } catch (err: any) {
    console.error("Erro no serverless /api/b3/parse:", err);
    res.status(500).json({ error: err.message || "Erro interno do servidor ao consultar IA." });
  }
}
