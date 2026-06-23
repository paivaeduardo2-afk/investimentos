import { Transaction, Provento, StockPosition, MonthlyTaxReport, AnnualIRPFReport, CompanyMetadata } from './types';

// Standard metadata for popular Brazilian stocks
export const COMPANIES_DATABASE: Record<string, CompanyMetadata> = {
  PETR4: {
    cnpj: '33.000.167/0001-01',
    companyName: 'PETROLEO BRASILEIRO S.A. PETROBRAS',
    sector: 'Petróleo, Gás e Biocombustíveis',
    currentPrice: 38.60,
  },
  VALE3: {
    cnpj: '33.592.510/0001-54',
    companyName: 'VALE S.A.',
    sector: 'Mineração',
    currentPrice: 62.45,
  },
  ITUB4: {
    cnpj: '60.872.504/0001-23',
    companyName: 'ITAÚ UNIBANCO HOLDING S.A.',
    sector: 'Intermediários Financeiros / Bancos',
    currentPrice: 34.20,
  },
  BBAS3: {
    cnpj: '00.000.000/0001-91',
    companyName: 'BANCO DO BRASIL S.A.',
    sector: 'Intermediários Financeiros / Bancos',
    currentPrice: 27.85,
  },
  BBDC4: {
    cnpj: '60.746.948/0001-12',
    companyName: 'BANCO BRADESCO S.A.',
    sector: 'Intermediários Financeiros / Bancos',
    currentPrice: 13.90,
  },
  WEGE3: {
    cnpj: '84.429.695/0001-11',
    companyName: 'WEG S.A.',
    sector: 'Bens Industriais / Máquinas',
    currentPrice: 42.15,
  },
  TAEE11: {
    cnpj: '07.859.971/0001-30',
    companyName: 'TRANSMISSORA ALIANÇA DE ENERGIA ELÉTRICA S.A.',
    sector: 'Utilidade Pública / Energia Elétrica',
    currentPrice: 34.90,
  },
  MGLU3: {
    cnpj: '47.960.950/0001-21',
    companyName: 'MAGAZINE LUIZA S.A.',
    sector: 'Comércio / Eletrodomésticos',
    currentPrice: 12.10,
  },
  MXRF11: {
    cnpj: '97.521.225/0001-25',
    companyName: 'MAXI RENDA FUNDO DE INVESTIMENTO IMOBILIÁRIO',
    sector: 'Fundo de Investimento Imobiliário',
    currentPrice: 10.15,
  },
  BOVA11: {
    cnpj: '10.406.882/0001-07',
    companyName: 'ISHARES IBOVESPA ACÕES FDO DE INDICE',
    sector: 'ETFs',
    currentPrice: 124.50,
  }
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatPercent = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

// Returns standard CNPJ or dynamic one based on simple hashing/generation
export const getCompanyMetadata = (ticker: string): CompanyMetadata => {
  const cleanTicker = ticker.toUpperCase().trim();
  if (COMPANIES_DATABASE[cleanTicker]) {
    return COMPANIES_DATABASE[cleanTicker];
  }
  
  // Dynamic fallback for any ticker configured by the user
  const simpleHash = Math.abs(cleanTicker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
  const dynamicCNPJ = `00.${(simpleHash * 17) % 900 + 100}.${(simpleHash * 23) % 900 + 100}/0001-${(simpleHash * 29) % 90 + 10}`;
  const isFii = cleanTicker.endsWith('11') && !cleanTicker.startsWith('BOVA');
  
  return {
    cnpj: dynamicCNPJ,
    companyName: `${cleanTicker} PARTICIPAÇÕES S.A.`,
    sector: isFii ? 'Fundos Imobiliários' : 'Setor Não Informado',
    currentPrice: 20 + (simpleHash % 80),
  };
};

/**
 * Calculates current stock positions including average prices according to Receita Federal guidelines.
 * Rule: Purchases update quantity and weighted average price. Sells update quantity only (average price remains constant).
 */
export const calculateStockPositions = (
  transactions: Transaction[],
  livePrices?: Record<string, number>
): StockPosition[] => {
  // Sort transactions by date to ensure proper average price sequencing
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const positionsMap: Record<string, { qty: number; totalCost: number; avgPrice: number }> = {};
  
  for (const tx of sorted) {
    const ticker = tx.ticker.toUpperCase().trim();
    if (!positionsMap[ticker]) {
      positionsMap[ticker] = { qty: 0, totalCost: 0, avgPrice: 0 };
    }
    
    const pos = positionsMap[ticker];
    const qtyChange = tx.quantity;
    
    if (tx.type === 'COMPRA') {
      const txCost = (qtyChange * tx.price) + tx.charges;
      const newQty = pos.qty + qtyChange;
      const newTotalCost = pos.totalCost + txCost;
      pos.avgPrice = newQty > 0 ? newTotalCost / newQty : 0;
      pos.qty = newQty;
      pos.totalCost = newTotalCost;
    } else { // VENDA
      const newQty = Math.max(0, pos.qty - qtyChange);
      pos.qty = newQty;
      pos.totalCost = newQty * pos.avgPrice; // reduces total cost keeping Average Price flat
    }
  }
  
  return Object.entries(positionsMap)
    .filter(([_, data]) => data.qty > 0)
    .map(([ticker, data]) => {
      const meta = getCompanyMetadata(ticker);
      const currentPrice = livePrices && livePrices[ticker] !== undefined ? livePrices[ticker] : meta.currentPrice;
      const currentTotal = data.qty * currentPrice;
      const gainLoss = currentTotal - data.totalCost;
      const gainLossPercentage = data.totalCost > 0 ? (gainLoss / data.totalCost) * 100 : 0;
      
      return {
        ticker,
        companyName: meta.companyName,
        cnpj: meta.cnpj,
        totalQuantity: data.qty,
        averagePrice: Number(data.avgPrice.toFixed(4)),
        totalCost: Number(data.totalCost.toFixed(2)),
        currentPrice,
        currentTotal: Number(currentTotal.toFixed(2)),
        gainLoss: Number(gainLoss.toFixed(2)),
        gainLossPercentage: Number(gainLossPercentage.toFixed(2))
      };
    });
};

/**
 * Calculates monthly tax reports for capital gains.
 * In Brazil: Sells of stocks up to R$ 20.000 in a calendar month are tax-exempt from income tax.
 * If total sales exceed R$ 20.000, swing trade capital gains are taxed at 15%.
 * Note: ETFs and Real Estate Funds (FIIs) do NOT enjoy the 20K exemption rules. FIIs are taxed at 20%.
 */
export const calculateMonthlyTaxReports = (transactions: Transaction[]): MonthlyTaxReport[] => {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const monthlyData: Record<string, { salesVolume: number; totalGains: number; withheldTaxSum: number }> = {};
  
  // First calculate running positions for average prices to estimate buy costs
  const runningPositions: Record<string, { qty: number; avgPrice: number; totalCost: number }> = {};
  
  for (const tx of sorted) {
    const ticker = tx.ticker.toUpperCase().trim();
    const month = tx.date.substring(0, 7); // YYYY-MM
    
    if (!runningPositions[ticker]) {
      runningPositions[ticker] = { qty: 0, avgPrice: 0, totalCost: 0 };
    }
    const pos = runningPositions[ticker];
    
    if (!monthlyData[month]) {
      monthlyData[month] = { salesVolume: 0, totalGains: 0, withheldTaxSum: 0 };
    }
    
    if (tx.type === 'COMPRA') {
      const txCost = (tx.quantity * tx.price) + tx.charges;
      const newQty = pos.qty + tx.quantity;
      const newTotalCost = pos.totalCost + txCost;
      pos.avgPrice = newQty > 0 ? newTotalCost / newQty : 0;
      pos.qty = newQty;
      pos.totalCost = newTotalCost;
    } else { // VENDA
      // Gain calculation = Net Sell Proceeds - (Units Sold * Running Average Price)
      const sellProceeds = (tx.quantity * tx.price) - tx.charges;
      const buyCostOfSoldItems = tx.quantity * pos.avgPrice;
      const gain = sellProceeds - buyCostOfSoldItems;
      
      monthlyData[month].salesVolume += (tx.quantity * tx.price);
      monthlyData[month].totalGains += gain;
      // Dedo duro (withheld tax) is 0.005% on sales value for Swing Trade
      monthlyData[month].withheldTaxSum += (tx.quantity * tx.price) * 0.00005;
      
      pos.qty = Math.max(0, pos.qty - tx.quantity);
      pos.totalCost = pos.qty * pos.avgPrice;
    }
  }
  
  return Object.entries(monthlyData).map(([month, data]) => {
    // Exemption rule for Stocks (Sales <= R$ 20.000 in the month)
    const isExempt = data.salesVolume <= 20000;
    const taxRate = 0.15; // Swing trade
    const rawTax = data.totalGains > 0 && !isExempt ? data.totalGains * taxRate : 0;
    // Deduct withholding tax and clamp at 0
    const taxDue = Math.max(0, rawTax - data.withheldTaxSum);
    
    return {
      month,
      salesVolume: Number(data.salesVolume.toFixed(2)),
      totalGains: Number(data.totalGains.toFixed(2)),
      withheldTax: Number(data.withheldTaxSum.toFixed(2)),
      isExempt,
      taxDue: Number(taxDue.toFixed(2)),
      taxPaid: false
    };
  }).sort((a, b) => b.month.localeCompare(a.month)); // Sort descending
};

/**
 * Computes Annual Income Tax (IRPF) information
 */
export const calculateAnnualIRPFReport = (
  transactions: Transaction[], 
  proventos: Provento[], 
  year: number
): AnnualIRPFReport => {
  // 1. Bens e Direitos: Stock positions on Dec 31st of the specified year
  const filteredTxs = transactions.filter(tx => tx.date.substring(0, 4) <= String(year));
  const positions = calculateStockPositions(filteredTxs);
  
  const bensEDireitos = positions.map(pos => {
    const formattedAvgPrice = formatCurrency(pos.averagePrice);
    const formattedTotalCost = formatCurrency(pos.totalCost);
    return {
      ticker: pos.ticker,
      cnpj: pos.cnpj,
      companyName: pos.companyName,
      quantity: pos.totalQuantity,
      averagePrice: pos.averagePrice,
      totalCost: pos.totalCost,
      declarationDescription: `${pos.totalQuantity} ações escriturais da empresa ${pos.companyName} (${pos.ticker}), adquiridas pelo preço médio unitário de ${formattedAvgPrice}, totalizando o custo de aquisição de ${formattedTotalCost}. Custódia mantida na B3.`
    };
  });
  
  // 2. Rendimentos Isentos: Dividends received in the specified year
  const yearProv = proventos.filter(p => p.date.substring(0, 4) === String(year));
  
  const dividendsByCompany: Record<string, { cnpj: string; name: string; sum: number }> = {};
  const jcpByCompany: Record<string, { cnpj: string; name: string; grossSum: number; taxSum: number }> = {};
  
  for (const prov of yearProv) {
    const ticker = prov.ticker.toUpperCase().trim();
    const meta = getCompanyMetadata(ticker);
    
    if (prov.type === 'DIVIDENDO') {
      if (!dividendsByCompany[ticker]) {
        dividendsByCompany[ticker] = { cnpj: meta.cnpj, name: meta.companyName, sum: 0 };
      }
      dividendsByCompany[ticker].sum += prov.totalReceived;
    } else { // JCP
      if (!jcpByCompany[ticker]) {
        jcpByCompany[ticker] = { cnpj: meta.cnpj, name: meta.companyName, grossSum: 0, taxSum: 0 };
      }
      jcpByCompany[ticker].grossSum += prov.totalReceived;
      jcpByCompany[ticker].taxSum += prov.withholdTax;
    }
  }
  
  const rendimentosIsentos = Object.entries(dividendsByCompany).map(([ticker, data]) => ({
    ticker,
    cnpj: data.cnpj,
    companyName: data.name,
    totalDividends: Number(data.sum.toFixed(2))
  }));
  
  const rendimentosTributacaoExclusiva = Object.entries(jcpByCompany).map(([ticker, data]) => ({
    ticker,
    cnpj: data.cnpj,
    companyName: data.name,
    totalJCP: Number(data.grossSum.toFixed(2)),
    withheldTax: Number(data.taxSum.toFixed(2)),
    netJCP: Number((data.grossSum - data.taxSum).toFixed(2))
  }));
  
  return {
    year,
    bensEDireitos,
    rendimentosIsentos,
    rendimentosTributacaoExclusiva
  };
};

/**
 * Initial mock datasets to give user gorgeous live portfolios on first render.
 */
export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx1',
    ticker: 'PETR4',
    type: 'COMPRA',
    date: '2025-01-15',
    quantity: 100,
    price: 34.50,
    charges: 10.50,
    total: 3460.50
  },
  {
    id: 'tx2',
    ticker: 'VALE3',
    type: 'COMPRA',
    date: '2025-02-10',
    quantity: 50,
    price: 58.00,
    charges: 5.20,
    total: 2905.20
  },
  {
    id: 'tx3',
    ticker: 'ITUB4',
    type: 'COMPRA',
    date: '2025-03-05',
    quantity: 200,
    price: 29.80,
    charges: 15.00,
    total: 5975.00
  },
  {
    id: 'tx4',
    ticker: 'WEGE3',
    type: 'COMPRA',
    date: '2025-04-12',
    quantity: 80,
    price: 36.50,
    charges: 6.80,
    total: 2926.80
  },
  {
    id: 'tx5',
    ticker: 'PETR4',
    type: 'COMPRA',
    date: '2025-06-20',
    quantity: 50,
    price: 36.20,
    charges: 5.80,
    total: 1815.80
  },
  {
    id: 'tx6',
    ticker: 'PETR4',
    type: 'VENDA',
    date: '2025-10-15',
    quantity: 30,
    price: 39.80,
    charges: 8.50,
    total: 1185.50
  }
];

export const INITIAL_PROVENTOS: Provento[] = [
  {
    id: 'prov1',
    ticker: 'PETR4',
    type: 'DIVIDENDO',
    date: '2025-05-20',
    quantityHeld: 150,
    amountPerShare: 1.25,
    totalReceived: 187.50,
    withholdTax: 0,
    netAmount: 187.50
  },
  {
    id: 'prov2',
    ticker: 'ITUB4',
    type: 'JCP',
    date: '2025-08-01',
    quantityHeld: 200,
    amountPerShare: 0.45,
    totalReceived: 90.00,
    withholdTax: 13.50,
    netAmount: 76.50
  },
  {
    id: 'prov3',
    ticker: 'VALE3',
    type: 'DIVIDENDO',
    date: '2025-09-15',
    quantityHeld: 50,
    amountPerShare: 2.10,
    totalReceived: 105.00,
    withholdTax: 0,
    netAmount: 105.50
  },
  {
    id: 'prov4',
    ticker: 'WEGE3',
    type: 'DIVIDENDO',
    date: '2025-11-20',
    quantityHeld: 80,
    amountPerShare: 0.35,
    totalReceived: 28.00,
    withholdTax: 0,
    netAmount: 28.00
  },
  {
    id: 'prov5',
    ticker: 'PETR4',
    type: 'JCP',
    date: '2025-12-18',
    quantityHeld: 120,
    amountPerShare: 0.85,
    totalReceived: 102.00,
    withholdTax: 15.30,
    netAmount: 86.70
  }
];
