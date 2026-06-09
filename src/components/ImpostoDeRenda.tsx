import React, { useState } from 'react';
import { Transaction, Provento } from '../types';
import { 
  calculateStockPositions, 
  calculateMonthlyTaxReports, 
  calculateAnnualIRPFReport, 
  formatCurrency 
} from '../utils';
import { Clipboard, Check, Calendar, ShieldAlert, Award, FileText, Bookmark, Calculator } from 'lucide-react';

interface ImpostoDeRendaProps {
  transactions: Transaction[];
  proventos: Provento[];
}

export default function ImpostoDeRenda({ transactions, proventos }: ImpostoDeRendaProps) {
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [activeFicha, setActiveFicha] = useState<'bens' | 'isentos' | 'exclusiva' | 'mensal'>('bens');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Computations
  const irpfReport = calculateAnnualIRPFReport(transactions, proventos, selectedYear);
  const monthlyReports = calculateMonthlyTaxReports(transactions);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 1500);
  };

  return (
    <div id="taxes-view" className="space-y-6">
      
      {/* Year selector and layout header */}
      <div className="p-5 bg-white border border-slate-100 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-800 text-md flex items-center gap-1.5">
            <Calculator className="text-slate-900" size={18} />
            Gerador de Relatórios para IRPF (Receita Federal)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Copie os dados mastigados diretamente para os campos correspondentes do Programa Gerador da Declaração (PGD).
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">Ano-Calendário da Declaração:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="p-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 bg-slate-50 focus:outline-indigo-500"
          >
            <option value={2025}>2025 (Declarado em 2026)</option>
            <option value={2026}>2026 (Declarado em 2027)</option>
          </select>
        </div>
      </div>

      {/* Primary interface splits */}
      <div id="taxes-tabs-wrapper" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Fichas selection menu */}
        <div className="lg:col-span-3 space-y-2">
          <div className="bg-white border border-slate-100 rounded-xl p-3 space-y-1">
            <span className="p-2 pb-1 block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fichas da Declaração Anual</span>
            
            <button
              onClick={() => setActiveFicha('bens')}
              className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2.5 cursor-pointer ${
                activeFicha === 'bens' 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Bookmark size={14} />
              Bens e Direitos (Grupo 03 / 01)
            </button>

            <button
              onClick={() => setActiveFicha('isentos')}
              className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2.5 cursor-pointer ${
                activeFicha === 'isentos' 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileText size={14} />
              Rendimentos Isentos (Cod 09)
            </button>

            <button
              onClick={() => setActiveFicha('exclusiva')}
              className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2.5 cursor-pointer ${
                activeFicha === 'exclusiva' 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Award size={14} />
              Tributação Exclusiva - JCP (Cod 10)
            </button>

            <div className="my-2 border-t border-slate-100" />
            <span className="p-2 pb-1 block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Apuração Mensal</span>

            <button
              onClick={() => setActiveFicha('mensal')}
              className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2.5 cursor-pointer ${
                activeFicha === 'mensal' 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Calendar size={14} />
              Ganhos de Capital & DARF
            </button>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-100 text-[11px] text-amber-800 rounded-xl space-y-1 bg-amber-50/60 leading-normal">
            <span className="font-bold block flex items-center gap-1">
              <ShieldAlert size={12} className="text-amber-600" />
              Aviso de Atenção Legal
            </span>
            As regras de isenção de R$ 20.000 são exclusivas para operações comuns de Ações Brasileiras. Day trade e cotas de FIIs não contam com isenções e são sujeitos a alíquotas fixas com declaração obrigatória.
          </div>
        </div>

        {/* Ficha Content Render */}
        <div className="lg:col-span-9 bg-white border border-slate-100 rounded-xl p-5 min-h-[400px]">
          
          {/* Ficha 1: Bens e Direitos */}
          {activeFicha === 'bens' && (
            <div className="space-y-4">
              <div className="border-b border-slate-50 pb-3">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  Ficha Bens e Direitos
                  <span className="text-xs font-semibold text-slate-400">Grupo 03 - Participações, Código 01 - Ações</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">Sua custódia de ativos em carteira ponderada pelo Preço Médio de Aquisição em 31/12 de {selectedYear}.</p>
              </div>

              {irpfReport.bensEDireitos.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs">
                  Nenhuma custódia aberta encontrada para o ano-calendário {selectedYear}.
                </div>
              ) : (
                <div className="space-y-4">
                  {irpfReport.bensEDireitos.map((item) => (
                    <div key={item.ticker} className="p-4 bg-slate-50/60 border border-slate-100 rounded-xl space-y-3">
                      
                      {/* Asset Header */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-black text-slate-800 bg-white border border-slate-100 py-1 px-2.5 rounded-lg">{item.ticker}</span>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">{item.companyName}</span>
                            <span className="text-[10px] font-mono text-slate-400">CNPJ Pagadora: {item.cnpj}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-right">
                          <div className="text-xs font-mono">
                            <span className="text-slate-400 block text-[10px]">Quantidade Custodiada</span>
                            <span className="font-bold text-slate-800">{item.quantity} cotas</span>
                          </div>
                          <div className="text-xs font-mono">
                            <span className="text-slate-400 block text-[10px]">Custo Contábil</span>
                            <span className="font-bold text-slate-900">{formatCurrency(item.totalCost)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Text Description Box */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Discriminação Autogerada (Receita Federal):</span>
                        <div className="p-3 bg-white border border-slate-100 rounded-lg text-xs leading-relaxed text-slate-700 relative flex justify-between gap-4">
                          <span className="font-sans pr-16">{item.declarationDescription}</span>
                          <button
                            onClick={() => copyToClipboard(item.declarationDescription, `bens-${item.ticker}`)}
                            className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border shrink-0 h-fit self-center duration-100 cursor-pointer ${
                              copiedId === `bens-${item.ticker}`
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                : 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100'
                            }`}
                          >
                            {copiedId === `bens-${item.ticker}` ? (
                              <>
                                <Check size={12} />
                                Copiado
                              </>
                            ) : (
                              <>
                                <Clipboard size={12} />
                                Copiar
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Ficha 2: Rendimentos Isentos */}
          {activeFicha === 'isentos' && (
            <div className="space-y-4">
              <div className="border-b border-slate-50 pb-3">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  Ficha Rendimentos Isentos e Não Tributáveis
                  <span className="text-xs font-semibold text-slate-400">Tipo 09 - Lucros e dividendos recebidos</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">Soma integral dos Dividendos recebidos em conta de cada empresa pagadora durante {selectedYear}.</p>
              </div>

              {irpfReport.rendimentosIsentos.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs">
                  Nenhum dividendo líquido recebido ou cadastrado para o ano-calendário {selectedYear}.
                </div>
              ) : (
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-4 font-mono">Ticker B3</th>
                        <th className="py-2.5 px-4">CNPJ da Fonte Pagadora</th>
                        <th className="py-2.5 px-4">Nome da Empresa (Fonte Pagadora)</th>
                        <th className="py-2.5 px-4 text-right">Valor Creditado</th>
                        <th className="py-2.5 px-4 text-center">Copiar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-700 font-sans">
                      {irpfReport.rendimentosIsentos.map((item) => (
                        <tr key={item.ticker} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">{item.ticker}</td>
                          <td className="py-3 px-4 font-mono select-all font-semibold">{item.cnpj}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{item.companyName}</td>
                          <td className="py-3 px-4 text-right font-mono font-black text-slate-900">{formatCurrency(item.totalDividends)}</td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => copyToClipboard(String(item.totalDividends.toFixed(2)).replace('.', ','), `div-${item.ticker}`)}
                              className={`p-1.5 rounded-sm text-[10px] font-bold duration-100 cursor-pointer ${
                                copiedId === `div-${item.ticker}`
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {copiedId === `div-${item.ticker}` ? 'Copiado!' : 'Copiar R$'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Ficha 3: JCP Tributação Exclusiva */}
          {activeFicha === 'exclusiva' && (
            <div className="space-y-4">
              <div className="border-b border-slate-50 pb-3">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  Ficha Rendimentos Sujeitos à Tributação Exclusiva/Definitiva
                  <span className="text-xs font-semibold text-slate-400">Tipo 10 - Juros sobre o capital próprio</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">Informa os valores líquidos totais pagos a título de JCP das companhias para a Receita Federal.</p>
              </div>

              {irpfReport.rendimentosTributacaoExclusiva.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs">
                  Nenhum Juro sobre Capital Próprio cadastrado como recebido para o ano-calendário {selectedYear}.
                </div>
              ) : (
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-4 font-mono">CNPJ da Fonte Pagadora</th>
                        <th className="py-2.5 px-4">Nome da Empresa Pagadora (B3)</th>
                        <th className="py-2.5 px-4 text-right">Rendimento Bruto</th>
                        <th className="py-2.5 px-4 text-right">Imposto Retido (15%)</th>
                        <th className="py-2.5 px-4 text-right font-black">Rendimento Líquido</th>
                        <th className="py-2.5 px-4 text-center">Copiar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-700 font-sans">
                      {irpfReport.rendimentosTributacaoExclusiva.map((item) => (
                        <tr key={item.ticker} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-mono select-all font-semibold text-slate-500">{item.cnpj}</td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">{item.companyName}</div>
                            <div className="text-[10px] text-slate-400 font-mono font-bold">Ativo: {item.ticker}</div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-500">{formatCurrency(item.totalJCP)}</td>
                          <td className="py-3 px-4 text-right font-mono text-rose-500">{formatCurrency(item.withheldTax)}</td>
                          <td className="py-3 px-4 text-right font-mono font-black text-slate-900">{formatCurrency(item.netJCP)}</td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => copyToClipboard(String(item.netJCP.toFixed(2)).replace('.', ','), `jcp-${item.ticker}`)}
                              className={`p-1.5 rounded-sm text-[10px] font-bold duration-100 cursor-pointer ${
                                copiedId === `jcp-${item.ticker}`
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {copiedId === `jcp-${item.ticker}` ? 'Copiado!' : 'Copiar Líq.'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Ficha 4: Apuração Mensal de Ganhos Capital */}
          {activeFicha === 'mensal' && (
            <div className="space-y-4">
              <div className="border-b border-slate-50 pb-3">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  Operações Comuns e Ganhos Mensais (Apuração DARF)
                </h4>
                <p className="text-xs text-slate-400 mt-1">Relatórios mensais calculando isenção de R$ 20k, ganhos com vendas e imposto devido.</p>
              </div>

              {monthlyReports.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs">
                  Nenhuma transação de venda de ações cadastrada para cálculo de impostos ou lucros.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-4 font-mono">Mês de Apuração</th>
                          <th className="py-2.5 px-4 text-right">Volume Total Vendas</th>
                          <th className="py-2.5 px-4 text-right">Resultado Período</th>
                          <th className="py-2.5 px-4 text-center">Isenção (Stock R$ 20k)</th>
                          <th className="py-2.5 px-4 text-right">Fingerprint B3 (IRRF)</th>
                          <th className="py-2.5 px-4 text-right font-black">DARF (IR Devido)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-slate-700 font-sans">
                        {monthlyReports.map((report) => (
                          <tr key={report.month} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">{report.month}</td>
                            <td className="py-3 px-4 text-right font-mono text-slate-600">{formatCurrency(report.salesVolume)}</td>
                            <td className={`py-3 px-4 text-right font-mono font-semibold ${report.totalGains >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {report.totalGains >= 0 ? '+' : ''}{formatCurrency(report.totalGains)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {report.isExempt ? (
                                <span className="p-1 px-2.5 text-[9px] bg-emerald-50 text-emerald-600 rounded-full font-bold">ISENTO</span>
                              ) : (
                                <span className="p-1 px-2.5 text-[9px] bg-amber-50 text-amber-600 rounded-full font-bold">TRIBUTADO</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-400">{formatCurrency(report.withheldTax)}</td>
                            <td className={`py-3 px-4 text-right font-mono font-bold ${report.taxDue > 0 ? 'text-rose-600 font-black' : 'text-slate-800'}`}>
                              {report.taxDue > 0 ? formatCurrency(report.taxDue) : 'R$ 0,00'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* DARF payment instructions */}
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                    <span className="font-bold text-xs text-slate-700 block">Como pagar tributos sobre ações no Brasil:</span>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Se você obteve lucros em swing trade operando volumes acima de R$ 20.000,00 em um mês (como apontado nos meses marcados com <span className="text-amber-600 font-bold">TRIBUTADO</span> acima), você deve preencher e pagar um boleto DARF (Documento de Arrecadação de Receitas Federais).
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-[11px] text-slate-600 font-medium">
                      <div className="p-2.5 bg-white border border-slate-100 rounded-lg">
                        <span className="font-bold text-slate-700 block mb-0.5">Código da Receita Federal:</span>
                        Use o código <span className="font-mono font-bold text-indigo-600">6015</span> (IRPF - Ganhos Líquidos em Operações em Bolsa).
                      </div>
                      <div className="p-2.5 bg-white border border-slate-100 rounded-lg">
                        <span className="font-bold text-slate-700 block mb-0.5">Vencimento de Pagamento:</span>
                        Até o <span className="font-semibold text-slate-700">último dia útil do mês subsequente</span> ao mês das operações realizadas.
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
