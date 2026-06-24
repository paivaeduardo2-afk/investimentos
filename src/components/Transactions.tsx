import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType } from '../types';
import { formatCurrency, formatDate, COMPANIES_DATABASE } from '../utils';
import { Plus, Trash2, Import, ClipboardPaste, Wand2, Sparkles, Loader2, Info, Pencil } from 'lucide-react';

interface TransactionsProps {
  transactions: Transaction[];
  onAddTransaction: (tx: Transaction) => void;
  onAddMultipleTransactions: (txs: Transaction[]) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onClearAll: () => void;
  prefilledTx?: { ticker: string; type: TransactionType; price: number } | null;
  onClearPrefilled?: () => void;
}

export default function Transactions({
  transactions,
  onAddTransaction,
  onAddMultipleTransactions,
  onEditTransaction,
  onDeleteTransaction,
  onClearAll,
  prefilledTx,
  onClearPrefilled
}: TransactionsProps) {
  // Local state for single transaction form
  const [ticker, setTicker] = useState('');
  const [type, setType] = useState<TransactionType>('COMPRA');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [quantity, setQuantity] = useState<number | ''>('');
  const [price, setPrice] = useState<number | ''>('');
  const [charges, setCharges] = useState<number | ''>('0');

  // Trigger when parent supplies prefilled values
  useEffect(() => {
    if (prefilledTx) {
      setTicker(prefilledTx.ticker);
      setType(prefilledTx.type);
      setPrice(prefilledTx.price);
      if (onClearPrefilled) {
        onClearPrefilled();
      }
    }
  }, [prefilledTx, onClearPrefilled]);

  // AI Import Wizard State
  const [showImporter, setShowImporter] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResult, setAiResult] = useState<Transaction[] | null>(null);
  const [aiError, setAiError] = useState('');

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState('');
  const [editTicker, setEditTicker] = useState('');
  const [editType, setEditType] = useState<TransactionType>('COMPRA');
  const [editDate, setEditDate] = useState('');
  const [editQuantity, setEditQuantity] = useState<number | ''>('');
  const [editPrice, setEditPrice] = useState<number | ''>('');
  const [editCharges, setEditCharges] = useState<number | ''>('0');

  const handleStartEdit = (tx: Transaction) => {
    setEditId(tx.id);
    setEditTicker(tx.ticker);
    setEditType(tx.type);
    setEditDate(tx.date);
    setEditQuantity(tx.quantity);
    setEditPrice(tx.price);
    setEditCharges(tx.charges);
    setShowEditModal(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTicker || !editQuantity || !editPrice) return;

    const tk = editTicker.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
    const qty = Number(editQuantity);
    const prc = Number(editPrice);
    const chg = Number(editCharges) || 0;

    const total = editType === 'COMPRA' 
      ? (qty * prc) + chg 
      : (qty * prc) - chg;

    const updatedTx: Transaction = {
      id: editId,
      ticker: tk,
      type: editType,
      date: editDate,
      quantity: qty,
      price: prc,
      charges: chg,
      total: Number(total.toFixed(2))
    };

    onEditTransaction(updatedTx);
    setShowEditModal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !quantity || !price) return;

    const tk = ticker.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
    const qty = Number(quantity);
    const prc = Number(price);
    const chg = Number(charges) || 0;
    
    // In Brazilian standards, Buying total = (Qty * Price) + charges. Selling total = (Qty * Price) - charges.
    // Total is net cash impact.
    const total = type === 'COMPRA' 
      ? (qty * prc) + chg 
      : (qty * prc) - chg;

    const newTx: Transaction = {
      id: `manual-tx-${Date.now()}`,
      ticker: tk,
      type,
      date,
      quantity: qty,
      price: prc,
      charges: chg,
      total: Number(total.toFixed(2))
    };

    onAddTransaction(newTx);
    
    // Reset form
    setTicker('');
    setQuantity('');
    setPrice('');
    setCharges('0');
  };

  const processTextWithGemini = async () => {
    if (!pastedText.trim()) {
      setAiError('Por favor, cole um texto do extrato ou nota de corretagem da B3.');
      return;
    }

    setIsProcessing(true);
    setAiError('');
    setAiResult(null);

    try {
      const response = await fetch('/api/b3/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textContent: pastedText }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Não foi possível processar o texto.');
      }

      if (data.transactions && data.transactions.length > 0) {
        setAiResult(data.transactions);
      } else {
        setAiError('A IA não conseguiu identificar nenhuma operação de ações no texto fornecido. Tente copiar e colar de outra parte de suas movimentações.');
      }
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Erro ao conectar-se ao servidor de Inteligência Artificial.');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmAiImport = () => {
    if (!aiResult || aiResult.length === 0) return;
    onAddMultipleTransactions(aiResult);
    setAiResult(null);
    setPastedText('');
    setShowImporter(false);
  };

  return (
    <div id="transactions-view" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Transaction Control Panels */}
      <div id="left-actions" className="lg:col-span-4 space-y-6">
        
        {/* Quick Add Form */}
        <div id="form-card" className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs">
          <h4 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <Plus size={16} className="text-slate-800" />
            Cadastrar Operação Manual
          </h4>
          
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium text-slate-600">
            <div>
              <label className="block mb-1 font-semibold">CÓDIGO DO ATIVO (B3)</label>
              <input
                type="text"
                placeholder="Ex: PETR4, VALE3, ITUB4"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-indigo-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 font-semibold">TIPO</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as TransactionType)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-800 font-semibold focus:outline-indigo-500"
                >
                  <option value="COMPRA">COMPRA (C)</option>
                  <option value="VENDA">VENDA (V)</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 font-semibold">DATA OPERAÇÃO</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-800 font-mono focus:outline-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block mb-1 font-semibold">QTD</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold">PREÇO UNIT.</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="R$"
                  value={price}
                  onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold">TAXAS B3</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="R$"
                  value={charges}
                  onChange={(e) => setCharges(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-50">
              <button
                type="submit"
                className="w-full bg-slate-900 text-white p-2.5 rounded-lg hover:bg-slate-800 font-semibold cursor-pointer text-center duration-150 transition-all flex items-center justify-center gap-1.5"
              >
                Adicionar Operação
              </button>
            </div>
          </form>
        </div>

        {/* AI Portal integration trigger card */}
        <div id="ai-wizard-trigger" className="p-5 bg-gradient-to-br from-indigo-500 to-slate-900 text-white rounded-xl shadow-xs space-y-4">
          <div className="flex items-start justify-between">
            <span className="p-1 px-2.5 bg-white/20 text-xs font-bold rounded-lg uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={11} />
              Integração B3 via IA
            </span>
            <Import size={20} className="opacity-80" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Importador de Extratos da B3</h4>
            <p className="text-[11px] text-indigo-100 mt-1 leading-normal">
              Copie as tabelas ou extratos de movimentações direto da sua "Área do Investidor" da B3 ou PDFs de corretora e deixe nossa IA ler e cadastrar tudo de uma vez sem planilhas!
            </p>
          </div>
          <button
            onClick={() => setShowImporter(true)}
            className="w-full px-3 py-2 bg-white text-indigo-950 rounded-lg font-bold hover:bg-indigo-50 cursor-pointer text-xs flex items-center justify-center gap-1.5 duration-100 transition-all"
          >
            <Wand2 size={14} />
            Importador Inteligente
          </button>
        </div>
      </div>

      {/* Primary transactions ledger */}
      <div id="ledger-panel" className="lg:col-span-8 bg-white border border-slate-100 rounded-xl p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-4">
            <div>
              <h3 className="font-semibold text-slate-800 text-md">Movimentações de Ações</h3>
              <p className="text-xs text-slate-400">Total cadastrado no livro de registros: <span className="font-bold text-slate-700 font-mono">{transactions.length} operações</span></p>
            </div>
            {transactions.length > 0 && (
              <button
                onClick={() => setShowConfirmClear(true)}
                className="text-xs border border-rose-100 text-rose-500 hover:bg-rose-50 rounded-lg p-1.5 px-3 font-semibold duration-100 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={14} />
                Limpar Carteira
              </button>
            )}
          </div>

          {transactions.length === 0 ? (
            <div className="py-24 text-center space-y-3">
              <p className="text-sm text-slate-400">Nenhum registro de compra ou venda encontrado.</p>
              <p className="text-xs text-slate-400">Insira manualmente do lado esquerdo ou utilize o importador inteligente B3.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[480px]">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-4">Data</th>
                    <th className="py-2.5 px-4 font-mono">Ativo</th>
                    <th className="py-2.5 px-4">Operação</th>
                    <th className="py-2.5 px-4 text-right">Qtd</th>
                    <th className="py-2.5 px-4 text-right">Preço Unit.</th>
                    <th className="py-2.5 px-4 text-right">Taxas</th>
                    <th className="py-2.5 px-4 text-right">Financeiro (Total)</th>
                    <th className="py-2.5 px-4">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700 font-sans">
                  {[...transactions]
                    .sort((a, b) => b.date.localeCompare(a.date)) // Sort descending by default
                    .map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{formatDate(tx.date)}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{tx.ticker}</td>
                        <td className="py-3 px-4">
                          <span className={`p-1 px-2 text-[10px] rounded-lg font-bold ${tx.type === 'COMPRA' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">{tx.quantity}</td>
                        <td className="py-3 px-4 text-right font-mono">{formatCurrency(tx.price)}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">{formatCurrency(tx.charges)}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-900 font-bold">{formatCurrency(tx.total)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleStartEdit(tx)}
                              className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg duration-100 transition-all cursor-pointer"
                              title="Editar movimentação"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => onDeleteTransaction(tx.id)}
                              className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg duration-100 transition-all cursor-pointer"
                              title="Remover movimentação"
                            >
                              <Trash2 size={13} />
                            </button>
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

      {/* AI Importer Modal */}
      {showImporter && (
        <div id="importer-modal-overlay" className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4">
          <div id="importer-modal-box" className="bg-white rounded-xl max-w-2xl w-full border border-slate-100 flex flex-col justify-between max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1 px-2.5 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={11} />
                  IA B3 Extractor
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Cadastrar Lote via B3 Copy-Paste</h3>
              </div>
              <button 
                onClick={() => { setShowImporter(false); setAiResult(null); setPastedText(''); }} 
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                Fechar
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 overflow-y-auto space-y-4">
              
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs flex items-start gap-2 text-slate-500">
                <Info size={16} className="text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Como usar esta integração assistida por IA:</span>
                  1. Acesse seu portal ou aplicativo da B3 (ou o PDF de extrato anual/mensal da sua corretora).<br/>
                  2. Copie os dados das movimentações (pode selecionar a tabela com o mouse e apertar Ctrl+C).<br/>
                  3. Cole no campo abaixo para que o modelo entenda as colunas e datas automaticamente.
                </div>
              </div>

              {!aiResult ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
                      <ClipboardPaste size={14} />
                      ÁREA DE COLAGEM (TEXTO OU HISTÓRICO B3)
                    </label>
                    <textarea
                      rows={8}
                      placeholder="Cole o extrato aqui... Exemplo:&#10;02/06/2025 Compra PETR4 Qtd: 100 Preço: 35,50&#10;ou tabelas copiadas diretamente da B3 com cabeçalhos de Movimentação de Ativos."
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-indigo-500 placeholder-slate-400"
                    />
                  </div>

                  {aiError && (
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-lg text-xs font-medium border border-rose-100">
                      {aiError}
                    </div>
                  )}

                  <button
                    onClick={processTextWithGemini}
                    disabled={isProcessing}
                    className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-semibold text-xs hover:bg-slate-800 disabled:bg-slate-300 duration-100 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-slate-500" />
                        A Inteligência Artificial está decifrando os dados da B3...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} className="text-yellow-400" />
                        Processar Extrato com IA
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="font-bold text-xs text-slate-700 flex items-center gap-1 text-emerald-600">
                    <Sparkles size={14} />
                    Extração Concluída! Confirmar Operações Encontradas:
                  </div>

                  <div className="border border-slate-100 rounded-lg overflow-x-auto max-h-60 bg-slate-50">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-100 text-slate-500 font-bold">
                        <tr>
                          <th className="py-2 px-3">Data</th>
                          <th className="py-2 px-3">Ativo</th>
                          <th className="py-2 px-3">Tipo</th>
                          <th className="py-2 px-3 text-right">Qtd</th>
                          <th className="py-2 px-3 text-right">Preço Unit.</th>
                          <th className="py-2 px-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600 font-sans">
                        {aiResult.map((tx, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-mono">{formatDate(tx.date)}</td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-800">{tx.ticker}</td>
                            <td className="py-2 px-3">
                              <span className={`p-0.5 px-1.5 text-[9px] rounded-lg font-bold ${tx.type === 'COMPRA' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold">{tx.quantity}</td>
                            <td className="py-2 px-3 text-right font-mono">{formatCurrency(tx.price)}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">{formatCurrency(tx.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setAiResult(null)}
                      className="py-2 border border-slate-200 text-slate-600 font-semibold text-xs rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      Refazer Leitura
                    </button>
                    <button
                      onClick={confirmAiImport}
                      className="py-2 bg-indigo-600 text-white font-semibold text-xs rounded-lg hover:bg-indigo-500 cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Sparkles size={12} />
                      Importar {aiResult.length} Transações
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer hints */}
            <div className="bg-slate-50/50 p-4 border-t border-slate-100/50 rounded-b-xl text-[10px] text-slate-400 text-center">
              A transcrição é feita localmente utilizando IA segura no back-end. Seus dados de CPF ou senhas não são registrados.
            </div>

          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Clear Portfolio */}
      {showConfirmClear && (
        <div id="clear-confirm-modal-overlay" className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4">
          <div id="clear-confirm-modal" className="bg-white rounded-xl max-w-sm w-full border border-slate-100 p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2 bg-rose-50 rounded-lg">
                <Trash2 size={20} />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Limpar Carteira de Ações?</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              Tem certeza que deseja excluir <strong>todas</strong> as compras, vendas e histórico de dividendos cadastrados de forma permanente? Esta operação não poderá ser desfeita.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onClearAll();
                  setShowConfirmClear(false);
                }}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-500 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                Excluir Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {showEditModal && (
        <div id="edit-tx-modal-overlay" className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4">
          <div id="edit-tx-modal" className="bg-white rounded-xl max-w-md w-full border border-slate-100 p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-slate-900 border-b border-slate-100 pb-3">
              <div className="p-2 bg-slate-50 rounded-lg">
                <Pencil size={18} className="text-slate-700" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Editar Operação</h3>
                <p className="text-[10px] text-slate-400">Modifique os dados da transação registrada</p>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-medium text-slate-600">
              <div>
                <label className="block mb-1 font-semibold">CÓDIGO DO ATIVO (B3)</label>
                <input
                  type="text"
                  placeholder="Ex: PETR4, VALE3"
                  value={editTicker}
                  onChange={(e) => setEditTicker(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-indigo-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold">TIPO</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as TransactionType)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-indigo-500"
                  >
                    <option value="COMPRA">COMPRA (C)</option>
                    <option value="VENDA">VENDA (V)</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-semibold">DATA OPERAÇÃO</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block mb-1 font-semibold">QTD</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">PREÇO UNIT.</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="R$"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">TAXAS B3</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="R$"
                    value={editCharges}
                    onChange={(e) => setEditCharges(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg flex items-center justify-between text-xs border border-slate-100">
                <span className="text-slate-500 font-medium">Financeiro Estimado (Total):</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {formatCurrency(
                    Number(
                      (
                        (Number(editQuantity) || 0) * (Number(editPrice) || 0) +
                        (editType === 'COMPRA' ? (Number(editCharges) || 0) : -(Number(editCharges) || 0))
                      ).toFixed(2)
                    )
                  )}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
