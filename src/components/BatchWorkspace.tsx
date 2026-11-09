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
import { validarEvidenciasAntiAlucinacao, trechoExisteNoTexto } from '@/lib/anti-hallucination-validator';
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

  // Métricas agregadas
  const [totalTokens, setTotalTokens] = useState(0);

  const processingRef = useRef(false);
  processingRef.current = isProcessing;

  // Carrega itens persistidos do IndexedDB ao iniciar e recalcula notas com o motor determinístico atualizado (custo zero)
  useEffect(() => {
    carregarTodosItens().then(async (itensSalvos) => {
      if (itensSalvos && itensSalvos.length > 0) {
        const itensRecalculados = itensSalvos.map((it) => {
          if (it.status === 'concluido' && it.resultado?.evidencias_auditadas) {
            const evOriginal = { ...it.resultado.evidencias_auditadas };
            const textoRef = it.texto || evOriginal.transcricao || '';

            // Restaura elementos da C5 que tinham trecho extraído válido (ex: efeito com aposto intercalado)
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
        await salvarLoteBatch(itensRecalculados);
      }
    });

    // Se houver chave salva localmente
    const savedKey = localStorage.getItem('enem_gemini_key');
    if (savedKey) setApiKey(savedKey);
  }, []);

  const salvarChave = (key: string) => {
    setApiKey(key);
    localStorage.setItem('enem_gemini_key', key);
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
          // Procura colunas com flexibilidade de nomes
          const id = row.id || row.ID || row.codigo || `aluno-${index + 1}`;
          const nomeAluno = row.nome || row.aluno || row.candidato || `Candidato ${index + 1}`;
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
        // Arquivo de texto (.txt)
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

  // Comprime imagens grandes (> 1.5 MB) no navegador para evitar erro 413 Payload Too Large na Vercel/Netlify (limite 4.5 MB)
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

  // 3. Executor da Fila com Concorrência
  const startProcessing = async () => {
    setIsProcessing(true);
    processingRef.current = true;

    // Fila de pendentes
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

        // Atualiza status para processando
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

          // Atualiza item concluído
          atualizarItemConcluido(item.id, data.resultado, data.tokensUsage);
        } catch (err: any) {
          atualizarStatusItem(item.id, 'erro', err.message);
        }
      }
    };

    // Lança workers concorrentes
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
  const mediaNotas =
    totalConcluidos > 0
      ? Math.round(
          items
            .filter((i) => i.status === 'concluido' && i.resultado)
            .reduce((acc, i) => acc + (i.resultado?.anulada ? 0 : i.resultado?.nota_total || 0), 0) /
            totalConcluidos
        )
      : 0;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-slate-900">
      {/* Top Header */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-700 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
              ENEM 2025 Oficial
            </span>
            <span className="flex items-center gap-1.5 text-xs text-emerald-900 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-700" /> Motor Determinístico Anti-Delírio
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-950 mt-2 tracking-tight">
            Corretor em Massa de Redações
          </h1>
          <p className="text-sm font-medium text-slate-700 mt-0.5">
            Fidelidade matemática estrita à Grade 2025 • Custo mínimo de tokens com Structured Output
          </p>
        </div>

        {/* Chave de API e Configurações */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <input
              type="password"
              placeholder="Cole sua Gemini API Key..."
              value={apiKey}
              onChange={(e) => salvarChave(e.target.value)}
              className="w-full text-xs font-semibold px-3.5 py-2.5 bg-white text-slate-900 placeholder:text-slate-500 border-2 border-slate-400 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 shadow-sm"
            />
          </div>
          <select
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            className="text-xs font-bold px-3 py-2.5 bg-white text-slate-900 border-2 border-slate-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-sm cursor-pointer"
          >
            <option value="gemini-3.8-flash">gemini-3.8-flash (Recomendado / Padrão)</option>
            <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Ultra Rápido / Baixo Custo)</option>
            <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite</option>
            <option value="gemini-3-flash-preview">gemini-3-flash-preview</option>
            <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Alta Capacidade / Raciocínio)</option>
          </select>
        </div>
      </div>

      {/* Seção de Configuração da Proposta Temática */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-md space-y-4">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-indigo-700" />
          Proposta e Textos Motivadores do Lote
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5">
              Frase Temática Oficial:
            </label>
            <input
              type="text"
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              placeholder="Ex: Desafios para a valorização de comunidades e povos tradicionais..."
              className="w-full text-xs font-semibold p-3 bg-white text-slate-900 placeholder:text-slate-500 border-2 border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 shadow-inner"
            />
            <p className="text-[11px] font-medium text-slate-600 mt-1.5">
              * Redações importadas via planilha com coluna "tema" própria utilizarão seu respectivo tema.
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5">
              Textos Motivadores (para detecção determinística de cópia):
            </label>
            <textarea
              rows={2}
              value={textosMotivadores}
              onChange={(e) => setTextosMotivadores(e.target.value)}
              placeholder="Cole os excertos dos textos motivadores I, II, III e IV..."
              className="w-full text-xs font-mono font-medium p-3 bg-white text-slate-900 placeholder:text-slate-500 border-2 border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 shadow-inner"
            />
          </div>
        </div>
      </div>

      {/* Área de Importação e Ações do Lote */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card Importação Planilha */}
        <label className="border-2 border-dashed border-indigo-400 hover:border-indigo-600 bg-indigo-50/70 hover:bg-indigo-100/60 p-6 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition shadow-sm group">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <span className="text-base font-extrabold text-indigo-950">Importar Planilha (XLSX / CSV)</span>
          <span className="text-xs font-semibold text-slate-700 mt-1">Colunas "aluno" e "texto" reconhecidas automaticamente</span>
          <input type="file" accept=".xlsx, .xls, .csv" onChange={handleSpreadsheetUpload} className="hidden" />
        </label>

        {/* Card Importação Manuscritos / TXT */}
        <label className="border-2 border-dashed border-slate-400 hover:border-slate-600 bg-slate-100 hover:bg-slate-200/70 p-6 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition shadow-sm group">
          <div className="w-12 h-12 rounded-xl bg-slate-800 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition">
            <UploadCloud className="w-6 h-6" />
          </div>
          <span className="text-base font-extrabold text-slate-950">Importar Folhas / Manuscritos / TXT</span>
          <span className="text-xs font-semibold text-slate-700 mt-1">JPG, PNG, PDF ou arquivos de texto puro</span>
          <input type="file" multiple accept="image/*,application/pdf,.txt" onChange={handleMediaUpload} className="hidden" />
        </label>

        {/* Card Controles de Execução */}
        <div className="bg-white border-2 border-slate-300 p-6 rounded-2xl shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase text-slate-800">Concorrência:</span>
              <select
                value={concorrencia}
                onChange={(e) => setConcorrencia(Number(e.target.value))}
                className="text-xs font-bold border-2 border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-900"
                disabled={isProcessing}
              >
                <option value={1}>1 por vez (Mais seguro)</option>
                <option value={3}>3 simultâneas (Recomendado)</option>
                <option value={5}>5 simultâneas (Rápido)</option>
              </select>
            </div>
            <div className="text-xs font-bold text-slate-800 mt-2">
              {items.length} redações carregadas ({totalPendentes} pendentes)
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            {!isProcessing ? (
              <button
                onClick={startProcessing}
                disabled={items.length === 0}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-40 text-white font-extrabold py-3 px-4 rounded-xl text-sm transition shadow-md cursor-pointer disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 fill-white" />
                Iniciar Correções
              </button>
            ) : (
              <button
                onClick={stopProcessing}
                className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold py-3 px-4 rounded-xl text-sm transition shadow-md cursor-pointer"
              >
                <Pause className="w-4 h-4" />
                Pausar Fila
              </button>
            )}

            <button
              onClick={startProcessing}
              title="Reprocessar pendentes ou com erro"
              className="p-3 text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl border-2 border-slate-300 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleLimparLote}
              title="Limpar todas"
              className="p-3 text-slate-700 hover:text-red-700 hover:bg-red-50 rounded-xl border-2 border-slate-300 transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Métricas e Dashboard Resumido */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border-2 border-slate-300 p-4 rounded-xl shadow-sm">
            <span className="text-xs font-bold text-slate-700">Total de Redações</span>
            <div className="text-2xl font-black text-slate-950 mt-1">{items.length}</div>
          </div>
          <div className="bg-white border-2 border-slate-300 p-4 rounded-xl shadow-sm">
            <span className="text-xs font-bold text-slate-700">Concluídas / Sucesso</span>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              {totalConcluidos} <span className="text-xs text-slate-500 font-bold">({totalErros} erros)</span>
            </div>
          </div>
          <div className="bg-white border-2 border-slate-300 p-4 rounded-xl shadow-sm">
            <span className="text-xs font-bold text-slate-700">Média das Notas</span>
            <div className="text-2xl font-black text-indigo-700 mt-1">{mediaNotas}</div>
          </div>
          <div className="bg-white border-2 border-slate-300 p-4 rounded-xl shadow-sm">
            <span className="text-xs font-bold text-slate-700">Consumo de Tokens</span>
            <div className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-1">
              <Sparkles className="w-5 h-5 text-amber-500 fill-amber-400" />
              {totalTokens.toLocaleString('pt-BR')}
            </div>
          </div>
        </div>
      )}

      {/* Tabela do Lote de Redações */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl shadow-md overflow-hidden">
        <div className="p-4 sm:p-5 border-b-2 border-slate-200 flex items-center justify-between bg-slate-50/80">
          <h3 className="font-extrabold text-slate-950 text-sm">Fila de Correção em Massa</h3>
          {totalConcluidos > 0 && (
            <button
              onClick={exportarPlanilhaResultados}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-extrabold shadow-sm transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Exportar Resultados (XLSX)
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="p-12 text-center text-slate-600 font-medium text-sm">
            Nenhuma redação carregada ainda. Importe uma planilha Excel ou arquivos de texto/imagens acima.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-900 font-extrabold border-b-2 border-slate-300">
                <tr>
                  <th className="py-3.5 px-4">Aluno / Identificador</th>
                  <th className="py-3.5 px-4">Tipo</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">C1</th>
                  <th className="py-3.5 px-4 text-center">C2</th>
                  <th className="py-3.5 px-4 text-center">C3</th>
                  <th className="py-3.5 px-4 text-center">C4</th>
                  <th className="py-3.5 px-4 text-center">C5</th>
                  <th className="py-3.5 px-4 text-right">Nota Total</th>
                  <th className="py-3.5 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-900 font-medium">
                {items.map((item) => {
                  const r = item.resultado;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">{item.identificadorAluno}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {item.modalidade === 'handwritten_media' ? 'Manuscrito' : 'Digitado'}
                      </td>
                      <td className="py-3 px-4">
                        {item.status === 'pendente' && (
                          <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                            <Clock className="w-3 h-3 text-slate-400" /> Pendente
                          </span>
                        )}
                        {item.status === 'processando' && (
                          <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full font-medium animate-pulse">
                            <RotateCcw className="w-3 h-3 animate-spin text-indigo-600" /> Corrigindo...
                          </span>
                        )}
                        {item.status === 'concluido' && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Concluído
                          </span>
                        )}
                        {item.status === 'erro' && (
                          <span
                            title={item.erroMensagem}
                            className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-full font-medium cursor-help"
                          >
                            <AlertCircle className="w-3 h-3 text-red-600" /> Erro
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">{r ? r.c1.pontos : '-'}</td>
                      <td className="py-3 px-4 text-center font-mono">{r ? r.c2.pontos : '-'}</td>
                      <td className="py-3 px-4 text-center font-mono">{r ? r.c3.pontos : '-'}</td>
                      <td className="py-3 px-4 text-center font-mono">{r ? r.c4.pontos : '-'}</td>
                      <td className="py-3 px-4 text-center font-mono">{r ? r.c5.pontos : '-'}</td>
                      <td className="py-3 px-4 text-right font-black text-sm">
                        {r ? (
                          <span className={r.anulada ? 'text-red-600' : 'text-slate-900'}>
                            {r.anulada ? '0 (Anulada)' : r.nota_total}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {r && (
                          <button
                            onClick={() => setSelectedItemForModal(item)}
                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition"
                            title="Ver espelho de correção oficial"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal do Espelho do Aluno */}
      {selectedItemForModal && selectedItemForModal.resultado && (
        <StudentScoreModal
          resultado={selectedItemForModal.resultado}
          alunoNome={selectedItemForModal.identificadorAluno}
          textoOriginal={selectedItemForModal.texto || selectedItemForModal.resultado.evidencias_auditadas.transcricao}
          imagemUrl={selectedItemForModal.imagemBase64}
          onClose={() => setSelectedItemForModal(null)}
        />
      )}
    </div>
  );
}
