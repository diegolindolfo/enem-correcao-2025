'use client';

import React, { useEffect, useState } from 'react';
import { CompetenciaScore, GradingResult } from '@/lib/enem-rubric-types';
import { separarParagrafosTexto } from '@/lib/anti-hallucination-validator';
import {
  X,
  Printer,
  ChevronDown,
  Check,
  Minus,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  Download,
} from 'lucide-react';

interface Props {
  resultado: GradingResult;
  alunoNome: string;
  textoOriginal?: string;
  imagemUrl?: string;
  onClose: () => void;
}

type CompId = 'c1' | 'c2' | 'c3' | 'c4' | 'c5';

const COMPETENCIAS: { id: CompId; sigla: string; titulo: string; cor: string }[] = [
  { id: 'c1', sigla: 'C1', titulo: 'Norma culta', cor: 'bg-fuchsia-600' },
  { id: 'c2', sigla: 'C2', titulo: 'Tema e repertório', cor: 'bg-rose-600' },
  { id: 'c3', sigla: 'C3', titulo: 'Argumentação', cor: 'bg-sky-600' },
  { id: 'c4', sigla: 'C4', titulo: 'Coesão', cor: 'bg-amber-500' },
  { id: 'c5', sigla: 'C5', titulo: 'Proposta de intervenção', cor: 'bg-emerald-600' },
];

const TIPO_DESVIO: Record<string, string> = {
  gramatical: 'Gramática',
  ortografia: 'Ortografia',
  pontuacao: 'Pontuação',
  escolha_vocabular: 'Vocabulário',
  convencoes_escrita: 'Convenções',
  truncamento: 'Truncamento',
  justaposicao: 'Justaposição',
  outro: 'Estrutura',
};

export default function StudentScoreModal({
  resultado,
  alunoNome,
  textoOriginal,
  imagemUrl,
  onClose,
}: Props) {
  const c = resultado;
  const ev = c.evidencias_auditadas;

  // Abre por padrão apenas as competências que perderam pontos
  const [abertas, setAbertas] = useState<Set<CompId>>(
    () => new Set(COMPETENCIAS.filter((comp) => c[comp.id].pontos < 200).map((comp) => comp.id))
  );
  const [abaTexto, setAbaTexto] = useState<'transcricao' | 'folha'>('transcricao');

  // O Chrome bloqueia PDF em iframe com src "data:"; convertemos para blob: URL
  const [arquivoUrl, setArquivoUrl] = useState<string | undefined>(imagemUrl);
  useEffect(() => {
    if (!imagemUrl || !imagemUrl.startsWith('data:')) {
      setArquivoUrl(imagemUrl);
      return;
    }
    let url: string | undefined;
    try {
      const [cabecalho, base64] = imagemUrl.split(',');
      const mime = cabecalho.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      url = URL.createObjectURL(new Blob([bytes], { type: mime }));
      setArquivoUrl(url);
    } catch {
      setArquivoUrl(imagemUrl);
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [imagemUrl]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const alternar = (id: CompId) =>
    setAbertas((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const paragrafos = textoOriginal ? separarParagrafosTexto(textoOriginal, ev?.eh_monobloco) : [];
  const isPdf = Boolean(
    imagemUrl && (imagemUrl.startsWith('data:application/pdf') || imagemUrl.toLowerCase().endsWith('.pdf'))
  );
  const nota = c.anulada ? 0 : c.nota_total;
  const corNota = c.anulada
    ? 'text-red-600'
    : nota >= 900
    ? 'text-teal-700'
    : nota >= 600
    ? 'text-stone-900'
    : 'text-amber-700';

  const falhas = ev?.falhas_sintaticas || [];
  const desvios = c.desvios_c1_validados || [];
  const proposta = ev?.proposta_intervencao;

  // ---------- Conteúdo de cada competência ----------
  const renderDetalhe = (id: CompId) => {
    switch (id) {
      case 'c1':
        if (falhas.length === 0 && desvios.length === 0) {
          return <Vazio texto="Nenhum desvio encontrado." />;
        }
        return (
          <ul className="divide-y divide-stone-100">
            {falhas.map((f, i) => (
              <li key={`f-${i}`} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-stone-800">“{f.trecho_original}”</span>
                  <Etiqueta texto={`Sintaxe · ${TIPO_DESVIO[f.tipo] || f.tipo}`} tom="amber" />
                </div>
                {f.explicacao_curta && <p className="text-stone-500 mt-1">{f.explicacao_curta}</p>}
              </li>
            ))}
            {desvios.map((d, i) => (
              <li key={`d-${i}`} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <span className="text-rose-700 line-through decoration-rose-300">{d.trecho_original}</span>
                    {d.forma_correta && (
                      <>
                        <ArrowRight className="w-3 h-3 text-stone-400 shrink-0" />
                        <span className="text-teal-800 font-medium">{d.forma_correta}</span>
                      </>
                    )}
                  </span>
                  <Etiqueta texto={TIPO_DESVIO[d.tipo] || d.tipo} />
                </div>
                {d.explicacao_curta && <p className="text-stone-500 mt-1">{d.explicacao_curta}</p>}
              </li>
            ))}
          </ul>
        );

      case 'c2': {
        const reps = ev?.repertorios || [];
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              <Fato
                ok={ev?.abordagem_tema === 'completa'}
                texto={
                  ev?.abordagem_tema === 'completa'
                    ? 'Tema abordado por completo'
                    : ev?.abordagem_tema === 'tangencia'
                    ? 'Tangenciou o tema'
                    : 'Fuga ao tema'
                }
              />
              <Fato ok={ev?.tipo_textual === 'dissertativo_argumentativo'} texto="Dissertativo-argumentativo" />
              <Fato ok={(ev?.qtd_partes_texto ?? 0) >= 3} texto={`${ev?.qtd_partes_texto ?? 0} partes do texto`} />
            </div>
            {reps.length === 0 ? (
              <Vazio texto="Nenhum repertório identificado." />
            ) : (
              <ul className="divide-y divide-stone-100">
                {reps.map((rep, i) => {
                  const status = !rep.legitimado
                    ? { t: 'Não legitimado', tom: 'amber' as const }
                    : !rep.pertinente
                    ? { t: 'Não pertinente', tom: 'amber' as const }
                    : rep.uso_produtivo
                    ? { t: 'Produtivo', tom: 'teal' as const }
                    : { t: 'Não produtivo', tom: 'stone' as const };
                  return (
                    <li key={i} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-stone-800 line-clamp-2">“{rep.trecho_citado}”</p>
                        <p className="text-stone-400 mt-0.5">{rep.fonte_ou_area}</p>
                      </div>
                      <Etiqueta texto={status.t} tom={status.tom} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      }

      case 'c3':
        return (
          <div className="space-y-2">
            <p className="text-stone-600">{c.c3.justificativa_oficial}</p>
            {ev?.possui_contradicao_grave && ev.contradicao_trecho && (
              <p className="text-amber-800">Contradição: “{ev.contradicao_trecho}”</p>
            )}
          </div>
        );

      case 'c4': {
        const inad = ev?.inadequacoes_coesivas || [];
        const reps = ev?.repeticoes_excessivas_palavras || [];
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              <Fato
                ok={(ev?.conectivos_interparagrafos_contagem ?? 0) >= 3}
                texto={`${ev?.conectivos_interparagrafos_contagem ?? 0} conectivos entre parágrafos`}
              />
              <Fato ok={inad.length === 0} texto={inad.length === 0 ? 'Sem inadequações' : `${inad.length} inadequação(ões)`} />
              <Fato ok={reps.length === 0} texto={reps.length === 0 ? 'Sem repetições excessivas' : `${reps.length} repetição(ões)`} />
            </div>
            {inad.length > 0 && (
              <ul className="divide-y divide-stone-100">
                {inad.map((it, i) => (
                  <li key={i} className="py-2 first:pt-0 last:pb-0">
                    <span className="text-stone-800 font-medium">“{it.conectivo}”</span>
                    <span className="text-stone-500"> — {it.explicacao}</span>
                  </li>
                ))}
              </ul>
            )}
            {reps.length > 0 && (
              <p className="text-stone-600">
                <span className="text-stone-400">Repetições: </span>
                {reps.join(', ')}
              </p>
            )}
          </div>
        );
      }

      case 'c5': {
        if (!proposta) return <Vazio texto="Proposta de intervenção não identificada." />;
        const elementos = [
          { label: 'Agente', data: proposta.agente },
          { label: 'Ação', data: proposta.acao },
          { label: 'Meio / modo', data: proposta.meio_modo },
          { label: 'Efeito', data: proposta.efeito },
          { label: 'Detalhamento', data: proposta.detalhamento },
        ];
        return (
          <ul className="divide-y divide-stone-100">
            {elementos.map((el, i) => {
              const ok = Boolean(el.data?.valido);
              return (
                <li key={i} className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-3">
                  <span
                    className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                      ok ? 'bg-teal-600 text-white' : 'bg-stone-200 text-stone-500'
                    }`}
                  >
                    {ok ? <Check className="w-2.5 h-2.5" strokeWidth={3} /> : <Minus className="w-2.5 h-2.5" strokeWidth={3} />}
                  </span>
                  <div className="min-w-0">
                    <p className={`font-medium ${ok ? 'text-stone-800' : 'text-stone-400'}`}>{el.label}</p>
                    <p className={ok ? 'text-stone-500' : 'text-stone-400 italic'}>
                      {el.data?.trecho && ok ? `“${el.data.trecho}”` : 'Ausente ou inválido'}
                    </p>
                    {(el.data as any)?.nulo_motivo && (
                      <p className="text-amber-700 mt-0.5">{(el.data as any).nulo_motivo}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        );
      }
    }
  };

  const resumoComp = (id: CompId, item: CompetenciaScore): string => {
    switch (id) {
      case 'c1':
        return falhas.length + desvios.length === 0
          ? 'Sem desvios'
          : `${desvios.length} desvio(s)${falhas.length ? ` · ${falhas.length} falha(s) sintática(s)` : ''}`;
      case 'c2':
        return `${(ev?.repertorios || []).filter((r) => r.legitimado && r.pertinente && r.uso_produtivo).length} repertório(s) produtivo(s)`;
      case 'c3':
        return item.pontos === 200 ? 'Projeto de texto estratégico' : 'Projeto de texto com falhas';
      case 'c4':
        return `${ev?.conectivos_interparagrafos_contagem ?? 0} conectivo(s) entre parágrafos`;
      case 'c5': {
        const p = proposta;
        const n = p ? [p.agente, p.acao, p.meio_modo, p.efeito, p.detalhamento].filter((e) => e?.valido).length : 0;
        return `${n} de 5 elementos`;
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-stone-950/50 p-0 sm:p-6 backdrop-blur-xs overflow-y-auto print:static print:bg-white print:p-0"
      onClick={onClose}
    >
      <div
        className="bg-[#FAF9F6] w-full max-w-3xl sm:rounded-2xl shadow-2xl overflow-hidden my-auto print:shadow-none print:max-w-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="bg-white px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3 border-b border-stone-200/80 sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/mascote.jpg" alt="" className="w-8 h-8 rounded-full object-cover border border-stone-200 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-stone-900 truncate">{alunoNome}</h2>
              <p className="text-[11px] text-stone-500">
                Espelho de avaliação
                {typeof ev?.total_linhas_manuscritas === 'number' && ev.total_linhas_manuscritas > 0 && (
                  <> · {ev.total_linhas_manuscritas} linhas</>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
              title="Imprimir ou salvar em PDF"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[calc(100vh-4rem)] sm:max-h-[82vh] overflow-y-auto print:max-h-none print:overflow-visible">
          {/* Nota final + barra das 5 competências */}
          <section className="bg-white rounded-2xl border border-stone-200/80 p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Nota final</p>
                <p className={`text-5xl font-black tracking-tight leading-none mt-1 ${corNota}`}>
                  {nota}
                  <span className="text-base font-semibold text-stone-300 ml-1">/1000</span>
                </p>
              </div>
              {c.copia_percentual !== undefined && c.copia_percentual > 0 && (
                <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                  {c.copia_percentual}% similar aos motivadores
                </span>
              )}
            </div>

            <div className="grid grid-cols-5 gap-2 mt-5">
              {COMPETENCIAS.map((comp) => {
                const pts = c[comp.id].pontos;
                return (
                  <button
                    key={comp.id}
                    onClick={() => {
                      setAbertas((prev) => new Set(prev).add(comp.id));
                      document.getElementById(`comp-${comp.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="text-left group cursor-pointer"
                  >
                    <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                      <div className={`h-full ${comp.cor}`} style={{ width: `${(pts / 200) * 100}%` }} />
                    </div>
                    <div className="mt-1.5 flex items-baseline justify-between">
                      <span className="text-[11px] font-semibold text-stone-400 group-hover:text-stone-700">{comp.sigla}</span>
                      <span className={`text-sm font-bold tabular-nums ${pts < 200 ? 'text-amber-700' : 'text-stone-800'}`}>{pts}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Anulação */}
          {c.anulada && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-red-900">Redação anulada</p>
                <p className="text-red-800 text-xs mt-0.5">
                  {c.motivo_anulacao?.replace(/_/g, ' ').toLowerCase()}
                  {c.justificativa_anulacao && ` — ${c.justificativa_anulacao}`}
                </p>
              </div>
            </section>
          )}

          {/* Competências (acordeão) */}
          <section className="bg-white rounded-2xl border border-stone-200/80 divide-y divide-stone-100 overflow-hidden">
            {COMPETENCIAS.map((comp) => {
              const item = c[comp.id];
              const aberta = abertas.has(comp.id);
              const perdeu = 200 - item.pontos;
              return (
                <div key={comp.id} id={`comp-${comp.id}`} className="scroll-mt-20">
                  <button
                    onClick={() => alternar(comp.id)}
                    className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-stone-50/70 transition cursor-pointer"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${comp.cor}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-900">
                        <span className="text-stone-400 font-medium mr-1.5">{comp.sigla}</span>
                        {comp.titulo}
                      </p>
                      <p className="text-xs text-stone-500 truncate">{resumoComp(comp.id, item)}</p>
                    </div>
                    {perdeu > 0 && (
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md shrink-0">
                        −{perdeu}
                      </span>
                    )}
                    <span className="text-sm font-bold tabular-nums text-stone-900 w-9 text-right shrink-0">{item.pontos}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-stone-400 shrink-0 transition-transform print:hidden ${aberta ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <div className={`${aberta ? 'block' : 'hidden'} print:block px-5 pb-4 pl-10 text-xs leading-relaxed`}>
                    {item.travas_acionadas.length > 0 && (
                      <div className="mb-3 space-y-1">
                        {item.travas_acionadas.map((t, i) => (
                          <p key={i} className="flex items-start gap-1.5 text-amber-800">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                            {t}
                          </p>
                        ))}
                      </div>
                    )}
                    {renderDetalhe(comp.id)}
                  </div>
                </div>
              );
            })}
          </section>

          {/* Texto da redação */}
          {(paragrafos.length > 0 || imagemUrl) && (
            <section className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-stone-100">
                {paragrafos.length > 0 && imagemUrl ? (
                  <div className="inline-flex p-0.5 bg-stone-100 rounded-lg text-xs font-semibold print:hidden">
                    {(['transcricao', 'folha'] as const).map((aba) => (
                      <button
                        key={aba}
                        onClick={() => setAbaTexto(aba)}
                        className={`px-3 py-1 rounded-md transition cursor-pointer ${
                          abaTexto === aba ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500 hover:text-stone-800'
                        }`}
                      >
                        {aba === 'transcricao' ? 'Transcrição' : 'Folha original'}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-stone-900">
                    {imagemUrl ? 'Folha original' : 'Texto da redação'}
                  </p>
                )}
                <div className="flex items-center gap-3 text-[11px] text-stone-400">
                  {abaTexto === 'transcricao' && paragrafos.length > 0 && <span>{paragrafos.length} parágrafos</span>}
                  {imagemUrl && (
                    <a
                      href={arquivoUrl}
                      download={`${alunoNome}.${isPdf ? 'pdf' : 'jpg'}`}
                      className="inline-flex items-center gap-1 font-semibold text-stone-500 hover:text-stone-900 print:hidden"
                    >
                      <Download className="w-3.5 h-3.5" /> Baixar
                    </a>
                  )}
                </div>
              </div>

              {abaTexto === 'transcricao' && paragrafos.length > 0 ? (
                <div className="px-5 sm:px-8 py-5 space-y-3.5 text-[13px] leading-7 text-stone-800 font-serif">
                  {paragrafos.map((p, i) => (
                    <p key={i} className="indent-6 relative">
                      <span className="absolute -left-5 sm:-left-6 top-0 text-[10px] font-sans font-semibold text-stone-300 select-none indent-0">
                        {i + 1}
                      </span>
                      {p}
                    </p>
                  ))}
                  {imagemUrl && (
                    <p className="pt-2 text-[11px] font-sans text-stone-400">
                      Transcrição automática — confira a grafia na folha original.
                    </p>
                  )}
                </div>
              ) : imagemUrl ? (
                <div className="bg-stone-50 p-3 flex justify-center">
                  {isPdf ? (
                    <iframe
                      src={arquivoUrl ? `${arquivoUrl}#toolbar=0&view=FitH` : undefined}
                      title="Folha original"
                      className="w-full h-[40rem] rounded-lg border-0 bg-white"
                    />
                  ) : (
                    <img src={arquivoUrl} alt="Folha original" className="w-full h-auto rounded-lg object-contain" />
                  )}
                </div>
              ) : null}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Componentes auxiliares ----------
function Etiqueta({ texto, tom = 'stone' }: { texto: string; tom?: 'stone' | 'amber' | 'teal' }) {
  const cores = {
    stone: 'bg-stone-100 text-stone-500',
    amber: 'bg-amber-50 text-amber-800',
    teal: 'bg-teal-50 text-teal-800',
  };
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap ${cores[tom]}`}>
      {texto}
    </span>
  );
}

function Fato({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
        ok ? 'bg-teal-50 text-teal-800' : 'bg-amber-50 text-amber-800'
      }`}
    >
      {ok ? <Check className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
      {texto}
    </span>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <p className="flex items-center gap-1.5 text-teal-800">
      <Check className="w-3.5 h-3.5" /> {texto}
    </p>
  );
}
