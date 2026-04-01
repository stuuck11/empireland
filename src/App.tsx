/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ChevronRight, LogOut, Plus, Trash2, Save, BarChart2, Settings, MessageSquare, Edit2, RotateCcw } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Constants & Mocks ---

const MOCK_CONFIG = {
  title: "O melhor empréstimo para você em 20 segundos",
  description: "Por favor, responda as perguntas abaixo para que nossa tecnologia possa escolher o melhor empréstimo para você.",
  questions: [
    { id: 1, text: "Qual o valor do empréstimo que você precisa?", options: ["Até R$ 5.000", "R$ 5.000 a R$ 20.000", "Acima de R$ 20.000"] },
    { id: 2, text: "Qual o seu objetivo com o empréstimo?", options: ["Pagar dívidas", "Investir no negócio", "Reformar a casa", "Outros"] },
    { id: 3, text: "Você possui restrição no nome (negativado)?", options: ["Sim", "Não"] }
  ],
  whatsappNumbers: [
    { id: '1', name: 'Suporte 1', number: '5511999999999', message: 'Olá, gostaria de saber mais sobre o empréstimo.', active: true, clicks: 0 }
  ]
};

const MOCK_STATS = {
  totalClicks: 0,
  whatsappNumbers: MOCK_CONFIG.whatsappNumbers,
  questions: MOCK_CONFIG.questions,
  settings: {
    title: MOCK_CONFIG.title,
    description: MOCK_CONFIG.description
  }
};

// --- Components ---

const Header = () => (
  <header className="bg-empireland-green py-2 px-4 flex justify-center items-center sticky top-0 z-50 shadow-md">
    <Link to="/">
      <img 
        src="https://imgur.com/WQOCEsO.png" 
        alt="EmpireLand Logo" 
        className="h-16 object-contain cursor-pointer"
        referrerPolicy="no-referrer"
      />
    </Link>
  </header>
);

const Footer = () => (
  <footer className="bg-empireland-green text-white py-12 px-6 mt-auto">
    <div className="max-w-4xl mx-auto text-center space-y-6">
      <div className="flex flex-wrap justify-center gap-4 text-sm font-medium">
        <Link to="/termos" className="hover:underline">Termos de uso</Link>
        <Link to="/privacidade" className="hover:underline">Aviso de privacidade</Link>
      </div>
      
      <div className="text-xs opacity-90 space-y-4 leading-relaxed">
        <p className="font-bold">
          EMPIRE CONSULTORIA E ASSESSORIA EMPRESARIAL LTDA - CNPJ: 23.507.279/0001-08 - Rua Professor Filadelfo Azevedo, 521, Vila Nova Conceição, São Paulo - SP - Informações de Contato: contato@empireland.com.br
        </p>
        
        <p>
          A EMPIRELAND oferece conteúdo gratuito sobre cartões de crédito, bancos digitais, empréstimos e serviços financeiros de terceiros. Não somos uma instituição financeira, não realizamos a concessão de crédito diretamente e não cobramos qualquer valor pelo acesso aos nossos serviços. As recomendações geradas pela nossa tecnologia são apenas informativas e não constituem aconselhamento financeiro ou jurídico; consulte sempre profissionais qualificados. Os termos finais do empréstimo dependem exclusivamente da instituição emissora. O prazo mínimo de pagamento é de 12 meses e o máximo de 60 meses. A EMPIRELAND não compactua com práticas de empréstimos abusivos e não oferece modalidades com prazos de pagamento de 60 dias ou menos. Exemplo representativo: Um empréstimo de R$ 10.000,00 com pagamento em 24 meses terá parcelas de aproximadamente R$ 550,00, com uma taxa de juros de 2,5% ao mês (34,49% ao ano). O custo total a pagar ao final do período será de R$ 13.200,00.
        </p>
      </div>
    </div>
  </footer>
);

// --- Pages ---

const QuizPage = () => {
  const [config, setConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [formData, setFormData] = useState({ name: '', email: '', agreed: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchConfig = () => {
    setIsLoading(true);
    setError(null);
    fetch('/api/config')
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao carregar configurações');
        return data;
      })
      .then(data => {
        setConfig(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Erro ao carregar config, usando mock:', err);
        // Fallback to mock data if API fails
        setConfig(MOCK_CONFIG);
        setIsLoading(false);
        // We don't set error here to allow the app to work with mock data
      });
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen space-y-4 p-4 text-center">
        <p className="text-red-500 font-medium">{error}</p>
        <button 
          onClick={fetchConfig}
          className="bg-empireland-green text-white px-6 py-2 rounded-full font-bold hover:bg-opacity-90 transition-all"
        >
          TENTAR NOVAMENTE
        </button>
      </div>
    );
  }

  if (isLoading) return <div className="flex justify-center items-center h-screen font-bold text-empireland-green">Carregando Quiz...</div>;

  const questions = config?.questions || [];
  const totalQuestions = (questions || []).length;
  const isLastStep = currentStep === totalQuestions;

  const handleOptionClick = (questionId: number, option: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
    setTimeout(() => {
      setCurrentStep(prev => prev + 1);
    }, 300);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const progress = totalQuestions > 0 ? ((currentStep + 1) / totalQuestions) * 100 : 0;

  const canSubmit = formData.name.trim() !== '' && formData.email.trim() !== '' && formData.agreed;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          quiz_responses: answers
        })
      });
    } catch (err) {
      console.error('Erro ao salvar lead:', err);
    }
    // Redirect to the lead distribution endpoint
    window.location.href = '/api/redirect-lead';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow max-w-2xl mx-auto w-full px-4 py-12">
        <AnimatePresence mode="wait">
          {!isLastStep ? (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 text-center"
            >
              <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-bold text-empireland-green">
                  {config?.title || MOCK_CONFIG.title}
                </h1>
                <p className="text-gray-600">
                  {config?.description || MOCK_CONFIG.description}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="h-3 w-full bg-empireland-yellow rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-empireland-green"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="text-sm font-medium text-gray-500">
                  {currentStep + 1} - {totalQuestions}
                </div>
              </div>

              {/* Question */}
              <div className="space-y-6 relative">
                {currentStep > 0 && (
                  <button 
                    onClick={handleBack}
                    className="absolute -top-12 left-0 text-gray-400 hover:text-empireland-green flex items-center gap-1 text-sm font-medium transition-colors"
                  >
                    <ChevronRight className="rotate-180" size={16} /> Voltar
                  </button>
                )}
                <h2 className="text-xl font-bold text-empireland-green">
                  {questions[currentStep]?.text || "Pergunta não encontrada"}
                </h2>
                
                <div className="grid grid-cols-2 gap-4">
                  {(questions[currentStep]?.options || []).map((option: string, idx: number) => (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleOptionClick(questions[currentStep]?.id, option)}
                      className={cn(
                        "w-full py-4 px-6 text-center border-2 border-gray-100 rounded-xl transition-all duration-300 shadow-sm",
                        "bg-white text-gray-700 hover:bg-empireland-green hover:text-white hover:border-empireland-green font-bold"
                      )}
                    >
                      {option}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8 text-center"
            >
              <div className="flex justify-center">
                <img 
                  src="https://imgur.com/O1bSYke.png" 
                  alt="Success" 
                  className="h-32 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-medium text-gray-800">
                  Falta muito <span className="font-bold text-empireland-green">pouco</span>
                </h1>
                <p className="text-gray-600">
                  Insira suas informações abaixo e em um instante você receberá o <span className="font-bold text-empireland-green">empréstimo mais adequado</span> de acordo com seu perfil:
                </p>
              </div>

              <div className="space-y-4 max-w-md mx-auto">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Seu nome"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-4 border-2 border-empireland-orange rounded-xl focus:outline-none focus:ring-2 focus:ring-empireland-orange/20"
                  />
                </div>
                <div className="relative">
                  <input 
                    type="email" 
                    placeholder="Seu e-mail"
                    value={formData.email}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full p-4 border-2 border-empireland-orange rounded-xl focus:outline-none focus:ring-2 focus:ring-empireland-orange/20"
                  />
                </div>

                <div className="flex items-start gap-3 text-left">
                  <input 
                    type="checkbox" 
                    id="terms"
                    checked={formData.agreed}
                    onChange={e => setFormData(prev => ({ ...prev, agreed: e.target.checked }))}
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-empireland-green focus:ring-empireland-green"
                  />
                  <label htmlFor="terms" className="text-xs text-gray-500 leading-tight">
                    Declaro ser maior de 18 anos, concordo com os <Link to="/termos" className="underline font-medium">termos de serviço</Link> e aceito receber comunicações do EmpireLand, que, a qualquer momento, podem ser canceladas.
                  </label>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  className={cn(
                    "w-full py-4 px-8 rounded-full font-bold text-lg transition-all duration-300 shadow-lg",
                    canSubmit && !isSubmitting 
                      ? "bg-empireland-green text-white hover:bg-opacity-90 transform hover:-translate-y-1" 
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  )}
                >
                  {isSubmitting ? "PROCESSANDO..." : "VER MEU EMPRÉSTIMO"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
};

const AdminPage = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'questions' | 'whatsapp' | 'general'>('stats');
  const [error, setError] = useState('');
  const [editingNumber, setEditingNumber] = useState<any>(null);

  const fetchStats = () => {
    setIsLoading(true);
    setError('');
    fetch('/api/admin/stats')
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao carregar estatísticas');
        return data;
      })
      .then(data => {
        setStats(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Erro ao buscar stats, usando mock:', err);
        setStats(MOCK_STATS);
        setIsLoading(false);
      });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
      setIsLoggedIn(true);
      fetchStats();
    } else {
      setError(data.message);
    }
  };

  const handleSave = async () => {
    if (!stats) return;
    try {
      const res = await fetch('/api/admin/update-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: stats.questions || [],
          whatsappNumbers: stats.whatsappNumbers || [],
          settings: stats.settings || {}
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Configurações salvas com sucesso!');
        fetchStats();
      } else {
        const errorMessage = data.hint ? `${data.error}: ${data.hint}` : data.error || 'Erro ao salvar';
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error('Erro ao salvar:', err);
      alert(err.message);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md space-y-6"
        >
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-empireland-green">Admin EmpireLand</h1>
            <p className="text-gray-500">Acesse o painel de controle</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="text" 
              placeholder="Usuário"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-empireland-green outline-none"
            />
            <input 
              type="password" 
              placeholder="Senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-empireland-green outline-none"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button className="w-full bg-empireland-green text-white p-3 rounded-lg font-bold hover:bg-opacity-90 transition-all">
              ENTRAR
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (error && !isLoggedIn) {
    // This error is handled inside the login form
  }

  if (isLoading && isLoggedIn) return <div className="flex justify-center items-center h-screen font-bold text-empireland-green">Carregando Painel...</div>;

  if (!stats && !error && isLoggedIn) return <div className="flex justify-center items-center h-screen">Carregando...</div>;

  if (error && isLoggedIn) {
    return (
      <div className="flex flex-col justify-center items-center h-screen space-y-4 p-4 text-center">
        <p className="text-red-500 font-medium">{error}</p>
        <button 
          onClick={fetchStats}
          className="bg-empireland-green text-white px-6 py-2 rounded-full font-bold hover:bg-opacity-90 transition-all"
        >
          TENTAR NOVAMENTE
        </button>
        <button 
          onClick={() => setIsLoggedIn(false)}
          className="text-gray-500 hover:underline"
        >
          Voltar para Login
        </button>
      </div>
    );
  }

  if (!stats) return <div className="flex justify-center items-center h-screen">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-empireland-green text-white flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="text-xl font-bold">EmpireLand Admin</div>
          <div className="text-xs opacity-50 font-mono mt-1">v1.0.9</div>
        </div>
        <nav className="flex-grow p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('stats')}
            className={cn("w-full flex items-center gap-3 p-3 rounded-lg transition-all", activeTab === 'stats' ? "bg-white/20" : "hover:bg-white/10")}
          >
            <BarChart2 size={20} /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('questions')}
            className={cn("w-full flex items-center gap-3 p-3 rounded-lg transition-all", activeTab === 'questions' ? "bg-white/20" : "hover:bg-white/10")}
          >
            <Settings size={20} /> Perguntas
          </button>
          <button 
            onClick={() => setActiveTab('whatsapp')}
            className={cn("w-full flex items-center gap-3 p-3 rounded-lg transition-all", activeTab === 'whatsapp' ? "bg-white/20" : "hover:bg-white/10")}
          >
            <MessageSquare size={20} /> WhatsApp
          </button>
          <button 
            onClick={() => setActiveTab('general')}
            className={cn("w-full flex items-center gap-3 p-3 rounded-lg transition-all", activeTab === 'general' ? "bg-white/20" : "hover:bg-white/10")}
          >
            <Settings size={20} /> Configurações
          </button>
        </nav>
        <button 
          onClick={() => setIsLoggedIn(false)}
          className="p-6 flex items-center gap-3 hover:bg-red-600 transition-all border-t border-white/10"
        >
          <LogOut size={20} /> Sair
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 capitalize">{activeTab}</h2>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 bg-empireland-green text-white px-6 py-2 rounded-lg font-bold hover:shadow-lg transition-all"
          >
            <Save size={20} /> SALVAR ALTERAÇÕES
          </button>
        </div>

        {activeTab === 'stats' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-gray-500 text-sm">Total de Cliques Global</p>
                <p className="text-3xl font-bold text-empireland-green">{stats.totalClicks}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-gray-500 text-sm">Números Ativos</p>
                <p className="text-3xl font-bold text-empireland-green">
                  {(stats.whatsappNumbers || []).filter((n:any) => n.active).length}
                </p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-gray-500 text-sm">Total de Perguntas</p>
                <p className="text-3xl font-bold text-empireland-green">
                  {(stats?.questions || []).length}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 font-bold">Cliques por Operador</div>
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-sm">
                  <tr>
                    <th className="p-4">Nome</th>
                    <th className="p-4">Número</th>
                    <th className="p-4">Mensagem</th>
                    <th className="p-4">Cliques</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.whatsappNumbers || []).map((n: any, idx: number) => (
                    <tr key={n.id || idx} className="border-t border-gray-50">
                      <td className="p-4 font-bold">{n.name || "Sem Nome"}</td>
                      <td className="p-4 font-mono">{n.number}</td>
                      <td className="p-4 text-sm text-gray-600 truncate max-w-xs">{n.message}</td>
                      <td className="p-4 font-bold">{n.clicks}</td>
                      <td className="p-4">
                        <span className={cn("px-2 py-1 rounded text-xs font-bold", n.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                          {n.active ? "ATIVO" : "INATIVO"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setEditingNumber({ ...n, index: (stats.whatsappNumbers || []).findIndex((wn: any) => wn.id === n.id) })}
                            className="text-empireland-green hover:text-opacity-80 p-1"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm('Deseja resetar os cliques deste número?')) {
                                const newNs = [...(stats.whatsappNumbers || [])];
                                const nIdx = newNs.findIndex((wn: any) => wn.id === n.id);
                                if (nIdx !== -1) {
                                  newNs[nIdx].clicks = 0;
                                  setStats({ ...stats, whatsappNumbers: newNs });
                                }
                              }
                            }}
                            className="text-gray-400 hover:text-empireland-green p-1"
                            title="Resetar Cliques"
                          >
                            <RotateCcw size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="space-y-6">
            {(stats?.questions || []).map((q: any, qIdx: number) => (
              <div key={q.id || qIdx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-grow space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Pergunta {qIdx + 1}</label>
                    <input 
                      type="text" 
                      value={q.text}
                      onChange={e => {
                        const newQs = [...(stats.questions || [])];
                        newQs[qIdx].text = e.target.value;
                        setStats({ ...stats, questions: newQs });
                      }}
                      className="w-full p-2 border-b font-bold text-lg focus:border-empireland-green outline-none"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      const newQs = (stats.questions || []).filter((_:any, i:number) => i !== qIdx);
                      setStats({ ...stats, questions: newQs });
                    }}
                    className="text-red-400 hover:text-red-600 p-2"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Opções</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(q.options || []).map((opt: string, oIdx: number) => (
                      <div key={oIdx} className="flex gap-2">
                        <input 
                          type="text" 
                          value={opt}
                          onChange={e => {
                            const newQs = [...(stats.questions || [])];
                            newQs[qIdx].options[oIdx] = e.target.value;
                            setStats({ ...stats, questions: newQs });
                          }}
                          className="flex-grow p-2 bg-gray-50 rounded border focus:border-empireland-green outline-none text-sm"
                        />
                        <button 
                          onClick={() => {
                            const newQs = [...(stats.questions || [])];
                            newQs[qIdx].options = (newQs[qIdx].options || []).filter((_:any, i:number) => i !== oIdx);
                            setStats({ ...stats, questions: newQs });
                          }}
                          className="text-gray-300 hover:text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        const newQs = [...(stats.questions || [])];
                        if (!newQs[qIdx].options) newQs[qIdx].options = [];
                        newQs[qIdx].options.push("Nova opção");
                        setStats({ ...stats, questions: newQs });
                      }}
                      className="flex items-center justify-center gap-2 p-2 border-2 border-dashed border-gray-200 rounded text-gray-400 hover:border-empireland-green hover:text-empireland-green transition-all text-sm"
                    >
                      <Plus size={16} /> Adicionar Opção
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <button 
              onClick={() => {
                const newQs = [...(stats.questions || []), { id: Date.now(), text: "Nova Pergunta?", options: ["Opção 1"] }];
                setStats({ ...stats, questions: newQs });
              }}
              className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 hover:border-empireland-green hover:text-empireland-green transition-all font-bold flex items-center justify-center gap-2"
            >
              <Plus size={24} /> ADICIONAR NOVA PERGUNTA
            </button>
          </div>
        )}

        {activeTab === 'whatsapp' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-700">Gerenciar Operadores</h3>
              <button 
                onClick={() => {
                  const newNumber = { id: Date.now(), name: "Novo Operador", number: "55", message: "Olá!", active: true, clicks: 0 };
                  const newNs = [...(stats.whatsappNumbers || []), newNumber];
                  setStats({ ...stats, whatsappNumbers: newNs });
                  setEditingNumber({ ...newNumber, index: newNs.length > 0 ? newNs.length - 1 : 0 });
                }}
                className="flex items-center gap-2 bg-empireland-green text-white px-4 py-2 rounded-lg font-bold hover:bg-opacity-90 transition-all text-sm"
              >
                <Plus size={18} /> NOVO OPERADOR
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(stats?.whatsappNumbers || []).map((n: any, idx: number) => (
                <div key={n.id || idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4 relative group">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{n.name || "Sem Nome"}</p>
                        <p className="text-xs text-gray-400 font-mono">{n.number}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setEditingNumber({ ...n, index: idx })}
                        className="p-2 text-gray-400 hover:text-empireland-green transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          const newNs = (stats.whatsappNumbers || []).filter((_:any, i:number) => i !== idx);
                          setStats({ ...stats, whatsappNumbers: newNs });
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                    <div className="text-xs text-gray-400">
                      <span className="font-bold text-gray-600">{n.clicks}</span> cliques
                    </div>
                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold", n.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                      {n.active ? "ATIVO" : "INATIVO"}
                    </span>
                    <button 
                      onClick={() => {
                        const newNs = [...(stats.whatsappNumbers || [])];
                        newNs[idx].active = !newNs[idx].active;
                        setStats({ ...stats, whatsappNumbers: newNs });
                      }}
                      className="text-xs font-bold text-empireland-green hover:underline"
                    >
                      {n.active ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'general' && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Título do Quiz</label>
                <input 
                  type="text" 
                  value={stats?.settings?.title || ''}
                  onChange={e => setStats({ ...stats, settings: { ...stats.settings, title: e.target.value } })}
                  className="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-empireland-green outline-none font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Descrição/Subtítulo</label>
                <textarea 
                  value={stats?.settings?.description || ''}
                  onChange={e => setStats({ ...stats, settings: { ...stats.settings, description: e.target.value } })}
                  rows={4}
                  className="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-empireland-green outline-none text-gray-600"
                />
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        <AnimatePresence>
          {editingNumber && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <h3 className="text-xl font-bold text-gray-800">Editar Operador</h3>
                  <button 
                    onClick={() => setEditingNumber(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Plus className="rotate-45" size={24} />
                  </button>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">Nome do Operador</label>
                      <input 
                        type="text" 
                        value={editingNumber.name}
                        onChange={e => setEditingNumber({ ...editingNumber, name: e.target.value })}
                        className="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-empireland-green outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">Número (DDI+DDD+Número)</label>
                      <input 
                        type="text" 
                        value={editingNumber.number}
                        onChange={e => setEditingNumber({ ...editingNumber, number: e.target.value })}
                        className="w-full p-3 bg-gray-50 border rounded-xl font-mono focus:ring-2 focus:ring-empireland-green outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Mensagem Pré-definida</label>
                    <textarea 
                      value={editingNumber.message}
                      onChange={e => setEditingNumber({ ...editingNumber, message: e.target.value })}
                      rows={3}
                      className="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-empireland-green outline-none text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-gray-700">Status do Operador</p>
                      <p className="text-xs text-gray-400">Ative ou desative este número no Round Robin</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={editingNumber.active}
                        onChange={e => setEditingNumber({ ...editingNumber, active: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-empireland-green/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-empireland-green"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-100">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-orange-800">Resetar Cliques</p>
                      <p className="text-xs text-orange-600">Zerar o contador de cliques atual ({editingNumber.clicks})</p>
                    </div>
                    <button 
                      onClick={() => {
                        if (confirm('Deseja resetar os cliques deste número?')) {
                          setEditingNumber({ ...editingNumber, clicks: 0 });
                        }
                      }}
                      className="bg-white text-orange-600 p-2 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors"
                    >
                      <RotateCcw size={20} />
                    </button>
                  </div>
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
                  <button 
                    onClick={() => {
                      const newNs = [...(stats.whatsappNumbers || [])];
                      newNs[editingNumber.index] = {
                        id: editingNumber.id,
                        name: editingNumber.name,
                        number: editingNumber.number,
                        message: editingNumber.message,
                        active: editingNumber.active,
                        clicks: editingNumber.clicks
                      };
                      setStats({ ...stats, whatsappNumbers: newNs });
                      setEditingNumber(null);
                    }}
                    className="flex-grow bg-empireland-green text-white p-3 rounded-xl font-bold hover:bg-opacity-90 transition-all shadow-lg"
                  >
                    CONFIRMAR ALTERAÇÕES
                  </button>
                  <button 
                    onClick={() => setEditingNumber(null)}
                    className="px-6 py-3 bg-white border rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
                  >
                    CANCELAR
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

const TermsPage = () => (
  <div className="min-h-screen flex flex-col">
    <Header />
    <main className="flex-grow max-w-4xl mx-auto w-full px-6 py-12 prose prose-sm text-gray-700">
      <h1 className="text-2xl font-bold text-empireland-green mb-6">Termos e Condições de Uso – EMPIRELAND</h1>
      <p className="font-bold">
        POR FAVOR, LEIA ESTES TERMOS E CONDIÇÕES DE USO COM ATENÇÃO. O USO DESTA PLATAFORMA POR VOCÊ DEMONSTRA A SUA CONCORDÂNCIA INTEGRAL COM ESTES TERMOS.
      </p>
      
      <p>
        A EMPIRELAND (doravante denominada "Plataforma" ou "EmpireLand"), disponível no endereço eletrônico vinculado ao domínio empireland.com.br, é uma ferramenta de tecnologia e consultoria informativa operada pela EMPIRE CONSULTORIA E ASSESSORIA EMPRESARIAL LTDA, sociedade limitada, com sede na Rua Professor Filadelfo Azevedo, 521, Vila Nova Conceição, CEP 04508-011, São Paulo/SP, inscrita no CNPJ sob nº 23.507.279/0001-08.
      </p>

      <p>
        Estes Termos e Condições de Uso regulamentam a relação entre a EmpireLand e o Usuário, aplicando-se conjuntamente com a nossa Política de Privacidade e com a legislação brasileira vigente, em especial a Lei Geral de Proteção de Dados (LGPD).
      </p>

      <h2 className="text-xl font-bold text-empireland-green mt-8">1. A PLATAFORMA EMPIRELAND</h2>
      <p>
        A EmpireLand é uma plataforma online que oferece um "Quiz de Perfil Financeiro" destinado a auxiliar usuários a encontrarem opções de crédito e serviços financeiros adequados ao seu perfil. Através de algoritmos de análise de dados fornecidos voluntariamente, a plataforma direciona o Usuário para canais de atendimento especializado via WhatsApp ou páginas de parceiros.
      </p>
      <p>
        <strong>Importante:</strong> A EmpireLand não é uma instituição financeira. Não realizamos empréstimos diretamente, não garantimos a aprovação de crédito por parte de terceiros e nunca cobramos qualquer taxa dos usuários para a realização do quiz ou indicação de produtos.
      </p>

      <h2 className="text-xl font-bold text-empireland-green mt-8">2. EQUIPAMENTOS E ACESSO</h2>
      <p>
        É de inteira responsabilidade do usuário dispor dos equipamentos (computador, smartphone, tablet) e conexão à internet necessários para navegar na plataforma. O usuário deve garantir que seu ambiente digital seja seguro (uso de antivírus e firewall atualizados) para prevenir riscos eletrônicos.
      </p>

      <h2 className="text-xl font-bold text-empireland-green mt-8">3. ACESSO E USO DOS SERVIÇOS</h2>
      <p>
        Para utilizar o Quiz e o sistema de redirecionamento da EmpireLand, o usuário declara ter, no mínimo, 18 (dezoito) anos de idade. Ao aceitar estes termos, você garante que:
      </p>
      <ul>
        <li>Todas as informações fornecidas (Nome, E-mail, Respostas do Quiz) são verdadeiras e exatas;</li>
        <li>Manterá a veracidade e atualização de seus dados;</li>
        <li>Não utilizará identidades falsas ou informações de terceiros.</li>
      </ul>
      <p>
        Caso a EmpireLand suspeite de fraude ou informações falsas, reserva-se o direito de suspender o acesso do usuário imediatamente, sem prévia notificação.
      </p>

      <h2 className="text-xl font-bold text-empireland-green mt-8">4. COLETA E TRATAMENTO DE DADOS</h2>
      <p>
        Ao clicar em "VER MEU EMPRÉSTIMO" ou interagir com o Quiz, o usuário concorda com a coleta e tratamento dos seguintes dados (conforme a LGPD):
      </p>
      <ul>
        <li>Dados Cadastrais: Nome e E-mail;</li>
        <li>Dados de Perfil: Necessidades de crédito, situação de negativação, renda estimada e outras informações financeiras fornecidas no quiz;</li>
        <li>Dados de Conexão: Endereço IP e comportamento de clique.</li>
      </ul>
      <p>
        Esses dados são utilizados para o funcionamento do sistema de Distribuição de Leads (Round Robin), garantindo que você seja atendido por um consultor disponível, e para fins de marketing e comunicações da EmpireLand.
      </p>

      <h2 className="text-xl font-bold text-empireland-green mt-8">5. RESPONSABILIDADES DA EMPIRELAND</h2>
      <p>
        <strong>Informações:</strong> Envidamos nossos melhores esforços para manter a plataforma atualizada, porém, as condições de crédito e ofertas são de responsabilidade exclusiva das instituições financeiras parceiras.
      </p>
      <p>
        <strong>Disponibilidade:</strong> Não garantimos o funcionamento da plataforma em tempo integral, visto que dependemos de serviços de terceiros (hospedagem, API de WhatsApp).
      </p>
      <p>
        <strong>Segurança:</strong> A EmpireLand não solicita senhas, números de cartão de crédito ou depósitos antecipados por telefone ou WhatsApp. Caso receba abordagens desse tipo em nosso nome, desconsidere e reporte ao nosso canal oficial.
      </p>

      <h2 className="text-xl font-bold text-empireland-green mt-8">6. PROIBIÇÕES AO USUÁRIO</h2>
      <p>
        É terminantemente proibido:
      </p>
      <ul>
        <li>Utilizar a plataforma para fins ilegais ou contrários à moral;</li>
        <li>Tentar burlar o sistema de redirecionamento ou o código-fonte da página;</li>
        <li>Enviar vírus ou scripts maliciosos;</li>
        <li>Utilizar proxies anônimos para mascarar o IP de acesso.</li>
      </ul>

      <h2 className="text-xl font-bold text-empireland-green mt-8">7. PROPRIEDADE INTELECTUAL</h2>
      <p>
        Todo o conteúdo da EmpireLand (textos, logotipos, algoritmo de Round Robin, layouts, código-fonte e imagens) é de propriedade exclusiva da EMPIRE CONSULTORIA E ASSESSORIA EMPRESARIAL LTDA e protegido por leis de direito autoral. A reprodução total ou parcial é rigorosamente proibida.
      </p>

      <h2 className="text-xl font-bold text-empireland-green mt-8">8. INDENIZAÇÃO</h2>
      <p>
        O usuário concorda em isentar de responsabilidade a EmpireLand e seus diretores em caso de demandas judiciais decorrentes do uso indevido da plataforma, violação destes termos ou falhas nos equipamentos do próprio usuário.
      </p>

      <h2 className="text-xl font-bold text-empireland-green mt-8">9. COMUNICAÇÕES</h2>
      <p>
        Ao aceitar estes termos, o usuário autoriza expressamente a EmpireLand a entrar em contato via e-mail, SMS ou WhatsApp, utilizando os dados fornecidos no cadastro, para fins de suporte, ofertas de crédito ou informativos.
      </p>

      <h2 className="text-xl font-bold text-empireland-green mt-8">10. LEGISLAÇÃO E FORO</h2>
      <p>
        Estes Termos são regidos pelas leis da República Federativa do Brasil. Para dirimir quaisquer controvérsias oriundas deste documento, as partes elegem o Foro da Comarca de São Paulo/SP, com renúncia expressa a qualquer outro.
      </p>

      <h2 className="text-xl font-bold text-empireland-green mt-8">11. CANAL DE ATENDIMENTO</h2>
      <p>
        Dúvidas sobre estes Termos de Uso ou sobre o tratamento de seus dados podem ser enviadas para: <a href="mailto:contato@empireland.com.br" className="text-empireland-green hover:underline">contato@empireland.com.br</a>.
      </p>

      <div className="mt-12">
        <Link to="/" className="bg-empireland-green text-white px-8 py-3 rounded-full font-bold hover:bg-opacity-90 transition-all inline-block no-underline">
          Voltar para o Quiz
        </Link>
      </div>
    </main>
    <Footer />
  </div>
);

const PrivacyPage = () => (
  <div className="min-h-screen flex flex-col">
    <Header />
    <main className="flex-grow max-w-4xl mx-auto w-full px-6 py-12 prose prose-sm text-gray-700">
      <h1 className="text-2xl font-bold text-empireland-green mb-6">Política de Privacidade – EMPIRELAND</h1>
      <p>
        A Política de Privacidade da EmpireLand foi criada sob o compromisso da proprietária (EMPIRE CONSULTORIA E ASSESSORIA EMPRESARIAL LTDA) de sempre tratar os dados pessoais dos seus usuários com segurança, privacidade e transparência.
      </p>
      <p>
        Esta Política descreve os dados pessoais que coletamos, como eles são usados, armazenados e compartilhados, bem como os seus direitos em relação a esses dados, em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/18 - LGPD).
      </p>

      <h2 className="text-xl font-bold text-empireland-green mt-8">1. Introdução e Controladora de Dados</h2>
      <p>
        A EmpireLand tem o objetivo de compartilhar informações e propostas comerciais de interesse dos seus Usuários, conectando-os a produtos e serviços financeiros que melhor se adequem à sua realidade.
      </p>
      <p>
        Ao utilizar os nossos serviços, você está ciente de que a controladora dos seus dados pessoais é a EMPIRE CONSULTORIA E ASSESSORIA EMPRESARIAL LTDA, inscrita no CNPJ sob o nº 23.507.279/0001-08, estabelecida na Rua Professor Filadelfo Azevedo, 521, Vila Nova Conceição, São Paulo – SP, CEP: 04508-011.
      </p>

      <h2 className="text-xl font-bold text-empireland-green mt-8">2. Aplicação e Coleta de Dados</h2>
      <p>
        Esta política aplica-se a todos que interagem com o nosso Quiz, website ou canais de atendimento. Coletamos dados quando você:
      </p>
      <ul>
        <li>Preenche o formulário do Quiz ("O melhor empréstimo para você");</li>
        <li>Navega no site empireland.com.br;</li>
        <li>Clica no botão de redirecionamento para o WhatsApp ("VER MEU EMPRÉSTIMO");</li>
        <li>Entra em contato conosco via e-mail ou canais de suporte.</li>
      </ul>

      <h3 className="text-lg font-bold text-empireland-green mt-4">Categorias de dados coletados:</h3>
      <p>
        <strong>Dados fornecidos pelo titular:</strong> Nome completo, e-mail, telefone (WhatsApp) e respostas sobre sua situação financeira (valor desejado, se está negativado, etc.).
      </p>
      <p>
        <strong>Dados de Navegação:</strong> Endereço IP, data e hora de acesso, tipo de navegador, modelo do dispositivo e comportamento de cliques na página.
      </p>
      <p>
        <strong>Dados de Terceiros:</strong> Podemos receber informações de bureaus de crédito ou parceiros para refinar a indicação do produto financeiro.
      </p>

      <h2 className="text-xl font-bold text-empireland-green mt-8">3. Como usamos seus dados (Finalidades)</h2>
      <p>
        A EmpireLand utiliza seus dados para:
      </p>
      <ul>
        <li><strong>Identificação e Autenticação:</strong> Garantir que o lead é real e seguro.</li>
        <li><strong>Análise de Perfil:</strong> Indicar a modalidade de crédito mais adequada conforme as respostas do quiz.</li>
        <li><strong>Distribuição Sequencial (Round Robin):</strong> Direcionar o seu atendimento de forma organizada entre nossos consultores ou parceiros disponíveis.</li>
        <li><strong>Comunicação de Marketing:</strong> Enviar ofertas de empréstimos, novidades e conteúdos educativos via e-mail, SMS ou WhatsApp.</li>
        <li><strong>Segurança e Prevenção à Fraude:</strong> Proteger o sistema contra robôs e acessos indevidos.</li>
        <li><strong>Cumprimento Legal:</strong> Atender ordens judiciais ou regulatórias.</li>
      </ul>

      <h2 className="text-xl font-bold text-empireland-green mt-8">4. Compartilhamento de Dados</h2>
      <p>
        A EmpireLand poderá compartilhar seus dados com:
      </p>
      <ul>
        <li><strong>Parceiros de Negócio:</strong> Instituições financeiras e correspondentes bancários para viabilizar a oferta de crédito solicitada.</li>
        <li><strong>Prestadores de Serviço:</strong> Empresas de hospedagem, ferramentas de Analytics e o sistema de API (WhatsApp) para operacionalizar o contato.</li>
        <li><strong>Autoridades:</strong> Quando houver requisição judicial ou fiscal.</li>
      </ul>
      <p>
        <em>Nota: Todos os parceiros que recebem dados da EmpireLand devem aderir a cláusulas de confidencialidade e proteção de dados compatíveis com a LGPD.</em>
      </p>

      <h2 className="text-xl font-bold text-empireland-green mt-8">5. Retenção e Exclusão</h2>
      <p>
        Seus dados são armazenados em ambiente seguro. Manteremos as informações:
      </p>
      <ul>
        <li>Pelo período necessário para a prestação do serviço (redirecionamento do lead).</li>
        <li>Para fins de marketing, até que o usuário solicite a exclusão.</li>
        <li>Por até 5 (cinco) anos para fins de auditoria e defesa jurídica, conforme as bases legais da LGPD.</li>
      </ul>

      <h2 className="text-xl font-bold text-empireland-green mt-8">6. Seus Direitos (LGPD)</h2>
      <p>
        Você, como titular, pode solicitar a qualquer momento via <a href="mailto:contato@empireland.com.br" className="text-empireland-green hover:underline">contato@empireland.com.br</a>:
      </p>
      <ul>
        <li>Confirmação de que tratamos seus dados;</li>
        <li>Acesso e cópia dos seus dados;</li>
        <li>Correção de informações incompletas ou erradas;</li>
        <li>Eliminação de dados tratados com seu consentimento;</li>
        <li>Revogação do consentimento para envio de marketing.</li>
      </ul>

      <h2 className="text-xl font-bold text-empireland-green mt-8">7. Tecnologias de Monitoramento (Cookies)</h2>
      <p>
        Utilizamos Cookies e Web Beacons para melhorar sua experiência.
      </p>
      <ul>
        <li><strong>Cookies de Sessão:</strong> Para o funcionamento correto do Quiz.</li>
        <li><strong>Analytics:</strong> Para entender quantas pessoas clicam no botão final e otimizar a página.</li>
        <li><strong>Marketing (Google/Meta):</strong> Para exibir anúncios relevantes para você em outras redes.</li>
      </ul>
      <p>
        Você pode desativar os cookies nas configurações do seu navegador, mas o Quiz pode apresentar falhas de funcionamento.
      </p>

      <h2 className="text-xl font-bold text-empireland-green mt-8">8. Transferência Internacional</h2>
      <p>
        Para fins de armazenamento em nuvem (servidores AWS, Google ou similares), seus dados podem ser transferidos para fora do Brasil, sempre mantendo o nível de criptografia e proteção exigido pela legislação nacional.
      </p>

      <h2 className="text-xl font-bold text-empireland-green mt-8">9. Medidas de Segurança</h2>
      <p>
        Adotamos protocolos rigorosos de segurança, incluindo:
      </p>
      <ul>
        <li>Criptografia de dados em trânsito (SSL/HTTPS);</li>
        <li>Monitoramento contínuo contra invasões;</li>
        <li>Controle de acesso restrito aos dados dos leads.</li>
      </ul>

      <h2 className="text-xl font-bold text-empireland-green mt-8">10. Alterações nesta Política</h2>
      <p>
        A EmpireLand reserva-se o direito de atualizar esta política periodicamente. Recomendamos a consulta frequente. Ao continuar utilizando o Quiz após uma alteração, você concorda com as novas condições.
      </p>

      <h2 className="text-xl font-bold text-empireland-green mt-8">11. Contato com o Encarregado (DPO)</h2>
      <p>
        Para dúvidas, reclamações ou exercício de direitos, entre em contato com nosso Encarregado de Proteção de Dados:
      </p>
      <p>
        <strong>E-mail:</strong> <a href="mailto:contato@empireland.com.br" className="text-empireland-green hover:underline">contato@empireland.com.br</a><br />
        <strong>Assunto:</strong> Proteção de Dados - EmpireLand
      </p>

      <div className="mt-12">
        <Link to="/" className="bg-empireland-green text-white px-8 py-3 rounded-full font-bold hover:bg-opacity-90 transition-all inline-block no-underline">
          Voltar para o Quiz
        </Link>
      </div>
    </main>
    <Footer />
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<QuizPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/termos" element={<TermsPage />} />
        <Route path="/privacidade" element={<PrivacyPage />} />
      </Routes>
    </BrowserRouter>
  );
}
