import React, { useState } from 'react';
import { Provento, ProventoType } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { Plus, Trash2, Calendar, ShieldCheck, DollarSign, Wallet } from 'lucide-react';

interface ProventosProps {
  proventos: Provento[];
  onAddProvento: (prov: Provento) => void;
  onDeleteProvento: (id: string) => void;
}

export default function Proventos({ proventos, onAddProvento, onDeleteProvento }: ProventosProps) {
  // Local state for single provento entries
  const [ticker, setTicker] = useState('');
  const [type, setType] = useState<ProventoType>('DIVIDENDO');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [quantity, setQuantity] = useState<number | ''>('');
  const [amountPerShare, setAmountPerShare] = useState<number | ''>('');
  const [autoCalculate, setAutoCalculate] = useState(true);
  const [customWithhold, setCustomWithhold] = useState<number | ''>('');

  // Summaries
  const totalDividends = proventos
    .filter(p => p.type === 'DIVIDENDO')
    .reduce((acc, p) => acc + p.totalReceived, 0);

  const totalJCPGross = proventos
    .filter(p => p.type === 'JCP')
    .reduce((acc, p) => acc + p.totalReceived, 0);

  const totalJCPTax = proventos
    .filter(p => p.type === 'JCP')
    .reduce((acc, p) => acc + p.withholdTax, 0);

  const netCombinedReceived = totalDividends + (totalJCPGross - totalJCPTax);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !quantity || !amountPerShare) return;

    const tk = ticker.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
    const qty = Number(quantity);
    const amt = Number(amountPerShare);
    const grossTotal = qty * amt;

    let tax = 0;
    if (type === 'JCP') {
      if (autoCalculate) {
        // Legally in Brazil, JCP withholding tax is 15% on gross amount
        tax = grossTotal * 0.15;
      } else {
        tax = Number(customWithhold) || 0;
      }
    }

    const netAmount = grossTotal - tax;

    const newProv: Provento = {
      id: `manual-prov-${Date.now()}`,
      ticker: tk,
      type,
      date,
      quantityHeld: qty,
      amountPerShare: amt,
      totalReceived: Number(grossTotal.toFixed(2)),
      withholdTax: Number(tax.toFixed(2)),
      netAmount: Number(netAmount.toFixed(2))
    };

    onAddProvento(newProv);

    // Reset fields
    setTicker('');
    setQuantity('');
    setAmountPerShare('');
    setCustomWithhold('');
  };

  return (
    <div id="proventos-section" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Receipts Payout Statistics */}
      <div id="proventos-stats" className="lg:col-span-12 grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Net Cash Received */}
        <div className="p-5 bg-white border border-slate-100 rounded-xl space-y-2 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">Rendimento Líquido Total</span>
          <h3 className="text-2xl font-black text-slate-900 font-mono">{formatCurrency(netCombinedReceived)}</h3>
          <p className="text-[10px] text-slate-400">Total líquido depositado em conta corretora</p>
        </div>

        {/* Exempt Dividends */}
        <div className="p-5 bg-white border border-slate-100 rounded-xl space-y-2 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">Dividendos (Isentos)</span>
          <h3 className="text-2xl font-black text-emerald-600 font-mono">{formatCurrency(totalDividends)}</h3>
          <p className="text-[10px] text-slate-400 flex items-center gap-1">
            <ShieldCheck size={11} className="text-emerald-500" />
            Livre de IR na Declaração Anual
          </p>
        </div>

        {/* Gross JCP Payout */}
        <div className="p-5 bg-white border border-slate-100 rounded-xl space-y-2 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">Juros s/ Capital (Bruto)</span>
          <h3 className="text-2xl font-black text-blue-600 font-mono">{formatCurrency(totalJCPGross)}</h3>
          <p className="text-[10px] text-slate-400">Tributação retida exclusivamente na fonte</p>
        </div>

        {/* Retained taxes to report */}
        <div className="p-5 bg-white border border-slate-100 rounded-xl space-y-2 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">IRRF Retido na Fonte (JCP)</span>
          <h3 className="text-2xl font-black text-slate-900 font-mono">{formatCurrency(totalJCPTax)}</h3>
          <p className="text-[10px] text-slate-400">
            Apurado sob alíquota compulsória de <span className="font-semibold text-rose-500">15%</span>
          </p>
        </div>
      </div>

      {/* Manual Insertion Card */}
      <div id="provento-entry-box" className="lg:col-span-4 bg-white border border-slate-100 rounded-xl p-5 shadow-xs">
        <h4 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
          <Calendar size={16} className="text-indigo-500" />
          Registrar Provento Recebido
        </h4>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium text-slate-600">
          <div>
            <label className="block mb-1 font-semibold">CÓDIGO DO ATIVO</label>
            <input
              type="text"
              placeholder="Ex: PETR4, BBAS3"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              required
              className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-800 focus:outline-indigo-500 font-mono font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-semibold">TIPO PROVENTO</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ProventoType)}
                className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-800 font-bold focus:outline-indigo-500"
              >
                <option value="DIVIDENDO">DIVIDENDO</option>
                <option value="JCP">J.C.P.</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 font-semibold">DATA PAGAMENTO</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-800 font-mono focus:outline-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-semibold">QUANTIDADE TOTAL NA DATA-COM</label>
              <input
                type="number"
                min="1"
                placeholder="Ex de ações held"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                required
                className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-800 focus:outline-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">VALOR POR AÇÃO (BRUTO)</label>
              <input
                type="number"
                min="0.000001"
                step="0.000001"
                placeholder="Ex: 0.3542"
                value={amountPerShare}
                onChange={(e) => setAmountPerShare(e.target.value === '' ? '' : Number(e.target.value))}
                required
                className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-800 focus:outline-indigo-500 font-mono"
              />
            </div>
          </div>

          {type === 'JCP' && (
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[11px] text-slate-700">Autocalcular imposto de 15%</span>
                <input
                  type="checkbox"
                  checked={autoCalculate}
                  onChange={(e) => setAutoCalculate(e.target.checked)}
                  className="w-4 h-4 cursor-pointer focus:ring-opacity-0 focus:ring-0 accent-blue-600"
                />
              </div>
              
              {!autoCalculate && (
                <div>
                  <label className="block text-[10px] mb-1 font-semibold text-slate-500">VALOR IMPOSTO RETIDO (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Valor específico do IRRF"
                    value={customWithhold}
                    onChange={(e) => setCustomWithhold(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-sm font-mono text-slate-800 text-xs"
                  />
                </div>
              )}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100">
            <button
              type="submit"
              className="w-full bg-slate-900 text-white p-2.5 rounded-lg hover:bg-slate-800 font-semibold cursor-pointer duration-150 text-center flex items-center justify-center gap-1.5"
            >
              <Plus size={14} />
              Adicionar Provento
            </button>
          </div>
        </form>
      </div>

      {/* Ledger of Payouts Received */}
      <div id="proventos-ledger" className="lg:col-span-8 bg-white border border-slate-100 rounded-xl p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-4">
            <div>
              <h3 className="font-semibold text-slate-800 text-md">Lançamentos de Rendimentos</h3>
              <p className="text-xs text-slate-400">Listagem consolidada de distribuições pagas das empresas</p>
            </div>
          </div>

          {proventos.length === 0 ? (
            <div className="py-24 text-center text-slate-400 space-y-2">
              <p className="text-sm">Nenhum provento cadastrado na conta.</p>
              <p className="text-xs">Lance os juros ou dividendos creditados para estruturar a declaração de Imposto de Renda (IRPF).</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[350px]">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-4">Data Pagto</th>
                    <th className="py-2.5 px-4 font-mono">Ativo</th>
                    <th className="py-2.5 px-4">Tipo</th>
                    <th className="py-2.5 px-4 text-right">Qtd Com</th>
                    <th className="py-2.5 px-4 text-right">Valor Unit.</th>
                    <th className="py-2.5 px-4 text-right">Bruto Total</th>
                    <th className="py-2.5 px-4 text-right">IR Retido</th>
                    <th className="py-2.5 px-4 text-right">Meteóric Líq.</th>
                    <th className="py-2.5 px-4">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700 font-sans">
                  {[...proventos]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((prov) => (
                      <tr key={prov.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{formatDate(prov.date)}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{prov.ticker}</td>
                        <td className="py-3 px-4">
                          <span className={`p-1 px-2 text-[10px] rounded-lg font-bold ${prov.type === 'DIVIDENDO' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                            {prov.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">{prov.quantityHeld}</td>
                        <td className="py-3 px-4 text-right font-mono">R$ {prov.amountPerShare.toFixed(4)}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">{formatCurrency(prov.totalReceived)}</td>
                        <td className="py-3 px-4 text-right font-mono text-rose-500">
                          {prov.withholdTax > 0 ? `-${formatCurrency(prov.withholdTax)}` : 'R$ 0,00'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-900 font-bold">{formatCurrency(prov.netAmount)}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => onDeleteProvento(prov.id)}
                            className="p-1 text-slate-300 hover:text-rose-500 hover:bg-slate-50 rounded-lg duration-100 transition-all cursor-pointer"
                            title="Remover rendimento"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
