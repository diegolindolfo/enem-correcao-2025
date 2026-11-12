'use client';

import React from 'react';
import { GradingResult } from '@/lib/enem-rubric-types';
import {
  X,
  Printer,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  BookOpen,
  Link2,
  FileText,
  Award,
  Check,
  XCircle,
} from 'lucide-react';

interface Props {
  resultado: GradingResult;
  alunoNome: string;
  textoOriginal?: string;
  imagemUrl?: string;
  onClose: () => void;
}

export default function StudentScoreModal({
  resultado,
  alunoNome,
  textoOriginal,
  imagemUrl,
  onClose,
}: Props) {
  const imprimirEspelho = () => {
    window.print();
  };

  const c = resultado;
  const ev = c.evidencias_auditadas;

  // Paleta oficial inspirada na Grade Específica do ENEM 2025
  const competenciasConfig = [
    {
      id: 'C1',
      titulo: 'Competência I',
      subtitulo: 'Domínio da modalidade escrita formal da língua portuguesa',
      item: c.c1,
      corBarra: 'bg-fuchsia-700',
      corBadge: 'bg-fuchsia-50 text-fuchsia-900 border-fuchsia-200',
      corBorda: 'border-l-fuchsia-700',
    },
    {
      id: 'C2',
      titulo: 'Competência II',
      subtitulo: 'Compreensão da proposta, tipo textual e repertório sociocultural',
      item: c.c2,
      corBarra: 'bg-rose-700',
      corBadge: 'bg-rose-50 text-rose-900 border-rose-200',
      corBorda: 'border-l-rose-700',
    },
    {
      id: 'C3',
      titulo: 'Competência III',
      subtitulo: 'Projeto de texto, seleção e organização de informações e argumentos',
      item: c.c3,
      corBarra: 'bg-sky-700',
      corBadge: 'bg-sky-50 text-sky-900 border-sky-200',
      corBorda: 'border-l-sky-700',
    },
    {
      id: 'C4',
      titulo: 'Competência IV',
      subtitulo: 'Conhecimento dos mecanismos linguísticos de coesão e articulação',
      item: c.c4,
      corBarra: 'bg-amber-600',
      corBadge: 'bg-amber-50 text-amber-900 border-amber-200',
      corBorda: 'border-l-amber-600',
    },
    {
      id: 'C5',
      titulo: 'Competência V',
      subtitulo: 'Proposta de intervenção para o problema abordado (5 elementos)',
      item: c.c5,
      corBarra: 'bg-emerald-700',
      corBadge: 'bg-emerald-50 text-emerald-900 border-emerald-200',
      corBorda: 'border-l-emerald-700',
    },
  ];

  const totalDesviosC1 = (c.desvios_c1_validados?.length || 0) + (ev?.falhas_sintaticas?.length || 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden my-auto border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Action Bar */}
        <div className="bg-white text-stone-900 px-6 py-4 flex items-center justify-between print:hidden border-b border-stone-200">
          <div className="flex items-center gap-3">
            <img
              src="/mascote.jpg"
              alt="Mascote"
              className="w-10 h-10 rounded-xl object-cover border border-stone-200 shadow-xs"
            />
            <div>
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-stone-900">
                Espelho de Avaliação — ENEM
              </h2>
              <p className="text-xs text-stone-500">
                <span className="text-stone-800 font-semibold">{alunoNome}</span>
                {typeof ev?.total_linhas_manuscritas === 'number' && ev.total_linhas_manuscritas > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-stone-100 rounded text-stone-600 font-medium">
                    {ev.total_linhas_manuscritas} linhas manuscritas
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={imprimirEspelho}
              className="flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-xs font-bold rounded-xl text-white transition cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              Imprimir / PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-stone-100 rounded-xl text-stone-500 hover:text-stone-900 transition cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo Principal Rolável */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[86vh] overflow-y-auto print:max-h-none print:overflow-visible text-slate-900">
          {/* Banner Superior do Aluno + Nota Global */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50 border border-slate-200/90 rounded-2xl p-5 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold tracking-widest text-indigo-700 uppercase bg-indigo-100/80 px-2.5 py-0.5 rounded-md">
                  Boletim Individual Auditado
                </span>
                {c.copia_percentual !== undefined && c.copia_percentual > 0 && (
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                    {c.copia_percentual}% similaridade com motivadores
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black text-slate-950 tracking-tight">{alunoNome}</h1>
              <p className="text-xs text-slate-500 font-mono">Registro: {c.redacao_id}</p>
            </div>

            <div className="flex items-center gap-4 bg-white px-5 py-3.5 rounded-xl border-2 border-slate-200 shadow-xs self-stretch sm:self-auto justify-between">
              <div className="text-left sm:text-right">
                <div className="text-[11px] uppercase font-extrabold tracking-wider text-slate-500 flex items-center gap-1 sm:justify-end">
                  <Award className="w-3.5 h-3.5 text-indigo-600" /> Nota Final
                </div>
                <div className="text-[11px] text-slate-400 font-medium">Escala Oficial 0–1000</div>
              </div>
              <div
                className={`text-4xl font-black tracking-tight ${
                  c.anulada
                    ? 'text-red-600'
                    : c.nota_total >= 900
                    ? 'text-emerald-600'
                    : c.nota_total >= 700
                    ? 'text-indigo-700'
                    : 'text-slate-900'
                }`}
              >
                {c.anulada ? '0' : c.nota_total}
              </div>
            </div>
          </div>

          {/* Alerta de Anulação se houver */}
          {c.anulada && (
            <div className="p-4 bg-red-50 border-2 border-red-200 border-l-8 border-l-red-600 rounded-xl flex items-start gap-3.5">
              <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-black text-red-950 text-sm uppercase tracking-wide">
                  Redação Anulada — Nota Zero Geral
                </h3>
                <p className="text-sm text-red-800 mt-0.5">
                  <strong>Critério Hierárquico Acionado:</strong> {c.motivo_anulacao}
                </p>
                <p className="text-xs text-red-700 mt-1">{c.justificativa_anulacao}</p>
              </div>
            </div>
          )}

          {/* Grade das 5 Competências com as Cores Oficiais do ENEM 2025 */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Desempenho por Competência (Matriz de Referência 2025)
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {competenciasConfig.map((comp) => {
                const percentual = Math.min(100, Math.round((comp.item.pontos / 200) * 100));
                return (
                  <div
                    key={comp.id}
                    className={`bg-white border border-slate-200 border-l-4 ${comp.corBorda} rounded-xl p-4 shadow-2xs hover:border-slate-300 transition`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-extrabold px-2 py-0.5 rounded border ${comp.corBadge}`}>
                            {comp.id}
                          </span>
                          <span className="font-extrabold text-slate-950 text-sm">{comp.titulo}</span>
                          <span className="text-xs text-slate-500 hidden md:inline">— {comp.subtitulo}</span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium pt-1">
                          {comp.item.justificativa_oficial}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <span className="px-2.5 py-1 text-xs font-extrabold rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                          Nível {comp.item.nivel}
                        </span>
                        <div className="w-24 text-right">
                          <span className="text-xl font-black text-slate-950">{comp.item.pontos}</span>
                          <span className="text-xs text-slate-400 font-semibold"> / 200</span>
                        </div>
                      </div>
                    </div>

                    {/* Barra visual de nível */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3">
                      <div
                        className={`h-full ${comp.corBarra} transition-all duration-500`}
                        style={{ width: `${percentual}%` }}
                      />
                    </div>

                    {/* Travas acionadas se houver */}
                    {comp.item.travas_acionadas.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {comp.item.travas_acionadas.map((t, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-lg"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Painel Detalhado de Evidências Auditadas (C1, C2/C4 e C5) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Bloco C1: Desvios e Estrutura Sintática */}
            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-700" />
                    Auditoria Gramatical e Sintática (C1)
                  </h4>
                  <span className="text-xs font-bold px-2.5 py-0.5 bg-white border border-slate-200 rounded-lg text-slate-800">
                    {totalDesviosC1} registro(s)
                  </span>
                </div>

                {totalDesviosC1 === 0 ? (
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    Excelência formal: nenhum desvio gramatical ou falha sintática validado no texto.
                  </div>
                ) : (
                  <ul className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
                    {ev?.falhas_sintaticas?.map((f, i) => (
                      <li
                        key={`sint-${i}`}
                        className="p-2.5 bg-amber-50/90 rounded-xl border border-amber-200 flex flex-col gap-0.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-950">"{f.trecho_original}"</span>
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 bg-amber-200/70 text-amber-900 rounded">
                            Falha sintática • {f.tipo}
                          </span>
                        </div>
                        {f.explicacao_curta && <span className="text-amber-800">{f.explicacao_curta}</span>}
                      </li>
                    ))}
                    {c.desvios_c1_validados?.map((d, i) => (
                      <li
                        key={`desv-${i}`}
                        className="p-2.5 bg-white rounded-xl border border-slate-200 flex flex-col gap-0.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                            "{d.trecho_original}"
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                            {d.tipo}
                          </span>
                        </div>
                        <span className="text-slate-600 mt-1">
                          {d.forma_correta && (
                            <span className="font-semibold text-emerald-700 mr-1">→ {d.forma_correta}.</span>
                          )}
                          {d.explicacao_curta}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Resumo Coesivo C4 + Repertório C2 */}
              <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-bold flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-amber-600" /> Conectivos Interparágrafos (C4):
                  </span>
                  <span className="font-extrabold text-slate-900">
                    {ev?.conectivos_interparagrafos_contagem ?? 0} identificado(s)
                  </span>
                </div>

                {ev?.repertorios && ev.repertorios.length > 0 && (
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-rose-700" /> Repertório Sociocultural (C2):
                    </div>
                    {ev.repertorios.map((rep, idx) => (
                      <div key={idx} className="text-[11px] text-slate-600 flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="font-semibold text-slate-800">"{rep.trecho_citado}"</span>
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                          {rep.fonte_ou_area}
                        </span>
                        {rep.uso_produtivo && (
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">
                            Uso Produtivo
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bloco C5: Checklist dos 5 Elementos da Proposta de Intervenção */}
            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/60">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-700" />
                  5 Elementos da Proposta de Intervenção (C5)
                </h4>
                <span className="text-xs font-bold px-2.5 py-0.5 bg-white border border-slate-200 rounded-lg text-slate-800">
                  {c.c5.nivel} / 5 válidos
                </span>
              </div>

              {ev?.proposta_intervencao ? (
                <div className="space-y-2 text-xs">
                  {[
                    { label: '1. Agente (Quem?)', data: ev.proposta_intervencao.agente },
                    { label: '2. Ação (O que fará?)', data: ev.proposta_intervencao.acao },
                    { label: '3. Meio / Modo (Como?)', data: ev.proposta_intervencao.meio_modo },
                    { label: '4. Efeito (Para quê?)', data: ev.proposta_intervencao.efeito },
                    { label: '5. Detalhamento', data: ev.proposta_intervencao.detalhamento },
                  ].map((elem, i) => {
                    const isValido = Boolean(elem.data?.valido);
                    return (
                      <div
                        key={i}
                        className={`p-2.5 rounded-xl border flex items-start justify-between gap-3 ${
                          isValido
                            ? 'bg-white border-slate-200 shadow-2xs'
                            : 'bg-rose-50/50 border-rose-200'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="font-extrabold text-slate-900">{elem.label}</div>
                          <div className="text-slate-600 leading-snug">
                            {elem.data?.trecho ? `"${elem.data.trecho}"` : '(Não identificado no texto)'}
                          </div>
                          {(elem.data as any)?.nulo_motivo && (
                            <div className="text-[11px] text-rose-700 font-semibold">
                              Motivo: {(elem.data as any).nulo_motivo}
                            </div>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-md shrink-0 ${
                            isValido
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                              : 'bg-rose-100 text-rose-900 border border-rose-200'
                          }`}
                        >
                          {isValido ? <Check className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {isValido ? 'Válido' : 'Ausente'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Sem dados estruturados de proposta de intervenção.</p>
              )}
            </div>
          </div>

          {/* Seção do Texto / Folha Manuscrita (Lado a Lado quando houver imagem + transcrição) */}
          {(textoOriginal || imagemUrl) && (
            <div
              className={`grid grid-cols-1 ${
                textoOriginal && imagemUrl ? 'lg:grid-cols-2' : ''
              } gap-5 pt-2`}
            >
              {textoOriginal && (
                <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/70">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-700" />
                      {imagemUrl ? 'Transcrição Fiel da Folha Manuscrita' : 'Texto Integral da Redação'}
                    </h4>
                    {imagemUrl && (
                      <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        Transcrição automática — confira a grafia na folha ao lado
                      </span>
                    )}
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed text-slate-800 max-h-96 overflow-y-auto print:max-h-none">
                    {textoOriginal}
                  </div>
                </div>
              )}

              {imagemUrl && (
                <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/70">
                  <h4 className="font-extrabold text-slate-900 text-sm mb-3">
                    Digitalização da Folha Manuscrita
                  </h4>
                  <div className="bg-white p-2 rounded-xl border border-slate-200 max-h-96 overflow-y-auto flex justify-center">
                    <img
                      src={imagemUrl}
                      alt="Folha Manuscrita"
                      className="max-h-88 w-auto rounded object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
