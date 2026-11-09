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
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  Settings,
  Plus,
  Search,
  X,
  FileText,
  Image as ImageIcon,
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

  // Menus minimalistas (Configurações e Texto Avulso)
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [mostrarModalManual, setMostrarModalManual] = useState(false);
  const [novoAlunoManual, setNovoAlunoManual] = useState('');
  const [novoTextoManual, setNovoTextoManual] = useState('');

  const [buscaAluno, setBuscaAluno] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [totalTokens, setTotalTokens] = useState(0);

  const processingRef = useRef(false);
  processingRef.current = isProcessing;
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Upload unificado sem fricção: detecta sozinho se é planilha (XLSX/CSV), imagem/PDF ou TXT
  const processarArquivosRecebidos = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const novosItens: BatchItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        const itensPlanilha = await lerPlanilha(file);
        novosItens.push(...itensPlanilha);
      } else if (file.type.startsWith('image/') || file.type === 'application/pdf' || ext === 'pdf') {
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

    if (novosItens.length > 0) {
      const itensAtualizados = [...items, ...novosItens];
      setItems(itensAtualizados);
      await salvarLoteBatch(itensAtualizados);
    }
  };

  const lerPlanilha = (file: File): Promise<BatchItem[]> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data: any[] = XLSX.utils.sheet_to_json(ws);

          const extraidos: BatchItem[] = data.map((row, index) => {
            const nomeAluno =
              row.nome || row.aluno || row.candidato || row.id || row.ID || `Candidato ${index + 1}`;
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
          resolve(extraidos);
        } catch {
          resolve([]);
        }
      };
      reader.onerror = () => resolve([]);
      reader.readAsBinaryString(file);
    });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processarArquivosRecebidos(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      await processarArquivosRecebidos(e.dataTransfer.files);
    }
  };

  const handleAdicionarManual = async () => {
    if (!novoTextoManual.trim()) return;
    const novoItem: BatchItem = {
      id: `manual-${Date.now()}`,
      identificadorAluno: novoAlunoManual.trim() || `Redação ${items.length + 1}`,
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

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  const prepararMidiaOtimizada = async (file: File): Promise<{ base64: string; mimeType: string }> => {
    if (!file.type.startsWith('image/') || file.size <= 1.5 * 1024 * 1024) {
      return { base64: await toBase64(file), mimeType: file.type || 'application/pdf' };
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
        if (resp.status === 400 && data.error?.includes('Chave')) {
          setMostrarConfig(true);
        }
        throw new Error(data.error || 'Erro na resposta da API');
      }

      atualizarItemConcluido(item.id, data.resultado, data.tokensUsage);
    } catch (err: any) {
      atualizarStatusItem(item.id, 'erro', err.message);
    }
  };

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
    if (confirm('Limpar todas as redações da lista?')) {
      await limparBancoLote();
      setItems([]);
      setTotalTokens(0);
    }
  };

  const exportarPlanilhaResultados = () => {
    if (items.length === 0) return;

    const rows = items.map((it) => {
      const r = it.resultado;
      return {
        Aluno: it.identificadorAluno,
        Modalidade: it.modalidade === 'handwritten_media' ? 'Manuscrito' : 'Texto',
        Status: it.status,
        Nota_Total: r?.anulada ? 0 : r?.nota_total ?? '',
        Anulada: r?.anulada ? 'SIM' : 'NÃO',
        Motivo_Anulacao: r?.motivo_anulacao || '',
        C1: r?.c1?.pontos ?? '',
        C2: r?.c2?.pontos ?? '',
        C3: r?.c3?.pontos ?? '',
        C4: r?.c4?.pontos ?? '',
        C5: r?.c5?.pontos ?? '',
        Tokens: it.tokensUsage?.totalTokens ?? 0,
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ENEM_2025');
    XLSX.writeFile(wb, `Correcoes_ENEM_${Date.now()}.xlsx`);
  };

  const totalConcluidos = items.filter((i) => i.status === 'concluido').length;
  const totalPendentes = items.filter((i) => i.status === 'pendente').length;
  const totalErros = items.filter((i) => i.status === 'erro').length;

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

  const itensFiltrados = items.filter((it) =>
    it.identificadorAluno.toLowerCase().includes(buscaAluno.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-stone-900 pb-20">
      {/* Input de arquivo oculto unificado */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".xlsx,.xls,.csv,image/*,application/pdf,.txt"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header Minimalista */}
      <header className="bg-white/80 backdrop-blur-md border-b border-stone-200/80 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/mascote.jpg"
              alt="Mascote"
              className="w-10 h-10 rounded-full object-cover border border-stone-200 shadow-2xs"
            />
            <div>
              <h1 className="text-base font-bold tracking-tight text-stone-900 leading-none">
                Redação ENEM
              </h1>
              <span className="text-[11px] text-stone-500 font-medium">
                Grade Oficial 2025
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarConfig(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-700 transition cursor-pointer"
              title="Configurações de API e Modelo"
            >
              <Settings className="w-4 h-4 text-stone-500" />
              <span className="hidden sm:inline">Configurações</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  apiKey ? 'bg-teal-600' : 'bg-amber-400'
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Container Principal Minimalista */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* Barra Única de Tema + Ações Principais (Zero Fricção) */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-1">
                Tema da Redação
              </label>
              <input
                type="text"
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                placeholder="Digite a frase temática..."
                className="w-full text-sm font-medium px-3.5 py-2 rounded-xl border border-stone-200 focus:outline-none focus:border-teal-700 transition"
              />
            </div>

            <div className="flex items-center gap-2 sm:self-end">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 hover:border-stone-300 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-800 transition cursor-pointer"
              >
                <Upload className="w-4 h-4 text-teal-700" />
                Importar Arquivos
              </button>

              <button
                onClick={() => setMostrarModalManual(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-stone-200 hover:border-stone-300 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-700 transition cursor-pointer"
                title="Colar ou digitar texto"
              >
                <Plus className="w-4 h-4 text-stone-500" />
                <span className="hidden md:inline">Texto</span>
              </button>

              {!isProcessing ? (
                <button
                  onClick={startProcessing}
                  disabled={items.length === 0 || (totalPendentes === 0 && totalErros === 0)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2A6F73] hover:bg-[#21585B] disabled:opacity-35 text-white text-xs font-bold transition shadow-2xs cursor-pointer disabled:cursor-not-allowed"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Corrigir {totalPendentes + totalErros > 0 ? `(${totalPendentes + totalErros})` : ''}
                </button>
              ) : (
                <button
                  onClick={stopProcessing}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C96442] hover:bg-[#b05536] text-white text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" />
                  Pausar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Estado Vazio com o Mascote (Dropzone Unificada) */}
        {items.length === 0 ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`bg-white border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition flex flex-col items-center justify-center ${
              isDragging
                ? 'border-teal-600 bg-teal-50/20'
                : 'border-stone-200 hover:border-stone-300'
            }`}
          >
            <img
              src="/mascote.jpg"
              alt="Mascote Corretor"
              className="w-36 h-36 object-contain mb-3 select-none"
            />
            <h2 className="text-base font-bold text-stone-800">
              Solte suas redações aqui ou clique para importar
            </h2>
            <p className="text-xs text-stone-500 mt-1 max-w-md">
              Aceita planilhas (<strong>XLSX, CSV</strong>), fotos de folhas manuscritas (<strong>JPG, PNG, PDF</strong>) ou arquivos <strong>TXT</strong>.
            </p>
          </div>
        ) : (
          /* Lista Minimalista de Redações */
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className="bg-white border border-stone-200/90 rounded-2xl shadow-2xs overflow-hidden"
          >
            {/* Barra de Resumo Compacta */}
            <div className="px-5 py-3.5 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-stone-50/40">
              <div className="flex items-center gap-4 text-xs text-stone-600">
                <span>
                  <strong className="text-stone-900">{totalConcluidos}</strong> de{' '}
                  <strong className="text-stone-900">{items.length}</strong> corrigidas
                </span>
                {totalConcluidos > 0 && (
                  <>
                    <span className="text-stone-300">•</span>
                    <span>
                      Média: <strong className="text-teal-800">{mediaNotas} pts</strong>
                    </span>
                  </>
                )}
                {totalTokens > 0 && (
                  <>
                    <span className="text-stone-300 hidden sm:inline">•</span>
                    <span className="hidden sm:inline text-stone-400">
                      {totalTokens.toLocaleString('pt-BR')} tokens
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {items.length > 3 && (
                  <div className="relative w-44">
                    <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar..."
                      value={buscaAluno}
                      onChange={(e) => setBuscaAluno(e.target.value)}
                      className="w-full text-xs pl-8 pr-2.5 py-1 rounded-lg border border-stone-200 focus:outline-none focus:border-teal-700"
                    />
                  </div>
                )}

                {totalConcluidos > 0 && (
                  <button
                    onClick={exportarPlanilhaResultados}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Exportar XLSX
                  </button>
                )}

                <button
                  onClick={handleLimparLote}
                  title="Limpar lista"
                  className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabela Limpa */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-stone-400 font-semibold border-b border-stone-100 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-5">Candidato</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-2 text-center">C1</th>
                    <th className="py-3 px-2 text-center">C2</th>
                    <th className="py-3 px-2 text-center">C3</th>
                    <th className="py-3 px-2 text-center">C4</th>
                    <th className="py-3 px-2 text-center">C5</th>
                    <th className="py-3 px-4 text-right">Nota</th>
                    <th className="py-3 px-5 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {itensFiltrados.map((item) => {
                    const r = item.resultado;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => r && setSelectedItemForModal(item)}
                        className={`transition ${
                          r ? 'hover:bg-stone-50/90 cursor-pointer' : 'hover:bg-stone-50/40'
                        }`}
                      >
                        <td className="py-3.5 px-5 font-semibold text-stone-900 flex items-center gap-2">
                          {item.modalidade === 'handwritten_media' ? (
                            <ImageIcon className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          )}
                          <span className="truncate max-w-xs">{item.identificadorAluno}</span>
                        </td>
                        <td className="py-3.5 px-3">
                          {item.status === 'pendente' && (
                            <span className="inline-flex items-center gap-1 text-stone-400">
                              <Clock className="w-3 h-3" /> Na fila
                            </span>
                          )}
                          {item.status === 'processando' && (
                            <span className="inline-flex items-center gap-1 text-teal-700 font-medium animate-pulse">
                              <RotateCcw className="w-3 h-3 animate-spin" /> Corrigindo...
                            </span>
                          )}
                          {item.status === 'concluido' && (
                            <span className="inline-flex items-center gap-1 text-teal-700 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Concluída
                            </span>
                          )}
                          {item.status === 'erro' && (
                            <span
                              title={item.erroMensagem}
                              className="inline-flex items-center gap-1 text-red-600 font-medium cursor-help"
                            >
                              <AlertCircle className="w-3.5 h-3.5" /> Erro
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-2 text-center font-mono text-stone-600">
                          {r ? r.c1.pontos : '—'}
                        </td>
                        <td className="py-3.5 px-2 text-center font-mono text-stone-600">
                          {r ? r.c2.pontos : '—'}
                        </td>
                        <td className="py-3.5 px-2 text-center font-mono text-stone-600">
                          {r ? r.c3.pontos : '—'}
                        </td>
                        <td className="py-3.5 px-2 text-center font-mono text-stone-600">
                          {r ? r.c4.pontos : '—'}
                        </td>
                        <td className="py-3.5 px-2 text-center font-mono text-stone-600">
                          {r ? r.c5.pontos : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-sm">
                          {r ? (
                            <span className={r.anulada ? 'text-red-600' : 'text-stone-900'}>
                              {r.anulada ? '0' : r.nota_total}
                            </span>
                          ) : (
                            <span className="text-stone-300">—</span>
                          )}
                        </td>
                        <td
                          className="py-3.5 px-5 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => processarUnicoItem(item)}
                              disabled={item.status === 'processando'}
                              className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg transition cursor-pointer"
                              title="Reprocessar"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoverItem(item.id)}
                              className="p-1.5 text-stone-300 hover:text-red-600 rounded-lg transition cursor-pointer"
                              title="Remover"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Menu Modal de Configurações (API Key, Seletor de Modelo, Concorrência e Textos Motivadores) */}
      {mostrarConfig && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-4 backdrop-blur-xs"
          onClick={() => setMostrarConfig(false)}
        >
          <div
            className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-stone-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img src="/mascote.jpg" alt="" className="w-7 h-7 rounded-full object-cover" />
                <h3 className="font-bold text-sm text-stone-900">Configurações</h3>
              </div>
              <button
                onClick={() => setMostrarConfig(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Chave da Gemini API
                </label>
                <input
                  type="password"
                  placeholder="Cole sua chave AIza..."
                  value={apiKey}
                  onChange={(e) => salvarChave(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:border-teal-700"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  Salva localmente no navegador (opcional se configurada no servidor).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Modelo Gemini
                  </label>
                  <select
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:border-teal-700 cursor-pointer"
                  >
                    <option value="gemini-3.8-flash">gemini-3.8-flash</option>
                    <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite</option>
                    <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite</option>
                    <option value="gemini-3-flash-preview">gemini-3-flash-preview</option>
                    <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Correções simultâneas
                  </label>
                  <select
                    value={concorrencia}
                    onChange={(e) => setConcorrencia(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:border-teal-700 cursor-pointer"
                  >
                    <option value={1}>1 por vez</option>
                    <option value={3}>3 simultâneas</option>
                    <option value={5}>5 simultâneas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Textos Motivadores (opcional, para detector de cópia)
                </label>
                <textarea
                  rows={3}
                  value={textosMotivadores}
                  onChange={(e) => setTextosMotivadores(e.target.value)}
                  placeholder="Cole os textos motivadores da proposta se desejar auditar cópia..."
                  className="w-full p-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setMostrarConfig(false)}
                  className="px-5 py-2 rounded-xl bg-[#2A6F73] hover:bg-[#21585B] text-white font-semibold transition cursor-pointer"
                >
                  Pronto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Texto Avulso */}
      {mostrarModalManual && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-4 backdrop-blur-xs"
          onClick={() => setMostrarModalManual(false)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-stone-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-stone-900">Adicionar Redação em Texto</h3>
              <button
                onClick={() => setMostrarModalManual(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <input
                type="text"
                value={novoAlunoManual}
                onChange={(e) => setNovoAlunoManual(e.target.value)}
                placeholder="Nome do aluno (opcional)"
                className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:border-teal-700"
              />
              <textarea
                rows={8}
                value={novoTextoManual}
                onChange={(e) => setNovoTextoManual(e.target.value)}
                placeholder="Cole o texto da redação aqui..."
                className="w-full p-3 border border-stone-200 rounded-xl focus:outline-none focus:border-teal-700"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setMostrarModalManual(false)}
                  className="px-4 py-2 text-stone-500 hover:bg-stone-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAdicionarManual}
                  disabled={!novoTextoManual.trim()}
                  className="px-5 py-2 bg-[#2A6F73] hover:bg-[#21585B] disabled:opacity-40 text-white font-semibold rounded-xl cursor-pointer"
                >
                  Adicionar
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
