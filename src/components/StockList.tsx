import React, { useState } from 'react';
import { CompanyMetadata } from '../types';
import { COMPANIES_DATABASE, formatCurrency } from '../utils';
import { Search, Plus, Building2, TrendingUp, Info } from 'lucide-react';

interface StockListProps {
  onAddAsPurchase: (ticker: string, price: number) => void;
  livePrices?: Record<string, number>;
}

export default function StockList({ onAddAsPurchase, livePrices }: StockListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('todos');

  // Convert COMPANIES_DATABASE to an array
  const allStocks = Object.entries(COMPANIES_DATABASE).map(([ticker, meta]) => {
    const currentPrice = livePrices && livePrices[ticker] !== undefined ? livePrices[ticker] : meta.currentPrice;
    return {
      ticker,
      ...meta,
      currentPrice
    };
  });

  // Get unique sectors for filter
  const sectors = ['todos', ...Array.from(new Set(allStocks.map(s => s.sector)))];

  // Filter stocks by search term and selected sector
  const filteredStocks = allStocks.filter(stock => {
    const matchesSearch = 
      stock.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.cnpj.includes(searchTerm);
    
    const matchesSector = selectedSector === 'todos' || stock.sector === selectedSector;

    return matchesSearch && matchesSector;
  });

  return (
    <div id="b3-stock-list-container" className="space-y-6">
      
      {/* Search and Filters Header bar */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-800 text-base">Ações Listadas na B3</h3>
            <p className="text-xs text-slate-400">Consulte cotações simuladas ou em tempo real de ativos do mercado brasileiro</p>
          </div>
          
          <div className="flex items-center gap-2 text-xs bg-indigo-50 border border-indigo-100/50 text-indigo-700 font-medium p-2 px-3 rounded-lg">
            <Info size={14} className="shrink-0" />
            <span>Selecione uma ação para agilizar o lançamento de sua compra!</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="md:col-span-8 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Pesquise pelo ticker (Ex: PETR4, VALE3) ou nome da empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-indigo-500"
            />
          </div>

          {/* Sector Selector */}
          <div className="md:col-span-4">
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-600 focus:outline-indigo-500 capitalize"
            >
              <option value="todos">Todos os Setores ({allStocks.length})</option>
              {sectors.filter(s => s !== 'todos').map(sector => (
                <option key={sector} value={sector} className="capitalize">
                  {sector}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stocks Grid/Table */}
      <div className="bg-white border border-slate-100 rounded-xl p-5">
        {filteredStocks.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-xs text-slate-400 font-semibold">Nenhuma ação encontrada para "{searchTerm}".</p>
            <p className="text-[11px] text-slate-400">Tente buscar por termos mais genéricos ou verifique se digitou o ticker correto.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 font-mono">Ticker</th>
                  <th className="py-3 px-4">Empresa</th>
                  <th className="py-3 px-4">Setor</th>
                  <th className="py-3 px-4">CNPJ</th>
                  <th className="py-3 px-4 text-right">Cotação Estimada</th>
                  <th className="py-3 px-4 text-center">Lançar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700 font-sans">
                {filteredStocks.map((stock) => (
                  <tr key={stock.ticker} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-extrabold text-sm text-slate-900 bg-slate-100 px-2 py-1 rounded-lg">
                          {stock.ticker}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <div>
                        <span>{stock.companyName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      <div className="flex items-center gap-1">
                        <Building2 size={13} className="text-slate-400 shrink-0" />
                        <span className="capitalize">{stock.sector}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {stock.cnpj}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-[13px]">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp size={12} className="text-emerald-500" />
                        <span>{formatCurrency(stock.currentPrice)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => onAddAsPurchase(stock.ticker, stock.currentPrice)}
                        className="p-2 px-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-bold cursor-pointer text-[11px] inline-flex items-center gap-1.5 transition-all duration-150 active:scale-95"
                      >
                        <Plus size={13} />
                        Lançar Compra
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
  );
}
