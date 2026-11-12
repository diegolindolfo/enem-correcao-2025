import { describe, it, expect } from 'vitest';
import {
  buildEnemDecisionQuestions,
  construirResultadoDecisionPuro,
  reconciliarDuplaCorrecao,
  DecisionEvaluationResponse,
} from '../gemini-decision-evaluator';
import { calcularNotaEnem2025 } from '../enem-2025-engine';
import { ExtractedEvidence } from '../enem-rubric-types';

describe('Gemini Decision 1 (Decisions API - Zero Output Tokens & Dupla Correção INEP)', () => {
  it('1. Constrói o mapa de questões tipadas (noul, choice e score) da Grade 2025', () => {
    const q = buildEnemDecisionQuestions('Perspectivas acerca do envelhecimento');
    expect(q.c1_nivel.type).toBe('score');
    expect(q.c1_nivel.criteria).toHaveLength(6);
    expect(q.c2_nivel.type).toBe('score');
    expect(q.c2_nivel.criteria).toHaveLength(5);
    expect(q.c5_agente.type).toBe('noul');
  });

  it('2. Calibração de Fronteira (caso redacao_13): ajusta C1 de 200 para 160 quando Decision aponta Nível 4 com alta confiança', () => {
    const evCorretor1: ExtractedEvidence = {
      qualidade_estrutura_sintatica: 'excelente',
      falhas_sintaticas: [],
      desvios_identificados: [
        { trecho_original: 'experenciada', forma_correta: 'experienciada', tipo: 'ortografia', explicacao_curta: '' },
      ],
      abordagem_tema: 'completa',
      tipo_textual: 'dissertativo_argumentativo',
      aglomerado_caotico_palavras: false,
      qtd_partes_texto: 3,
      partes_embrionarias_indices: [],
      conclusao_finalizada_ideia_incompleta: false,
      copia_excessiva_motivadores: false,
      repertorios: [
        {
          trecho_citado: 'As alegrias da maternidade',
          fonte_ou_area: 'Literatura',
          legitimado: true,
          pertinente: true,
          uso_produtivo: true,
          baseado_textos_motivadores: false,
        },
      ],
      qualidade_projeto_texto: 'estrategico',
      desenvolvimento_argumentativo: 'todo_texto',
      possui_contradicao_grave: false,
      presenca_coesivos: 'expressiva',
      conectivos_interparagrafos_contagem: 3,
      inadequacoes_coesivas: [],
      repeticoes_excessivas_palavras: [],
      eh_monobloco: false,
      proposta_intervencao: {
        agente: { trecho: 'empresas de divulgação', valido: true },
        acao: { trecho: 'propagar uma imagem positiva', valido: true },
        meio_modo: { trecho: 'por meio de propagandas', valido: true },
        efeito: { trecho: 'a fim de romper com os estigmas', valido: true },
        detalhamento: { trecho: 'como projetos esportivos', valido: true },
        eh_estrutura_condicional: false,
        desrespeita_direitos_humanos: false,
        nao_relacionada_ao_assunto: false,
      },
      anulacao_detectada: { houve_anulacao: false },
    };

    const resCorretor1 = calcularNotaEnem2025('redacao_13', evCorretor1, 'handwritten_media');
    expect(resCorretor1.nota_total).toBe(1000);

    const decisionMock: DecisionEvaluationResponse = {
      answers: {
        c1_nivel: {
          type: 'score',
          score: 4.1,
          probabilities: { '0': 0, '1': 0, '2': 0, '3': 0.02, '4': 0.86, '5': 0.12 },
          confidence: 0.86,
        },
        c1_faixa_desvios: { type: 'choice', choice: 'b_de_3_a_5', confidence: 0.88 },
        c2_nivel: {
          type: 'score',
          score: 4.0,
          probabilities: { '0': 0, '1': 0, '2': 0, '3': 0.05, '4': 0.95 },
          confidence: 0.95,
        },
        c2_abordagem: { type: 'choice', choice: 'a_completa_dissertativa', confidence: 0.97 },
        c3_nivel: {
          type: 'score',
          score: 5.0,
          probabilities: { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0.08, '5': 0.92 },
          confidence: 0.92,
        },
        c4_nivel: {
          type: 'score',
          score: 5.0,
          probabilities: { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0.06, '5': 0.94 },
          confidence: 0.94,
        },
        eh_monobloco: { type: 'noul', noul: 0.01, confidence: 0.99 },
        c5_agente: { type: 'noul', noul: 0.98, confidence: 0.98 },
        c5_acao: { type: 'noul', noul: 0.98, confidence: 0.98 },
        c5_meio: { type: 'noul', noul: 0.97, confidence: 0.97 },
        c5_efeito: { type: 'noul', noul: 0.96, confidence: 0.96 },
        c5_detalhamento: { type: 'noul', noul: 0.95, confidence: 0.95 },
      },
      usage: { total_input_tokens: 420, total_output_tokens: 0, total_tokens: 420 },
    };

    const reconciliado = reconciliarDuplaCorrecao(resCorretor1, decisionMock);
    expect(reconciliado.c1.pontos).toBe(160);
    expect(reconciliado.nota_total).toBe(960);
    expect(reconciliado.dupla_correcao_decision?.houve_discrepancia_inep).toBe(false);
    expect(reconciliado.dupla_correcao_decision?.ajustes_fronteira_aplicados.length).toBeGreaterThan(0);
  });

  it('3. Sinaliza Discrepância INEP quando os 2 corretores divergem em >= 80 pts numa competência', () => {
    const decisionMock: DecisionEvaluationResponse = {
      answers: {
        c1_nivel: { type: 'score', probabilities: { '2': 0.9 }, confidence: 0.9 },
        c2_nivel: { type: 'score', probabilities: { '0': 0.92 }, confidence: 0.92 },
        c2_abordagem: { type: 'choice', choice: 'b_tracos_outros_tipos', confidence: 0.9 },
        c3_nivel: { type: 'score', probabilities: { '2': 0.85 }, confidence: 0.85 },
        c4_nivel: { type: 'score', probabilities: { '2': 0.88 }, confidence: 0.88 },
        c5_agente: { type: 'noul', noul: 0.05, confidence: 0.95 },
        c5_acao: { type: 'noul', noul: 0.92, confidence: 0.92 },
        c5_meio: { type: 'noul', noul: 0.04, confidence: 0.96 },
        c5_efeito: { type: 'noul', noul: 0.04, confidence: 0.96 },
        c5_detalhamento: { type: 'noul', noul: 0.04, confidence: 0.96 },
      },
    };

    const puro = construirResultadoDecisionPuro('redacao_19', decisionMock, 'handwritten_media');
    expect([puro.c1.pontos, puro.c2.pontos, puro.c3.pontos, puro.c4.pontos, puro.c5.pontos]).toEqual([
      80, 40, 80, 80, 40,
    ]);
    expect(puro.nota_total).toBe(320);
  });
});
