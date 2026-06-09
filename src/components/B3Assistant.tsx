import React, { useState, useRef, useEffect } from 'react';
import { StockPosition, Provento } from '../types';
import { Sparkles, Send, Trash2, HelpCircle } from 'lucide-react';

interface B3AssistantProps {
  positions: StockPosition[];
  proventos: Provento[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

const PRESET_QUESTIONS = [
  "Como declaro minhas ações no imposto de renda?",
  "Qual a regra de isenção de R$ 20.000 para ações?",
  "O que entra em Rendimentos Sujeitos de Tributação Exclusiva?",
  "Como é calculado meu preço médio do portfólio?"
];

export default function B3Assistant({ positions, proventos }: B3AssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: "Olá! Bem-vindo ao **Assistente B3 & IRPF**. Sou um consultor especializado na bolsa do Brasil.\n\nPosso ajudar você a tirar dúvidas sobre o preenchimento da declaração anual de ajuste do imposto de renda, apuração mensal de DARF, regras sobre dividendos, JCP ou até ajudar a simular o cálculo do preço médio de suas ações.\n\nComo posso ajudar você hoje?"
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/b3/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPositions: positions,
          proventos,
          message: textToSend,
          history: messages.slice(-10) // Send recent message history rounds
        })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Erro ao obter resposta da inteligência artificial.');
      }

      setMessages(prev => [...prev, { role: 'assistant', text: data.answer }]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          text: `Hum, tive um contratempo de conexão: \n\n**"${err.message || 'Erro inesperado'}"**.\n\nVerifique se sua chave GEMINI_API_KEY está configurada no painel de Secrets ou tente relançar a pergunta.` 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        text: "Histórico limpo! Com o que posso ajudar você agora?"
      }
    ]);
  };

  // Convert simple markdown-like elements in messages (*bold*, \n)
  const renderMessageText = (text: string) => {
    // Escape standard characters, format line breaks, handle bold marks **bold**
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Very simple bold parser
      const parts = line.split(/\*\*([^*]+)\*\*/g);
      const renderedLine = parts.map((part, pIdx) => {
        if (pIdx % 2 === 1) {
          return <strong key={pIdx} className="font-bold text-slate-900">{part}</strong>;
        }
        return part;
      });
      return (
        <span key={idx} className="block min-h-[1rem]">
          {renderedLine}
        </span>
      );
    });
  };

  return (
    <div id="ai-assistant-view" className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[600px]">
      
      {/* Sidebar Suggestions Column */}
      <div id="ai-sidebar" className="lg:col-span-4 bg-white border border-slate-100 rounded-xl p-5 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Sparkles size={18} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Bússola Inteligente</h4>
              <p className="text-[10px] text-slate-400">Dúvidas rápidas com IA</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Selecione uma das perguntas frequentes abaixo ou digite sua dúvida específica no chat ao lado. O assistente analisará seu portfólio cadastrado para dar respostas personalizadas!
          </p>

          <div id="ai-suggestion-pills" className="space-y-2.5 pt-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Sugetões de Perguntas:</span>
            {PRESET_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                disabled={isLoading}
                className="w-full text-left p-3 text-[11px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl duration-100 transition-all flex items-start gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                <HelpCircle size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                <span>{q}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={clearChat}
          className="w-full mt-6 py-2 border border-slate-100 text-slate-400 hover:text-rose-500 hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 duration-100 transition-all cursor-pointer"
        >
          <Trash2 size={13} />
          Limpar Conversa
        </button>
      </div>

      {/* Main Chat Conversation Container */}
      <div id="chat-container font-sans" className="lg:col-span-8 bg-white border border-slate-100 rounded-xl flex flex-col overflow-hidden h-full">
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-slate-700">Consultor B3 & Receita Federal IRPF</span>
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono bg-white px-2 py-1 rounded border border-slate-100">Gemini 3.5 Flash</span>
        </div>

        {/* Conversation Bubbles */}
        <div id="messages-log" className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((m, index) => (
            <div
              key={index}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs select-text shadow-xs ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-slate-55 border border-slate-100 text-slate-700 rounded-bl-none leading-relaxed'
                }`}
              >
                <div className="space-y-1">
                  {renderMessageText(m.text)}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-bl-none p-4 max-w-[85%] text-xs shadow-xs text-slate-500 flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                </div>
                <span>Pensando na legislação brasileira...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-100/80 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputText);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="Digite sua dúvida sobre ações, JCP ou imposto de renda..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isLoading}
              className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-indigo-500 disabled:bg-slate-100"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-3 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 disabled:bg-slate-100 disabled:text-slate-300 duration-150 transition-all flex items-center justify-center shrink-0 cursor-pointer"
            >
              <Send size={16} />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
