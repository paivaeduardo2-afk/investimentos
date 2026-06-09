/**
 * Types representing B3 Investment transactions, dividends, and Income Tax declarations.
 */

export type TransactionType = 'COMPRA' | 'VENDA';

export interface Transaction {
  id: string;
  ticker: string; // e.g., PETR4
  type: TransactionType;
  date: string; // YYYY-MM-DD
  quantity: number;
  price: number; // Price per share
  charges: number; // Emolumentos + Taxas de corretagem
  total: number; // (Quantity * Price) +/- Charges (buying adds charges, selling deducts them or represents net money)
}

export type ProventoType = 'DIVIDENDO' | 'JCP';

export interface Provento {
  id: string;
  ticker: string;
  type: ProventoType;
  date: string; // YYYY-MM-DD
  quantityHeld: number; // Quantity held on record date (data com)
  amountPerShare: number;
  totalReceived: number; // Gross for JCP or Net for dividends
  withholdTax: number; // 0 for Dividendo, 15% of gross for JCP
  netAmount: number; // Net cash actually deposited
}

export interface StockPosition {
  ticker: string;
  companyName: string;
  cnpj: string;
  totalQuantity: number;
  averagePrice: number;
  totalCost: number; // totalQuantity * averagePrice
  currentPrice: number;
  currentTotal: number; // totalQuantity * currentPrice
  gainLoss: number; // currentTotal - totalCost
  gainLossPercentage: number;
}

export interface MonthlyTaxReport {
  month: string; // YYYY-MM
  salesVolume: number; // Total volume sold in the month
  totalGains: number; // Sells - Buy成本 of sold goods
  withheldTax: number; // IRRF (dedo-duro) reported by B3
  isExempt: boolean; // Exempt if Stock Sales < R$ 20.000 (and not a day trade)
  taxDue: number; // Tax calculated (15% for Swing Trade, 20% for Day Trade)
  taxPaid: boolean; // Mark as paid
}

export interface AnnualIRPFReport {
  year: number;
  bensEDireitos: {
    ticker: string;
    cnpj: string;
    companyName: string;
    quantity: number;
    averagePrice: number;
    totalCost: number;
    declarationDescription: string;
  }[];
  rendimentosIsentos: {
    ticker: string;
    cnpj: string;
    companyName: string;
    totalDividends: number;
  }[];
  rendimentosTributacaoExclusiva: {
    ticker: string;
    cnpj: string;
    companyName: string;
    totalJCP: number; // Gross value including withholding
    withheldTax: number;
    netJCP: number;
  }[];
}

export interface CompanyMetadata {
  cnpj: string;
  companyName: string;
  sector: string;
  currentPrice: number;
}
