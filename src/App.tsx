import React, { useState, useEffect } from 'react';
import { Transaction, Provento, StockPosition } from './types';
import { 
  INITIAL_TRANSACTIONS, 
  INITIAL_PROVENTOS, 
  calculateStockPositions 
} from './utils';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Proventos from './components/Proventos';
import ImpostoDeRenda from './components/ImpostoDeRenda';
import B3Assistant from './components/B3Assistant';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, 
  TrendingUp, 
  Wallet, 
  FileText, 
  Sparkles, 
  LayoutDashboard, 
  CheckCircle2, 
  Info,
  Layers
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'proventos' | 'irpf' | 'ai'>('dashboard');
  
  // Real Local state initialized from LocalStorage or Fallback seed data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [proventos, setProventos] = useState<Provento[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Initialize data on component mount
  useEffect(() => {
    try {
      const storedTxs = localStorage.getItem('b3_transactions');
      const storedProvs = localStorage.getItem('b3_proventos');
      
      if (storedTxs) {
        setTransactions(JSON.parse(storedTxs));
      } else {
        // Seed initial transactions so user doesn't see zero state and can play around
        setTransactions(INITIAL_TRANSACTIONS);
        localStorage.setItem('b3_transactions', JSON.stringify(INITIAL_TRANSACTIONS));
      }
      
      if (storedProvs) {
        setProventos(JSON.parse(storedProvs));
      } else {
        // Seed initial proventos
        setProventos(INITIAL_PROVENTOS);
        localStorage.setItem('b3_proventos', JSON.stringify(INITIAL_PROVENTOS));
      }
    } catch (e) {
      console.error('Failed to parse localStorage data', e);
      setTransactions(INITIAL_TRANSACTIONS);
      setProventos(INITIAL_PROVENTOS);
    } finally {
      setIsDataLoaded(true);
    }
  }, []);

  // Save changes to localStorage
  const saveTransactionsToStorage = (newTxs: Transaction[]) => {
    setTransactions(newTxs);
    localStorage.setItem('b3_transactions', JSON.stringify(newTxs));
  };

  const saveProventosToStorage = (newProvs: Provento[]) => {
    setProventos(newProvs);
    localStorage.setItem('b3_proventos', JSON.stringify(newProvs));
  };

  // Callback methods
  const handleAddTransaction = (newTx: Transaction) => {
    const updated = [newTx, ...transactions];
    saveTransactionsToStorage(updated);
  };

  const handleAddMultipleTransactions = (newTxs: Transaction[]) => {
    const updated = [...newTxs, ...transactions];
    saveTransactionsToStorage(updated);
  };

  const handleDeleteTransaction = (id: string) => {
    const filtered = transactions.filter(tx => tx.id !== id);
    saveTransactionsToStorage(filtered);
  };

  const handleClearAll = () => {
    saveTransactionsToStorage([]);
    saveProventosToStorage([]);
  };

  const handleAddProvento = (newProv: Provento) => {
    const updated = [newProv, ...proventos];
    saveProventosToStorage(updated);
  };

  const handleDeleteProvento = (id: string) => {
    const filtered = proventos.filter(pr => pr.id !== id);
    saveProventosToStorage(filtered);
  };

  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);

  // Fetch live prices from our server endpoint
  const fetchLiveQuotes = async (txList: Transaction[]) => {
    const tickers = Array.from(new Set(txList.map(tx => tx.ticker.toUpperCase().trim())))
      .filter(t => t.length > 0);
    
    if (tickers.length === 0) return;

    setIsRefreshingPrices(true);
    try {
      const response = await fetch(`/api/b3/quotes?tickers=${tickers.join(',')}`);
      if (!response.ok) throw new Error("Falha ao obter cotações atuais.");
      const data = await response.json();
      if (data.success && data.quotes) {
        setLivePrices(prev => ({
          ...prev,
          ...data.quotes
        }));
      }
    } catch (err) {
      console.error("Erro ao buscar cotações em tempo real:", err);
    } finally {
      setIsRefreshingPrices(false);
    }
  };

  // Trigger quote fetching when transactions load or change
  useEffect(() => {
    if (isDataLoaded && transactions.length > 0) {
      fetchLiveQuotes(transactions);
    }
  }, [transactions, isDataLoaded]);

  // Derive active stock positions based on transaction books
  const positions = calculateStockPositions(transactions, livePrices);

  return (
    <div id="full-app-shell" className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col justify-between">
      
      {/* Top Brand Hub Navigation Bar */}
      <header id="b3-nav-bar" className="sticky top-0 bg-white/85 backdrop-blur-md border-b border-slate-100 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Visual Logo Group */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                <Layers size={20} />
              </div>
              <div>
                <span className="font-extrabold text-slate-950 text-base tracking-tight block">B3 Invest</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Carteira & IRPF Integrador</span>
              </div>
            </div>

            {/* Practical Top Badges */}
            <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-1.5 p-1.5 px-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg">
                <div className={`w-2 h-2 rounded-full bg-emerald-500 ${isRefreshingPrices ? 'animate-ping' : ''}`} />
                <span>Cotações B3 Realistas</span>
              </div>
              <button 
                onClick={() => fetchLiveQuotes(transactions)}
                disabled={isRefreshingPrices || transactions.length === 0}
                className="p-1.5 px-3 border border-slate-205 bg-white hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 rounded-lg font-semibold flex items-center gap-1.5 transition-all text-xs text-slate-700 cursor-pointer disabled:opacity-50"
              >
                {isRefreshingPrices ? (
                  <>
                    <div className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                    <span>Carregando...</span>
                  </>
                ) : (
                  <>
                    <TrendingUp size={13} className="text-slate-500" />
                    <span>Atualizar B3</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Panel Content Wrap */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Navigation Tabs Menu */}
        <div id="navigation-tabs" className="bg-white border border-slate-100 rounded-xl p-1.5 flex items-center gap-1.5 overflow-x-auto shadow-sm">
          
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 duration-100 shrink-0 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <LayoutDashboard size={14} />
            Painel Geral
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 duration-100 shrink-0 cursor-pointer ${
              activeTab === 'transactions'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Briefcase size={14} />
            Ações & Transações
          </button>

          <button
            onClick={() => setActiveTab('proventos')}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 duration-100 shrink-0 cursor-pointer ${
              activeTab === 'proventos'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Wallet size={14} />
            Lançar Proventos (Dividendos/JCP)
          </button>

          <button
            onClick={() => setActiveTab('irpf')}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 duration-100 shrink-0 cursor-pointer ${
              activeTab === 'irpf'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileText size={14} />
            Imposto de Renda (IRPF)
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 duration-100 shrink-0 cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50'
            }`}
          >
            <Sparkles size={14} />
            Bússola IA (Consultor)
          </button>

        </div>

        {/* Tab components with animated fade transitions using motion/react */}
        {!isDataLoaded ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
            <span className="text-xs text-slate-400 font-medium">Carregando carteira de investimentos...</span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="outline-hidden"
            >
              {activeTab === 'dashboard' && (
                <Dashboard 
                  positions={positions} 
                  proventos={proventos} 
                />
              )}
              {activeTab === 'transactions' && (
                <Transactions 
                  transactions={transactions}
                  onAddTransaction={handleAddTransaction}
                  onAddMultipleTransactions={handleAddMultipleTransactions}
                  onDeleteTransaction={handleDeleteTransaction}
                  onClearAll={handleClearAll}
                />
              )}
              {activeTab === 'proventos' && (
                <Proventos 
                  proventos={proventos}
                  onAddProvento={handleAddProvento}
                  onDeleteProvento={handleDeleteProvento}
                />
              )}
              {activeTab === 'irpf' && (
                <ImpostoDeRenda 
                  transactions={transactions} 
                  proventos={proventos} 
                />
              )}
              {activeTab === 'ai' && (
                <B3Assistant 
                  positions={positions} 
                  proventos={proventos} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}

      </main>

      {/* Humble Aesthetic Footer */}
      <footer id="app-footer" className="bg-white border-t border-slate-100 py-6 mt-12 text-xs text-slate-400 text-center font-medium">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-slate-300" />
            <span>© 25-26 B3 Invest - Gerenciamento de Patrimônio e IRPF.</span>
          </div>
          <div className="flex items-center gap-1">
            <Info size={12} className="text-slate-350" />
            Todos os preços de ativos são simulados para ilustrar o balanceamento. Para sua declaração do imposto, os cálculos de custo de aquisição (Preço Médio) usam o valor real de suas notas emitidas pela corretora.
          </div>
        </div>
      </footer>

    </div>
  );
}
