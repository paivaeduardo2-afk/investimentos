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
    const { currentPositions, proventos, message, history = [] } = req.body || {};

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

    // To keep it clean and robust, we supply the full history directly inside the text prompt payload
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

    res.status(200).json({
      success: true,
      answer: response.text || "Desculpe, não consegui elaborar uma resposta no momento."
    });
  } catch (err: any) {
    console.error("Erro no serverless /api/b3/chat:", err);
    res.status(500).json({ error: err.message || "Erro ao consultar o assistente AI." });
  }
}
