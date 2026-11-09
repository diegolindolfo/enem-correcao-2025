'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  BatchItem,
  salvarLoteBatch,
  salvarItemBatch,
  carregarTodosItens,
  limparBancoLote,
} from '@/lib/storage-db';
import { validarEvidenciasAntiAlucinacao } from '@/lib/anti-hallucination-validator';
import { calcularNotaEnem2025 } from '@/lib/enem-2025-engine';
import StudentScoreModal from './StudentScoreModal';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Trash2,
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  Settings2,
  Eye,
  PlusCircle,
  Search,
  KeyRound,
  Cpu,
  TrendingUp,
  FileText,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';

export default function BatchWorkspace() {
  const [apiKey, setApiKey] = useState('');
  const [tema, setTema] = useState(
    'Desafios para a valorização de comunidades e povos tradicionais no Brasil'
  );
  const [textosMotivadores, setTextosMotivadores] = useState('');
  const [modelName, setModelName] = useState('gemini-3.8-flash');
  const [concorrencia, setConcorrencia] = useState(3);

  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedItemForModal, setSelectedItemForModal] = useState<BatchItem | null>(null);

  // Filtros e busca da tabela
  const [buscaAluno, setBuscaAluno] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'concluido' | 'pendente' | 'erro'>('todos');
  const [mostrarProposta, setMostrarProposta] = useState(true);

  // Modal de inserção manual rápida
  const [mostrarModalManual, setMostrarModalManual] = useState(false);
  const [novoAlunoManual, setNovoAlunoManual] = useState('');
  const [novoTextoManual, setNovoTextoManual] = useState('');

  // Métricas agregadas
  const [totalTokens, setTotalTokens] = useState(0);

  const processingRef = useRef(false);
  processingRef.current = isProcessing;

  // Carrega itens persistidos do IndexedDB ao iniciar e recalcula notas com o motor determinístico atualizado (custo zero)
  useEffect(() => {
    carregarTodosItens().then(async (itensSalvos) => {
      if (itensSalvos && itensSalvos.length > 0) {
        let somaTokens = 0;
        const itensRecalculados = itensSalvos.map((it) => {
          if (it.tokensUsage?.totalTokens) {
            somaTokens += it.tokensUsage.totalTokens;
          }
          if (it.status === 'concluido' && it.resultado?.evidencias_auditadas) {
            const evOriginal = { ...it.resultado.evidencias_auditadas };
            const textoRef = it.texto || evOriginal.transcricao || '';

            if (evOriginal.proposta_intervencao) {
              const prop = { ...evOriginal.proposta_intervencao };
              for (const k of ['agente', 'acao', 'meio_modo', 'efeito', 'detalhamento'] as const) {
                const el = prop[k];
                if (el && el.trecho && el.trecho.trim().length > 0 && !(el as any).nulo_motivo) {
                  prop[k] = { ...el, valido: true };
                }
              }
              evOriginal.proposta_intervencao = prop;
            }

            const { evidenciasSaneadas } = validarEvidenciasAntiAlucinacao(
              textoRef,
              evOriginal,
              it.modalidade
            );
            const novoResultado = calcularNotaEnem2025(
              it.id,
              evidenciasSaneadas,
              it.modalidade,
              it.resultado.copia_percentual
            );
            return { ...it, resultado: novoResultado };
          }
          return it;
        });

        setItems(itensRecalculados);
        setTotalTokens(somaTokens);
        await salvarLoteBatch(itensRecalculados);
      }
    });

    const savedKey = localStorage.getItem('enem_gemini_key');
    if (savedKey) setApiKey(savedKey);
  }, []);

  const salvarChave = (key: string) => {
    setApiKey(key);
    localStorage.setItem('enem_gemini_key', key);
  };

  // Adicionar redação digitada avulsa
  const handleAdicionarManual = async () => {
    if (!novoTextoManual.trim()) return;
    const novoItem: BatchItem = {
      id: `manual-${Date.now()}`,
      identificadorAluno: novoAlunoManual.trim() || `Aluno Avulso ${items.length + 1}`,
      modalidade: 'text',
      texto: novoTextoManual,
      tema,
      status: 'pendente',
    };
    const atualizados = [novoItem, ...items];
    setItems(atualizados);
    await salvarLoteBatch(atualizados);
    setNovoAlunoManual('');
    setNovoTextoManual('');
    setMostrarModalManual(false);
  };

  // 1. Importação de Arquivo XLSX/CSV
  const handleSpreadsheetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        const novosItens: BatchItem[] = data.map((row, index) => {
          const nomeAluno = row.nome || row.aluno || row.candidato || row.id || row.ID || `Candidato ${index + 1}`;
          const texto = row.texto || row.redacao || row.conteudo || '';
          const temaLinha = row.tema || row.proposta || tema;

          return {
            id: `batch-${Date.now()}-${index}`,
            identificadorAluno: String(nomeAluno),
            modalidade: 'text',
            texto: String(texto),
            tema: temaLinha,
            status: 'pendente',
          };
        });

        const itensAtualizados = [...items, ...novosItens];
        setItems(itensAtualizados);
        await salvarLoteBatch(itensAtualizados);
      } catch (err: any) {
        alert('Erro ao carregar planilha: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // 2. Importação de Múltiplos Arquivos (TXT, JPG, PNG, PDF)
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const novosItens: BatchItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImageOrPdf = file.type.startsWith('image/') || file.type === 'application/pdf';

      if (isImageOrPdf) {
        const { base64, mimeType } = await prepararMidiaOtimizada(file);
        novosItens.push({
          id: `media-${Date.now()}-${i}`,
          identificadorAluno: file.name.replace(/\.[^/.]+$/, ''),
          modalidade: 'handwritten_media',
          imagemBase64: base64,
          mimeType,
          tema,
          status: 'pendente',
        });
      } else {
        const text = await file.text();
        novosItens.push({
          id: `txt-${Date.now()}-${i}`,
          identificadorAluno: file.name.replace(/\.[^/.]+$/, ''),
          modalidade: 'text',
          texto: text,
          tema,
          status: 'pendente',
        });
      }
    }

    const itensAtualizados = [...items, ...novosItens];
    setItems(itensAtualizados);
    await salvarLoteBatch(itensAtualizados);
    e.target.value = '';
  };

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  // Comprime imagens grandes (> 1.5 MB) no navegador para evitar erro 413 Payload Too Large na Vercel/Netlify
  const prepararMidiaOtimizada = async (file: File): Promise<{ base64: string; mimeType: string }> => {
    if (!file.type.startsWith('image/') || file.size <= 1.5 * 1024 * 1024) {
      return { base64: await toBase64(file), mimeType: file.type };
    }

    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX_DIM = 1800;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          toBase64(file).then((b64) => resolve({ base64: b64, mimeType: file.type }));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.84);
        resolve({ base64: compressedBase64, mimeType: 'image/jpeg' });
      };
      img.onerror = async () => {
        URL.revokeObjectURL(url);
        resolve({ base64: await toBase64(file), mimeType: file.type });
      };
      img.src = url;
    });
  };

  // Avaliar um único item (usado pela fila ou pelo botão individual)
  const processarUnicoItem = async (item: BatchItem) => {
    atualizarStatusItem(item.id, 'processando');
    try {
      const resp = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redacaoId: item.id,
          modalidade: item.modalidade,
          texto: item.texto,
          imagemBase64: item.imagemBase64,
          mimeType: item.mimeType,
          tema: item.tema || tema,
          textosMotivadores,
          apiKey,
          modelName,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Erro na resposta da API');
      }

      atualizarItemConcluido(item.id, data.resultado, data.tokensUsage);
    } catch (err: any) {
      atualizarStatusItem(item.id, 'erro', err.message);
    }
  };

  // 3. Executor da Fila com Concorrência
  const startProcessing = async () => {
    setIsProcessing(true);
    processingRef.current = true;

    const queue = items.filter((it) => it.status === 'pendente' || it.status === 'erro');
    if (queue.length === 0) {
      setIsProcessing(false);
      return;
    }

    let currentIndex = 0;

    const worker = async () => {
      while (currentIndex < queue.length && processingRef.current) {
        const item = queue[currentIndex++];
        if (!item) break;
        await processarUnicoItem(item);
      }
    };

    const workers = Array.from({ length: Math.min(concorrencia, queue.length) }, () => worker());
    await Promise.all(workers);

    setIsProcessing(false);
  };

  const stopProcessing = () => {
    setIsProcessing(false);
    processingRef.current = false;
  };

  const atualizarStatusItem = (id: string, status: BatchItem['status'], erroMensagem?: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          const updated = { ...it, status, erroMensagem };
          salvarItemBatch(updated);
          return updated;
        }
        return it;
      })
    );
  };

  const atualizarItemConcluido = (
    id: string,
    resultado: any,
    tokensUsage?: { promptTokens: number; completionTokens: number; totalTokens: number }
  ) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          const updated: BatchItem = {
            ...it,
            status: 'concluido',
            resultado,
            tokensUsage,
          };
          salvarItemBatch(updated);
          return updated;
        }
        return it;
      })
    );

    if (tokensUsage?.totalTokens) {
      setTotalTokens((prev) => prev + tokensUsage.totalTokens);
    }
  };

  const handleRemoverItem = async (id: string) => {
    const filtrados = items.filter((i) => i.id !== id);
    setItems(filtrados);
    await limparBancoLote();
    if (filtrados.length > 0) {
      await salvarLoteBatch(filtrados);
    }
  };

  const handleLimparLote = async () => {
    if (confirm('Tem certeza de que deseja limpar todas as redações deste lote?')) {
      await limparBancoLote();
      setItems([]);
      setTotalTokens(0);
    }
  };

  // 4. Exportação para XLSX
  const exportarPlanilhaResultados = () => {
    if (items.length === 0) return;

    const rows = items.map((it) => {
      const r = it.resultado;
      return {
        Aluno: it.identificadorAluno,
        Modalidade: it.modalidade === 'handwritten_media' ? 'Manuscrito (Imagem/PDF)' : 'Texto Digitado',
        Status: it.status,
        Nota_Total: r?.anulada ? 0 : r?.nota_total ?? '',
        Anulada: r?.anulada ? 'SIM' : 'NÃO',
        Motivo_Anulacao: r?.motivo_anulacao || '',
        C1_Nota: r?.c1?.pontos ?? '',
        C1_Nivel: r?.c1?.nivel ?? '',
        C1_Desvios_Qtd: r?.desvios_c1_validados?.length ?? '',
        C2_Nota: r?.c2?.pontos ?? '',
        C2_Nivel: r?.c2?.nivel ?? '',
        C3_Nota: r?.c3?.pontos ?? '',
        C3_Nivel: r?.c3?.nivel ?? '',
        C4_Nota: r?.c4?.pontos ?? '',
        C4_Nivel: r?.c4?.nivel ?? '',
        C5_Nota: r?.c5?.pontos ?? '',
        C5_Nivel: r?.c5?.nivel ?? '',
        Tokens_Gastos: it.tokensUsage?.totalTokens ?? 0,
        Erro: it.erroMensagem || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Correcoes_ENEM_2025');
    XLSX.writeFile(wb, `ENEM_2025_Lote_${Date.now()}.xlsx`);
  };

  // Estatísticas rápidas
  const totalConcluidos = items.filter((i) => i.status === 'concluido').length;
  const totalPendentes = items.filter((i) => i.status === 'pendente').length;
  const totalErros = items.filter((i) => i.status === 'erro').length;
  const progressoPercent = items.length > 0 ? Math.round((totalConcluidos / items.length) * 100) : 0;

  const concluidosComNota = items.filter((i) => i.status === 'concluido' && i.resultado);
  const mediaNotas =
    concluidosComNota.length > 0
      ? Math.round(
          concluidosComNota.reduce(
            (acc, i) => acc + (i.resultado?.anulada ? 0 : i.resultado?.nota_total || 0),
            0
          ) / concluidosComNota.length
        )
      : 0;

  const maiorNota =
    concluidosComNota.length > 0
      ? Math.max(...concluidosComNota.map((i) => (i.resultado?.anulada ? 0 : i.resultado?.nota_total || 0)))
      : 0;

  const mediaTokensPorRedacao = totalConcluidos > 0 ? Math.round(totalTokens / totalConcluidos) : 0;

  // Filtragem da tabela
  const itensFiltrados = items.filter((it) => {
    const matchBusca = it.identificadorAluno.toLowerCase().includes(buscaAluno.toLowerCase());
    const matchStatus = filtroStatus === 'todos' ? true : it.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  // Helper de cor para pílulas de nota C1-C5
  const renderScorePill = (pontos?: number, travas?: string[]) => {
    if (pontos === undefined) return <span className="text-slate-300">—</span>;
    const temTrava = travas && travas.length > 0;
    let colorClass = 'bg-slate-100 text-slate-800 border-slate-200';
    if (pontos === 200) colorClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    else if (pontos === 160) colorClass = 'bg-indigo-50 text-indigo-800 border-indigo-200';
    else if (pontos === 120) colorClass = 'bg-sky-50 text-sky-800 border-sky-200';
    else if (pontos <= 80) colorClass = 'bg-amber-50 text-amber-900 border-amber-200';

    return (
      <span
        className={`inline-flex items-center justify-center gap-1 min-w-12 px-2 py-0.5 rounded-md text-xs font-extrabold border font-mono ${colorClass}`}
        title={temTrava ? travas.join(' | ') : undefined}
      >
        {pontos}
        {temTrava && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-900 pb-16">
      {/* Barra Superior Institucional */}
      <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center font-black text-base tracking-tighter shadow-inner border border-indigo-400/30">
                E25
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                    ENEM 2025 • Avaliador em Massa
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Motor Determinístico
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Grade Específica Oficial • Extração Factual sem Alucinação de Nota
                </p>
              </div>
            </div>

            <button
              onClick={() => setMostrarModalManual(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Avulsa
            </button>
          </div>

          {/* Controles de API, Modelo e Redação Avulsa */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 sm:flex-initial sm:w-64">
              <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                placeholder="Gemini API Key (ou via servidor)..."
                value={apiKey}
                onChange={(e) => salvarChave(e.target.value)}
                className="w-full text-xs font-semibold pl-8 pr-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="relative">
              <Cpu className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="text-xs font-bold pl-8 pr-7 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="gemini-3.8-flash">gemini-3.8-flash (Padrão)</option>
                <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Ultra Econômico)</option>
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite</option>
                <option value="gemini-3-flash-preview">gemini-3-flash-preview</option>
                <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Pro)</option>
              </select>
            </div>

            <button
              onClick={() => setMostrarModalManual(true)}
              className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Digitar Redação Avulsa
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Card Retrátil de Configuração da Proposta Temática */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setMostrarProposta(!mostrarProposta)}
            className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/70 hover:bg-slate-100/60 transition cursor-pointer text-left border-b border-slate-200/70"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
                <Settings2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  Proposta Temática e Textos Motivadores do Lote
                </h2>
                <p className="text-xs text-slate-600 font-medium line-clamp-1">
                  Tema ativo: <span className="font-bold text-indigo-950">{tema || 'Não definido'}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span>{mostrarProposta ? 'Ocultar' : 'Editar Proposta'}</span>
              {mostrarProposta ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {mostrarProposta && (
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-5 bg-white">
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                  Frase Temática Oficial (Critério de Tangência / Fuga na C2, C3 e C5):
                </label>
                <input
                  type="text"
                  value={tema}
                  onChange={(e) => setTema(e.target.value)}
                  placeholder="Ex: Desafios para a valorização de comunidades e povos tradicionais no Brasil"
                  className="w-full text-xs font-semibold p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Caso sua planilha possua uma coluna chamada <code className="font-mono font-bold text-slate-700">tema</code>, ela terá prioridade para aquela linha.
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-extrabold text-slate-800">
                    Textos Motivadores da Prova (Detector Matemático de Cópia):
                  </label>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {textosMotivadores.trim() ? `${textosMotivadores.trim().split(/\s+/).length} palavras` : 'Opcional'}
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={textosMotivadores}
                  onChange={(e) => setTextosMotivadores(e.target.value)}
                  placeholder="Cole aqui os textos motivadores I, II, III e IV para detecção automática de cópia a custo zero..."
                  className="w-full text-xs font-mono p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3 Cards de Entrada e Controle de Execução */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Planilha */}
          <label className="bg-white border-2 border-dashed border-indigo-300 hover:border-indigo-600 hover:bg-indigo-50/30 p-6 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition shadow-2xs group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <span className="text-sm font-extrabold text-slate-900">Importar Planilha (XLSX / CSV)</span>
            <span className="text-xs text-slate-500 mt-1 max-w-xs">
              Reconhece colunas <strong className="text-slate-700">aluno</strong>, <strong className="text-slate-700">texto</strong> e <strong className="text-slate-700">tema</strong>
            </span>
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleSpreadsheetUpload} className="hidden" />
          </label>

          {/* Card 2: Manuscritos / Fotos / PDF */}
          <label className="bg-white border-2 border-dashed border-slate-300 hover:border-slate-600 hover:bg-slate-50 p-6 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition shadow-2xs group">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center mb-3 group-hover:bg-slate-900 group-hover:text-white transition">
              <UploadCloud className="w-6 h-6" />
            </div>
            <span className="text-sm font-extrabold text-slate-900">Importar Manuscritos / TXT</span>
            <span className="text-xs text-slate-500 mt-1 max-w-xs">
              Fotos de folhas (<strong className="text-slate-700">JPG, PNG, PDF</strong>) ou arquivos <strong className="text-slate-700">.TXT</strong> em lote
            </span>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf,.txt"
              onChange={handleMediaUpload}
              className="hidden"
            />
          </label>

          {/* Card 3: Orquestrador da Fila */}
          <div className="bg-white border border-slate-200/90 p-6 rounded-2xl shadow-2xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Orquestrador de Fila
                </span>
                <select
                  value={concorrencia}
                  onChange={(e) => setConcorrencia(Number(e.target.value))}
                  className="text-xs font-bold border border-slate-300 rounded-lg px-2.5 py-1 bg-slate-50 text-slate-900 cursor-pointer"
                  disabled={isProcessing}
                >
                  <option value={1}>1 simultânea</option>
                  <option value={3}>3 simultâneas</option>
                  <option value={5}>5 simultâneas</option>
                </select>
              </div>

              {/* Barra de Progresso */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-600">
                    {totalConcluidos} de {items.length} corrigidas
                  </span>
                  <span className="text-indigo-700">{progressoPercent}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${progressoPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              {!isProcessing ? (
                <button
                  onClick={startProcessing}
                  disabled={items.length === 0 || (totalPendentes === 0 && totalErros === 0)}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition shadow-xs cursor-pointer disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4 fill-white" />
                  {totalConcluidos > 0 && totalPendentes > 0 ? 'Continuar Lote' : 'Iniciar Correções'}
                </button>
              ) : (
                <button
                  onClick={stopProcessing}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition shadow-xs cursor-pointer"
                >
                  <Pause className="w-4 h-4" />
                  Pausar Fila
                </button>
              )}

              <button
                onClick={startProcessing}
                title="Reprocessar pendentes ou com erro"
                className="p-2.5 text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl border border-slate-200 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={handleLimparLote}
                title="Limpar todo o lote"
                className="p-2.5 text-slate-700 hover:text-red-700 hover:bg-red-50 rounded-xl border border-slate-200 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 4 Cards de Estatísticas Executivas */}
        {items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500">Volume do Lote</span>
                <div className="text-2xl font-black text-slate-950 mt-0.5">{items.length} redações</div>
                <span className="text-[11px] font-semibold text-slate-500">
                  {totalPendentes} na fila • {totalErros} falhas
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500">Concluídas com Sucesso</span>
                <div className="text-2xl font-black text-emerald-700 mt-0.5">{totalConcluidos}</div>
                <span className="text-[11px] font-semibold text-emerald-700">
                  100% validadas contra alucinação
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500">Média Geral do Lote</span>
                <div className="text-2xl font-black text-indigo-700 mt-0.5">{mediaNotas} pts</div>
                <span className="text-[11px] font-semibold text-slate-500">
                  Maior nota: <strong className="text-slate-800">{maiorNota} pts</strong>
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500">Consumo de Tokens</span>
                <div className="text-2xl font-black text-slate-900 mt-0.5">
                  {totalTokens.toLocaleString('pt-BR')}
                </div>
                <span className="text-[11px] font-semibold text-slate-500">
                  ~{mediaTokensPorRedacao.toLocaleString('pt-BR')} tokens/redação
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
          </div>
        )}

        {/* Tabela Principal de Resultados */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          {/* Barra de Ferramentas da Tabela */}
          <div className="p-4 sm:px-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-extrabold text-slate-950 text-sm mr-2">Espelhos de Correção</h3>
              {[
                { key: 'todos', label: `Todas (${items.length})` },
                { key: 'concluido', label: `Concluídas (${totalConcluidos})` },
                { key: 'pendente', label: `Pendentes (${totalPendentes})` },
                { key: 'erro', label: `Erros (${totalErros})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFiltroStatus(tab.key as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    filtroStatus === tab.key
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {items.length > 0 && (
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar candidato..."
                    value={buscaAluno}
                    onChange={(e) => setBuscaAluno(e.target.value)}
                    className="w-full text-xs font-medium pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {totalConcluidos > 0 && (
                <button
                  onClick={exportarPlanilhaResultados}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-extrabold shadow-2xs transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Exportar Planilha (XLSX)
                </button>
              )}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="p-14 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div className="max-w-sm mx-auto">
                <h4 className="text-sm font-extrabold text-slate-800">Nenhuma redação na fila</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Importe uma planilha Excel/CSV, envie fotos de folhas manuscritas ou clique em "Digitar Redação Avulsa" no topo.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-5">Candidato / Arquivo</th>
                    <th className="py-3.5 px-3">Entrada</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-2 text-center" title="Competência I: Norma-Padrão">
                      <span className="inline-block w-2 h-2 rounded-full bg-fuchsia-700 mr-1" />
                      C1
                    </th>
                    <th className="py-3.5 px-2 text-center" title="Competência II: Tema e Repertório">
                      <span className="inline-block w-2 h-2 rounded-full bg-rose-700 mr-1" />
                      C2
                    </th>
                    <th className="py-3.5 px-2 text-center" title="Competência III: Projeto e Argumentação">
                      <span className="inline-block w-2 h-2 rounded-full bg-sky-700 mr-1" />
                      C3
                    </th>
                    <th className="py-3.5 px-2 text-center" title="Competência IV: Coesão">
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-600 mr-1" />
                      C4
                    </th>
                    <th className="py-3.5 px-2 text-center" title="Competência V: Proposta de Intervenção">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-700 mr-1" />
                      C5
                    </th>
                    <th className="py-3.5 px-4 text-right">Nota Final</th>
                    <th className="py-3.5 px-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 text-slate-800 font-medium">
                  {itensFiltrados.map((item) => {
                    const r = item.resultado;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => r && setSelectedItemForModal(item)}
                        className={`transition ${
                          r ? 'hover:bg-indigo-50/40 cursor-pointer' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3.5 px-5 font-bold text-slate-950 max-w-xs truncate">
                          {item.identificadorAluno}
                        </td>
                        <td className="py-3.5 px-3">
                          {item.modalidade === 'handwritten_media' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                              <ImageIcon className="w-3 h-3 text-slate-500" /> Manuscrito
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              <FileText className="w-3 h-3 text-slate-400" /> Texto
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          {item.status === 'pendente' && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full font-bold">
                              <Clock className="w-3 h-3 text-slate-400" /> Na fila
                            </span>
                          )}
                          {item.status === 'processando' && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full font-bold animate-pulse">
                              <RotateCcw className="w-3 h-3 animate-spin text-indigo-600" /> Avaliando...
                            </span>
                          )}
                          {item.status === 'concluido' && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Auditado
                            </span>
                          )}
                          {item.status === 'erro' && (
                            <span
                              title={item.erroMensagem}
                              className="inline-flex items-center gap-1 text-[11px] text-red-800 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full font-bold cursor-help"
                            >
                              <AlertCircle className="w-3 h-3 text-red-600" /> Falha
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          {renderScorePill(r?.c1.pontos, r?.c1.travas_acionadas)}
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          {renderScorePill(r?.c2.pontos, r?.c2.travas_acionadas)}
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          {renderScorePill(r?.c3.pontos, r?.c3.travas_acionadas)}
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          {renderScorePill(r?.c4.pontos, r?.c4.travas_acionadas)}
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          {renderScorePill(r?.c5.pontos, r?.c5.travas_acionadas)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {r ? (
                            <span
                              className={`inline-block font-black text-sm px-2.5 py-0.5 rounded-lg ${
                                r.anulada
                                  ? 'bg-red-100 text-red-800'
                                  : r.nota_total >= 900
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'text-slate-950'
                              }`}
                            >
                              {r.anulada ? '0 (Anulada)' : r.nota_total}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td
                          className="py-3.5 px-5 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center justify-end gap-1">
                            {r && (
                              <button
                                onClick={() => setSelectedItemForModal(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition cursor-pointer"
                                title="Abrir Espelho Oficial de Correção"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Espelho
                              </button>
                            )}
                            <button
                              onClick={() => processarUnicoItem(item)}
                              disabled={item.status === 'processando'}
                              className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-slate-100 rounded-lg transition cursor-pointer disabled:opacity-40"
                              title="Reprocessar esta redação"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoverItem(item.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title="Remover da lista"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Inserção de Redação Avulsa */}
      {mostrarModalManual && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
          onClick={() => setMostrarModalManual(false)}
        >
          <div
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-extrabold text-base">Adicionar Redação Avulsa</h3>
              <button
                onClick={() => setMostrarModalManual(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">
                  Nome ou Identificador do Candidato:
                </label>
                <input
                  type="text"
                  value={novoAlunoManual}
                  onChange={(e) => setNovoAlunoManual(e.target.value)}
                  placeholder="Ex: Maria Silva - Turma 3º A"
                  className="w-full text-xs font-semibold p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">
                  Texto da Redação (separe os parágrafos com Enter):
                </label>
                <textarea
                  rows={10}
                  value={novoTextoManual}
                  onChange={(e) => setNovoTextoManual(e.target.value)}
                  placeholder="Cole ou digite aqui o texto integral da redação..."
                  className="w-full text-xs font-mono p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setMostrarModalManual(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAdicionarManual}
                  disabled={!novoTextoManual.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-extrabold rounded-xl shadow-xs cursor-pointer"
                >
                  Adicionar à Fila
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Espelho do Aluno */}
      {selectedItemForModal && selectedItemForModal.resultado && (
        <StudentScoreModal
          resultado={selectedItemForModal.resultado}
          alunoNome={selectedItemForModal.identificadorAluno}
          textoOriginal={
            selectedItemForModal.texto || selectedItemForModal.resultado.evidencias_auditadas.transcricao
          }
          imagemUrl={selectedItemForModal.imagemBase64}
          onClose={() => setSelectedItemForModal(null)}
        />
      )}
    </div>
  );
}
