'use client';

import React from 'react';
import { GradingResult } from '@/lib/enem-rubric-types';
import { X, Printer, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

interface Props {
  resultado: GradingResult;
  alunoNome: string;
  textoOriginal?: string;
  imagemUrl?: string;
  onClose: () => void;
}

export default function StudentScoreModal({ resultado, alunoNome, textoOriginal, imagemUrl, onClose }: Props) {
  const imprimirEspelho = () => {
    window.print();
  };

  const c = resultado;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-8 border border-slate-200">
        {/* Barra de título */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Espelho Oficial de Avaliação — ENEM 2025
            </h2>
            <p className="text-xs text-slate-400">Aluno / Código: {alunoNome}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={imprimirEspelho}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sm font-medium rounded-lg text-slate-200 border border-slate-700 transition"
            >
              <Printer className="w-4 h-4" />
              Imprimir / PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo do Espelho */}
        <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto print:max-h-none print:overflow-visible text-slate-800">
          {/* Cabeçalho do Aluno e Placar Geral */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-5 gap-4">
            <div>
              <span className="text-xs font-semibold tracking-wider text-indigo-600 uppercase">
                Exame Nacional do Ensino Médio
              </span>
              <h1 className="text-2xl font-black text-slate-900">{alunoNome}</h1>
              <p className="text-xs text-slate-500">ID da Correção: {c.redacao_id}</p>
            </div>

            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-right">
                <div className="text-xs uppercase font-bold text-slate-500">Nota Final</div>
                <div className="text-xs text-slate-400">Escala 0 a 1000</div>
              </div>
              <div
                className={`text-4xl font-extrabold ${
                  c.anulada ? 'text-red-600' : c.nota_total >= 800 ? 'text-emerald-600' : 'text-slate-900'
                }`}
              >
                {c.anulada ? '0' : c.nota_total}
              </div>
            </div>
          </div>

          {/* Alerta de Anulação se houver */}
          {c.anulada && (
            <div className="p-4 bg-red-50 border-l-4 border-red-600 rounded-r-xl flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-900">REDAÇÃO ANULADA (NOTA ZERO GERAL)</h3>
                <p className="text-sm text-red-700 mt-0.5">
                  <strong>Critério Hierárquico:</strong> {c.motivo_anulacao}
                </p>
                <p className="text-xs text-red-600 mt-1">{c.justificativa_anulacao}</p>
              </div>
            </div>
          )}

          {/* Tabela de Competências C1 a C5 */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Competência</th>
                  <th className="py-3 px-4 w-24 text-center">Nível</th>
                  <th className="py-3 px-4 w-28 text-right">Pontos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {[
                  { id: 'C1', nome: 'Domínio da Norma-Padrão e Sintaxe', item: c.c1 },
                  { id: 'C2', nome: 'Compreensão do Tema e Repertório', item: c.c2 },
                  { id: 'C3', nome: 'Projeto de Texto e Argumentação', item: c.c3 },
                  { id: 'C4', nome: 'Coesão e Operadores Argumentativos', item: c.c4 },
                  { id: 'C5', nome: 'Proposta de Intervenção Social', item: c.c5 },
                ].map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">
                        {row.id} — {row.nome}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">{row.item.justificativa_oficial}</div>
                      {row.item.travas_acionadas.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {row.item.travas_acionadas.map((t, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full"
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-800">
                        Nível {row.item.nivel}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-base text-slate-900">
                      {row.item.pontos} <span className="text-xs text-slate-400 font-normal">/ 200</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Seção de Evidências Factuais Extraídas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* C1: Desvios e Falhas Sintáticas Validados */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center justify-between">
                <span>Desvios e Estrutura Sintática (C1)</span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-200 rounded-md">
                  {(c.desvios_c1_validados?.length || 0) + (c.evidencias_auditadas?.falhas_sintaticas?.length || 0)} apontamento(s)
                </span>
              </h4>
              {(!c.desvios_c1_validados || c.desvios_c1_validados.length === 0) &&
              (!c.evidencias_auditadas?.falhas_sintaticas || c.evidencias_auditadas.falhas_sintaticas.length === 0) ? (
                <p className="text-xs text-emerald-700 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Nenhum desvio gramatical ou falha sintática registrado.
                </p>
              ) : (
                <ul className="space-y-1.5 max-h-40 overflow-y-auto text-xs pr-1">
                  {c.evidencias_auditadas?.falhas_sintaticas?.map((f, i) => (
                    <li key={`sint-${i}`} className="p-1.5 bg-amber-50 rounded border border-amber-200">
                      <span className="font-semibold text-amber-800">"{f.trecho_original}"</span>
                      <span className="text-amber-700 ml-1.5">(Falha sintática: {f.tipo})</span>
                      {f.explicacao_curta ? `: ${f.explicacao_curta}` : ''}
                    </li>
                  ))}
                  {c.desvios_c1_validados?.map((d, i) => (
                    <li key={`desv-${i}`} className="p-1.5 bg-white rounded border border-slate-200">
                      <span className="font-semibold text-red-600">"{d.trecho_original}"</span>
                      <span className="text-slate-500 ml-1.5">({d.tipo})</span>: {d.explicacao_curta}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* C5: Os 5 Elementos da Intervenção */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <h4 className="font-bold text-slate-900 text-sm mb-2">
                Elementos da Proposta de Intervenção (C5)
              </h4>
              {c.evidencias_auditadas?.proposta_intervencao ? (
                <div className="space-y-1.5 text-xs">
                  {[
                    { label: 'Agente', data: c.evidencias_auditadas.proposta_intervencao.agente },
                    { label: 'Ação', data: c.evidencias_auditadas.proposta_intervencao.acao },
                    { label: 'Meio / Modo', data: c.evidencias_auditadas.proposta_intervencao.meio_modo },
                    { label: 'Efeito', data: c.evidencias_auditadas.proposta_intervencao.efeito },
                    { label: 'Detalhamento', data: c.evidencias_auditadas.proposta_intervencao.detalhamento },
                  ].map((elem, i) => (
                    <div key={i} className="flex items-start justify-between bg-white p-1.5 rounded border border-slate-200">
                      <div>
                        <span className="font-bold text-slate-700">{elem.label}:</span>{' '}
                        <span className="text-slate-600">{elem.data?.trecho || '(Não identificado)'}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          elem.data?.valido
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {elem.data?.valido ? 'Válido' : 'Inválido/Ausente'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Sem dados estruturados de proposta.</p>
              )}
            </div>
          </div>

          {/* Texto Original ou Transcrição */}
          {textoOriginal && (
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
              <h4 className="font-bold text-slate-900 text-sm mb-2">Texto da Redação</h4>
              <div className="bg-white p-4 rounded-lg border border-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed text-slate-700 max-h-60 overflow-y-auto">
                {textoOriginal}
              </div>
            </div>
          )}

          {/* Se houver imagem manuscrita */}
          {imagemUrl && (
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
              <h4 className="font-bold text-slate-900 text-sm mb-2">Folha Manuscrita Original</h4>
              <img src={imagemUrl} alt="Folha Manuscrita" className="max-h-96 w-auto rounded border border-slate-200 object-contain mx-auto" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
