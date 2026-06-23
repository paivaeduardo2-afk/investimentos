import React from 'react';
import { StockPosition, Provento } from '../types';
import { formatCurrency, formatPercent } from '../utils';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { Wallet, TrendingUp, Award, DollarSign, PieChart as PieIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface DashboardProps {
  positions: StockPosition[];
  proventos: Provento[];
}

export default function Dashboard({ positions, proventos }: DashboardProps) {
  // Calculations
  const totalCostBasis = positions.reduce((acc, pos) => acc + pos.totalCost, 0);
  const totalCurrentValue = positions.reduce((acc, pos) => acc + pos.currentTotal, 0);
  const totalGainLoss = totalCurrentValue - totalCostBasis;
  const gainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;
  
  const totalDividends = proventos
    .filter(p => p.type === 'DIVIDENDO')
    .reduce((acc, p) => acc + p.totalReceived, 0);
    
  const totalJCPGross = proventos
    .filter(p => p.type === 'JCP')
    .reduce((acc, p) => acc + p.totalReceived, 0);
    
  const totalJCPNet = proventos
    .filter(p => p.type === 'JCP')
    .reduce((acc, p) => acc + p.netAmount, 0);

  const totalProventosNet = totalDividends + totalJCPNet;
  const portfolioYieldOnCost = totalCostBasis > 0 ? (totalProventosNet / totalCostBasis) * 100 : 0;

  // Pie Chart Data: Allocation percentage
  const COLORS = ['#0f172a', '#2563eb', '#16a34a', '#db2777', '#ca8a04', '#7c3aed', '#0891b2', '#ea580c', '#475569', '#10b981'];
  
  const allocationData = positions.map(pos => ({
    name: pos.ticker,
    value: pos.currentTotal,
    percentage: totalCurrentValue > 0 ? (pos.currentTotal / totalCurrentValue) * 100 : 0
  })).sort((a, b) => b.value - a.value);

  // Bar Chart Data: Monthly dividends received
  const monthlyProvMap: Record<string, { month: string; dividendo: number; jcp: number }> = {};
  
  // Sort proventos by date
  const sortedProventos = [...proventos].sort((a, b) => a.date.localeCompare(b.date));
  
  for (const prov of sortedProventos) {
    const monthYear = prov.date.substring(0, 7); // e.g., '2025-05'
    // Format monthYear to 'MMM/YY'
    const [year, month] = monthYear.split('-');
    const monthsBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const formattedMonth = `${monthsBR[parseInt(month, 10) - 1]}/${year.substring(2)}`;

    if (!monthlyProvMap[monthYear]) {
      monthlyProvMap[monthYear] = { month: formattedMonth, dividendo: 0, jcp: 0 };
    }
    
    if (prov.type === 'DIVIDENDO') {
      monthlyProvMap[monthYear].dividendo += prov.netAmount;
    } else {
      monthlyProvMap[monthYear].jcp += prov.netAmount;
    }
  }

  const monthlyProventosData = Object.values(monthlyProvMap);

  return (
    <div id="dashboard-view" className="space-y-6">
      {/* High-value Stats Grid */}
      <div id="stats-grid" className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Cost Basis Card */}
        <div id="card-cost" className="p-5 bg-white border border-slate-100 rounded-xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Total Investido</span>
            <div className="p-2 bg-slate-50 rounded-lg text-slate-700">
              <Wallet size={18} />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{formatCurrency(totalCostBasis)}</h3>
            <p className="text-xs text-slate-400">Total acumulado (custo mais taxas)</p>
          </div>
        </div>

        {/* Current Total Value Card */}
        <div id="card-current" className="p-5 bg-white border border-slate-100 rounded-xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Patrimônio Geral</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold bg-linear-to-r from-blue-600 to-slate-900 bg-clip-text text-transparent tracking-tight">
              {formatCurrency(totalCurrentValue)}
            </h3>
            <p className="text-xs text-slate-400">Posição calculada a preço de mercado</p>
          </div>
        </div>

        {/* Profitability Card */}
        <div id="card-gainloss" className="p-5 bg-white border border-slate-100 rounded-xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 font-sans">Retorno da Carteira</span>
            <div className={`p-2 rounded-lg ${totalGainLoss >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <Award size={18} />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className={`text-2xl font-bold flex items-center gap-1.5 tracking-tight ${totalGainLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalGainLoss)}
            </h3>
            <p className={`text-xs font-semibold flex items-center gap-1 ${totalGainLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {totalGainLoss >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {gainLossPercent.toFixed(2)}% de rentabilidade
            </p>
          </div>
        </div>

        {/* Total Proventos received Card */}
        <div id="card-proventos" className="p-5 bg-white border border-slate-100 rounded-xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Proventos Acumulados</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{formatCurrency(totalProventosNet)}</h3>
            <p className="text-xs text-slate-400">
              Yield on Cost: <span className="font-semibold text-emerald-500">{portfolioYieldOnCost.toFixed(2)}%</span>
            </p>
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div id="charts-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Allocation Donut Chart */}
        <div id="chart-allocation-wrapper" className="lg:col-span-4 p-5 bg-white border border-slate-100 rounded-xl flex flex-col justify-between">
          <div>
            <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-1.5">
              <PieIcon size={18} className="text-indigo-500" />
              Alocação da Carteira
            </h4>
            <p className="text-xs text-slate-400 mb-4">Percentagem por código de ação em custódia</p>
          </div>
          
          <div className="h-60 relative flex items-center justify-center">
            {positions.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Investimento atual']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #f1f5f9', fontFamily: 'sans-serif' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-slate-400 text-center">Nenhuma ação em aberto para exibir</div>
            )}
            
            {/* Center Summary */}
            {positions.length > 0 && (
              <div className="absolute text-center">
                <span className="text-xs text-slate-400 font-medium block">Total</span>
                <span className="text-lg font-bold text-slate-800">{formatCurrency(totalCurrentValue)}</span>
              </div>
            )}
          </div>

          <div id="allocation-legend" className="max-h-36 overflow-y-auto space-y-1.5 mt-4 pt-4 border-t border-slate-50">
            {allocationData.slice(0, 5).map((entry, index) => (
              <div key={entry.name} className="flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="font-mono font-bold text-slate-800">{entry.name}</span>
                </div>
                <span>{entry.percentage.toFixed(1)}%</span>
              </div>
            ))}
            {allocationData.length > 5 && (
              <div className="text-[10px] text-slate-400 text-center mt-1">
                + {allocationData.length - 5} outros ativos
              </div>
            )}
          </div>
        </div>

        {/* Dividends Monthly bar chart */}
        <div id="chart-dividends-wrapper" className="lg:col-span-8 p-5 bg-white border border-slate-100 rounded-xl flex flex-col justify-between">
          <div>
            <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-1.5">
              <DollarSign size={18} className="text-emerald-500" />
              Evolução dos Rendimentos Recebidos
            </h4>
            <p className="text-xs text-slate-400 mb-4">Proventos líquidos mensais de dividendos e JCP depositados</p>
          </div>

          <div className="h-72">
            {proventos.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyProventosData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tickLine={false} stroke="#64748b" style={{ fontSize: '11px', fontFamily: 'monospace' }} />
                  <YAxis tickLine={false} axisLine={false} stroke="#64748b" style={{ fontSize: '11px' }} />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Líquido']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #f1f5f9' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="dividendo" name="Dividendo (Isento)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="jcp" name="JCP (Tributado Retido)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400 text-center">
                Configure proventos recebidos na aba "Proventos" para ver a linha do tempo
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Asset table view in landing page */}
      <div id="top-positions" className="bg-white border border-slate-100 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-800 text-md">Posições Atuais de Ações</h3>
            <p className="text-xs text-slate-400">Visão geral compilada de suas participações e preços médios</p>
          </div>
        </div>

        {positions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Nenhuma ação cadastrada para controle. Adicione operações na aba de <span className="font-semibold text-indigo-500">Ações & Transações</span>.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Ativo</th>
                  <th className="py-3 px-4">Nome da Empresa / CNPJ</th>
                  <th className="py-3 px-4 text-right">Quantidade</th>
                  <th className="py-3 px-4 text-right">Preço Médio</th>
                  <th className="py-3 px-4 text-right">Investimento (Custo)</th>
                  <th className="py-3 px-4 text-right">Cotação Atual</th>
                  <th className="py-3 px-4 text-right">Patrimônio Atual</th>
                  <th className="py-3 px-4 text-right">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-sans text-slate-700">
                {positions.map((pos) => (
                  <tr key={pos.ticker} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{pos.ticker}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{pos.companyName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{pos.cnpj}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold">{pos.totalQuantity}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(pos.averagePrice)}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">{formatCurrency(pos.totalCost)}</td>
                    <td className="py-3 px-4 text-right font-mono text-blue-600 font-medium">{formatCurrency(pos.currentPrice)}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900 font-bold">{formatCurrency(pos.currentTotal)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className={`font-mono font-bold flex items-center justify-end gap-1 ${pos.gainLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {pos.gainLoss >= 0 ? '+' : ''}{formatCurrency(pos.gainLoss)}
                      </div>
                      <div className={`text-[10px] font-semibold ${pos.gainLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {pos.gainLoss >= 0 ? '▲' : '▼'} {pos.gainLossPercentage.toFixed(2)}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
