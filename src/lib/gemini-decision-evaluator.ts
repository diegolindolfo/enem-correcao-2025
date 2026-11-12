import {
  CompetenciaScore,
  DecisionCalibrationSummary,
  ExtractedEvidence,
  GradingResult,
  InputModality,
} from './enem-rubric-types';
import { calcularNotaEnem2025 } from './enem-2025-engine';

export interface DecisionRawAnswer {
  type: 'noul' | 'choice' | 'score';
  noul?: number;
  choice?: string;
  score?: number;
  probabilities?: Record<string, number>;
  legend?: Record<string, string>;
  confidence?: number;
}

export interface DecisionEvaluationResponse {
  answers: Record<string, DecisionRawAnswer>;
  usage?: {
    total_input_tokens?: number;
    total_output_tokens?: number;
    total_tokens?: number;
  };
}

/**
 * Monta o mapa de questões calibradas da Grade Oficial ENEM 2025 para o modelo `gemini-decision-1`.
 * Avalia simultaneamente C1..C5, elementos da proposta e travas com 0 tokens de saída.
 */
export function buildEnemDecisionQuestions(tema: string): Record<string, any> {
  return {
    anulacao_elementar: {
      type: 'noul',
      instructions:
        'A redação deve ser anulada por forma elementar (folha em branco, texto ilegível, menos de 8 linhas escritas em manuscrito, desenho/emoji ou assinatura fora do local devido)?',
    },
    fuga_ao_tema: {
      type: 'noul',
      instructions: `O texto foge completamente tanto ao tema proposto ("${tema}") quanto ao assunto geral, sem mencionar nada relacionado a eles?`,
    },
    outro_tipo_textual: {
      type: 'noul',
      instructions:
        'O texto foi escrito integral ou predominantemente em outro tipo textual (poema, conto, fábula, carta ou receita) em vez de texto dissertativo-argumentativo?',
    },
    c1_nivel: {
      type: 'score',
      instructions:
        'Avalie a Competência I (domínio da modalidade escrita formal da língua portuguesa: estrutura sintática e desvios gramaticais, ortográficos, de acentuação, pontuação e uso de maiúsculas) segundo a Grade ENEM 2025:',
      criteria: [
        'Nível 0 (0 pts): Estrutura sintática inexistente.',
        'Nível 1 (40 pts): Estrutura sintática deficitária COM muitos desvios generalizados.',
        'Nível 2 (80 pts): Estrutura sintática deficitária (truncamentos e justaposições frequentes) OU muitos desvios (9 ou mais desvios de ortografia, acentuação, maiúsculas indevidas no meio de frases, concordância ou regência).',
        'Nível 3 (120 pts): Estrutura sintática regular E alguns desvios (6 a 8 desvios de norma-padrão).',
        'Nível 4 (160 pts): Estrutura sintática boa E poucos desvios (3 a 5 desvios pontuais de concordância, acentuação, regência, colocação pronominal ou pontuação).',
        'Nível 5 (200 pts): Estrutura sintática excelente (no máximo 1 falha sintática) E no máximo 2 desvios em todo o texto.',
      ],
    },
    c1_faixa_desvios: {
      type: 'choice',
      instructions:
        'Quantos desvios da norma-padrão (ortografia, acentuação gráfica, uso indevido de maiúsculas no meio de frases, concordância verbal/nominal, regência, crase, colocação pronominal e pontuação) existem no texto todo?',
      criteria: {
        a_ate_2: 'De 0 a 2 desvios em todo o texto.',
        b_de_3_a_5: 'De 3 a 5 desvios pontuais no texto.',
        c_de_6_a_8: 'De 6 a 8 desvios no texto.',
        d_9_ou_mais: '9 ou mais desvios no texto.',
      },
    },
    c2_nivel: {
      type: 'score',
      instructions: `Avalie a Competência II (compreensão do tema "${tema}", estrutura dissertativo-argumentativa em 3 partes e repertório sociocultural) segundo a Grade ENEM 2025:`,
      criteria: [
        'Nível 1 (40 pts): Tangência ao tema OU aglomerado caótico de palavras OU traços constantes de outros tipos textuais (relato/desabafo pessoal constante em 1ª pessoa e apelo moral sem as 3 partes dissertativas).',
        'Nível 2 (80 pts): Abordagem completa do tema, mas com apenas 2 partes do texto OU 2 partes embrionárias OU conclusão finalizada por ideia incompleta.',
        'Nível 3 (120 pts): Abordagem completa do tema e 3 partes do texto (1 delas pode ser embrionária), com repertório baseado nos motivadores, não legitimado, não pertinente ou citação solta sem desenvolvimento.',
        'Nível 4 (160 pts): Abordagem completa do tema, 3 partes do texto (nenhuma embrionária) e repertório sociocultural legitimado e pertinente ao tema, SEM uso produtivo.',
        'Nível 5 (200 pts): Abordagem completa do tema, 3 partes do texto (nenhuma embrionária) e repertório sociocultural legitimado e pertinente ao tema, COM uso produtivo.',
      ],
    },
    c2_abordagem: {
      type: 'choice',
      instructions: `Como o texto aborda o tema "${tema}" e o tipo textual dissertativo-argumentativo?`,
      criteria: {
        a_completa_dissertativa: 'Aborda o tema com estrutura dissertativo-argumentativa em 3 partes.',
        b_tracos_outros_tipos:
          'Trata do assunto com traços constantes de relato/desabafo pessoal em 1ª pessoa ou apelo moral constante (ex.: apenas 2 parágrafos de desabafo/conselho).',
        c_tangencia: 'Tangencia o tema: fala apenas do assunto amplo sem abordar o recorte temático.',
      },
    },
    c3_nivel: {
      type: 'score',
      instructions:
        'Avalie a Competência III (projeto de texto e desenvolvimento de informações, fatos e opiniões para defender o ponto de vista) segundo a Grade ENEM 2025:',
      criteria: [
        'Nível 0 (0 pts): Aglomerado caótico de palavras.',
        'Nível 1 (40 pts): Projeto de texto sem foco temático ou com foco temático distorcido, ou texto tangente ao tema.',
        'Nível 2 (80 pts): Projeto de texto com muitas falhas E sem desenvolvimento ou com desenvolvimento de apenas uma informação, fato ou opinião (ex.: casos puramente familiares ou repetição circular).',
        'Nível 3 (120 pts): Projeto de texto com algumas falhas E desenvolvimento de informações, fatos e opiniões com algumas lacunas.',
        'Nível 4 (160 pts): Projeto de texto com poucas falhas E desenvolvimento de informações, fatos e opiniões com poucas lacunas.',
        'Nível 5 (200 pts): Projeto de texto estratégico E desenvolvimento de informações, fatos e opiniões em todo o texto (admitindo-se deslizes pontuais).',
      ],
    },
    c4_nivel: {
      type: 'score',
      instructions:
        'Avalie a Competência IV (mecanismos linguísticos de coesão intra e interparágrafos, ausência de repetições excessivas e adequação dos conectivos) segundo a Grade ENEM 2025:',
      criteria: [
        'Nível 0 (0 pts): Ausência de articulação (palavras ou períodos desconexos).',
        'Nível 1 (40 pts): Presença rara de elementos coesivos E/OU excessivas repetições E/OU excessivas inadequações.',
        'Nível 2 (80 pts): Presença pontual de elementos coesivos E/OU muitas repetições vocabulares (ex.: repetir "a gente", "maltratar", "então", "muitas vezes" várias vezes) E/OU texto em monobloco.',
        'Nível 3 (120 pts): Presença regular de elementos coesivos (ou zero conectivos interparágrafos no início dos parágrafos) E/OU algumas repetições.',
        'Nível 4 (160 pts): Presença constante de elementos coesivos intra e interparágrafos (ao menos 1 conectivo interparágrafo) E poucas repetições ou inadequações.',
        'Nível 5 (200 pts): Presença expressiva de elementos coesivos intra e interparágrafos (conectivos interparágrafos em pelo menos 2 parágrafos) E raras ou ausentes repetições E sem inadequação.',
      ],
    },
    eh_monobloco: {
      type: 'noul',
      instructions: 'O texto está escrito em um único parágrafo contínuo (monobloco), sem divisão em parágrafos?',
    },
    c5_agente: {
      type: 'noul',
      instructions:
        'A proposta de intervenção apresenta um AGENTE social/institucional explícito e válido? (Responda NÃO se o agente for indeterminado ou em 1ª pessoa do plural como "nós", "todos nós", "a gente", "alguém", "as pessoas" ou sujeito oculto em "temos que", "precisamos").',
    },
    c5_acao: {
      type: 'noul',
      instructions:
        'A proposta de intervenção apresenta uma AÇÃO prática explícita indicando o que deve ser feito para enfrentar o problema?',
    },
    c5_meio: {
      type: 'noul',
      instructions:
        'A proposta de intervenção apresenta o MEIO ou MODO explícito indicando como ou por meio de que recurso a ação será executada?',
    },
    c5_efeito: {
      type: 'noul',
      instructions:
        'A proposta de intervenção apresenta um EFEITO ou finalidade explícita introduzida por estrutura de finalidade/consequência (para, a fim de, com o fito de, de modo a, promovendo assim)? (Não conte uma segunda ação coordenada por "e não deixar..." como efeito).',
    },
    c5_detalhamento: {
      type: 'noul',
      instructions:
        'A proposta de intervenção apresenta um DETALHAMENTO específico (exemplificação, explicação, aposto ou especificação) de um dos elementos?',
    },
    c5_condicional: {
      type: 'noul',
      instructions: 'A proposta de intervenção está formulada em estrutura condicional ("se...", "caso...")?',
    },
    c5_fere_dh: {
      type: 'noul',
      instructions: 'A proposta de intervenção desrespeita os direitos humanos?',
    },
  };
}

/**
 * Chama a Decisions API (`gemini-decision-1`) via SDK ou REST v1beta (`0 output tokens`).
 */
export async function executarAvaliacaoDecision(params: {
  apiKey: string;
  modalidade: InputModality;
  texto?: string;
  imagemBase64?: string;
  mimeType?: string;
  tema: string;
}): Promise<DecisionEvaluationResponse> {
  const { apiKey, modalidade, texto, imagemBase64, mimeType = 'image/jpeg', tema } = params;

  const inputBlocks: any[] = [
    {
      type: 'text',
      text: `TEMA OFICIAL DA REDAÇÃO DO ENEM: "${tema || 'Tema padrão do exame'}"\n\n`,
    },
  ];

  if (modalidade === 'handwritten_media' && imagemBase64) {
    const cleanB64 = imagemBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
    if (mimeType === 'application/pdf') {
      inputBlocks.push({
        type: 'document',
        data: cleanB64,
        mime_type: 'application/pdf',
      });
    } else {
      inputBlocks.push({
        type: 'image',
        data: cleanB64,
        mime_type: mimeType,
        resolution: 'high',
      });
    }
  } else {
    inputBlocks.push({
      type: 'text',
      text: `<redacao_candidato>\n${texto || ''}\n</redacao_candidato>`,
    });
  }

  const questions = buildEnemDecisionQuestions(tema);

  const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/decisions', {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gemini-decision-1',
      input: inputBlocks,
      questions,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Decisions API (${resp.status}): ${errText.slice(0, 200)}`);
  }

  return (await resp.json()) as DecisionEvaluationResponse;
}

/**
 * Extrai o nível discreto de maior probabilidade de uma resposta `type: "score"`.
 */
function extrairNivelMaisProvavel(
  ans: DecisionRawAnswer | undefined,
  offset: number = 0,
  fallback: number = 3
): { nivel: 0 | 1 | 2 | 3 | 4 | 5; confianca: number; probs: Record<string, number> } {
  if (!ans) {
    return { nivel: fallback as 0 | 1 | 2 | 3 | 4 | 5, confianca: 0.5, probs: {} };
  }

  const probs = ans.probabilities || {};
  let bestKey = '';
  let bestProb = -1;

  for (const [k, p] of Object.entries(probs)) {
    if (typeof p === 'number' && p > bestProb) {
      bestProb = p;
      bestKey = k;
    }
  }

  let rawIndex = bestKey !== '' ? Number(bestKey) : Math.round(ans.score ?? fallback - offset);
  if (Number.isNaN(rawIndex)) rawIndex = fallback - offset;

  const nivelCalculado = Math.max(0, Math.min(5, rawIndex + offset)) as 0 | 1 | 2 | 3 | 4 | 5;
  const confianca = typeof ans.confidence === 'number' ? ans.confidence : bestProb > 0 ? bestProb : 0.7;

  return { nivel: nivelCalculado, confianca, probs };
}

/**
 * Converte a resposta do `gemini-decision-1` em notas por competência e resumo de calibração.
 */
export function extrairNotasDoDecision(
  decisionResp: DecisionEvaluationResponse,
  modo: 'dupla_correcao_hibrida' | 'decision_puro'
) {
  const a = decisionResp.answers || {};

  // C1 (0..5)
  const c1 = extrairNivelMaisProvavel(a.c1_nivel, 0, 3);
  const faixaDesvios = a.c1_faixa_desvios?.choice || '';
  let nivelC1 = c1.nivel;
  if (faixaDesvios === 'b_de_3_a_5' && nivelC1 === 5) {
    nivelC1 = 4; // 3 a 5 desvios = Nível 4 (160)
  } else if (faixaDesvios === 'd_9_ou_mais' && nivelC1 > 2) {
    nivelC1 = 2; // 9+ desvios = teto Nível 2 (80)
  }

  // C2 (0..4 no score -> Nível 1..5 na Grade)
  const c2 = extrairNivelMaisProvavel(a.c2_nivel, 1, 3);
  let nivelC2 = c2.nivel;
  const abordagem = a.c2_abordagem?.choice || 'a_completa_dissertativa';
  if (abordagem === 'b_tracos_outros_tipos' || abordagem === 'c_tangencia') {
    nivelC2 = 1;
  }

  // C3 (0..5)
  const c3 = extrairNivelMaisProvavel(a.c3_nivel, 0, 3);
  let nivelC3 = c3.nivel;
  if (abordagem === 'c_tangencia' && nivelC3 > 1) {
    nivelC3 = 1;
  }
  if (nivelC3 <= 2 && nivelC2 > 3) {
    nivelC2 = 3;
  }

  // C4 (0..5)
  const c4 = extrairNivelMaisProvavel(a.c4_nivel, 0, 3);
  let nivelC4 = c4.nivel;
  const ehMonobloco = (a.eh_monobloco?.noul ?? 0) >= 0.7;
  if (ehMonobloco) {
    if (nivelC2 > 3) nivelC2 = 3;
    if (nivelC4 > 2) nivelC4 = 2;
  }

  // C5 (contagem atômica dos 5 elementos via noul >= 0.55)
  const agValido = (a.c5_agente?.noul ?? 0) >= 0.55;
  const acValida = (a.c5_acao?.noul ?? 0) >= 0.55;
  const meValido = (a.c5_meio?.noul ?? 0) >= 0.55;
  const efValido = (a.c5_efeito?.noul ?? 0) >= 0.55;
  const dtValido = (a.c5_detalhamento?.noul ?? 0) >= 0.55;
  const condicional = (a.c5_condicional?.noul ?? 0) >= 0.7;
  const fereDh = (a.c5_fere_dh?.noul ?? 0) >= 0.75;

  let elemValidos =
    (agValido ? 1 : 0) +
    (acValida ? 1 : 0) +
    (meValido ? 1 : 0) +
    (efValido ? 1 : 0) +
    (dtValido ? 1 : 0);

  let nivelC5 = elemValidos as 0 | 1 | 2 | 3 | 4 | 5;
  if (fereDh) {
    nivelC5 = 0;
  } else if (abordagem === 'c_tangencia') {
    nivelC5 = 1;
  } else {
    if (!acValida && nivelC5 > 2) nivelC5 = 2;
    if (condicional && elemValidos >= 2 && nivelC5 > 2) nivelC5 = 2;
  }

  const confC5 =
    ((a.c5_agente?.confidence ?? 0.8) +
      (a.c5_acao?.confidence ?? 0.8) +
      (a.c5_meio?.confidence ?? 0.8) +
      (a.c5_efeito?.confidence ?? 0.8) +
      (a.c5_detalhamento?.confidence ?? 0.8)) /
    5;

  const confiancaMedia = Number(
    ((c1.confianca + c2.confianca + c3.confianca + c4.confianca + confC5) / 5).toFixed(2)
  );

  const notas = {
    c1: nivelC1 * 40,
    c2: nivelC2 * 40,
    c3: nivelC3 * 40,
    c4: nivelC4 * 40,
    c5: nivelC5 * 40,
  };
  const total = notas.c1 + notas.c2 + notas.c3 + notas.c4 + notas.c5;

  return {
    niveis: { c1: nivelC1, c2: nivelC2, c3: nivelC3, c4: nivelC4, c5: nivelC5 },
    notas,
    total,
    confiancas: {
      c1: c1.confianca,
      c2: c2.confianca,
      c3: c3.confianca,
      c4: c4.confianca,
      c5: Number(confC5.toFixed(2)),
    },
    probabilidades: {
      c1: c1.probs,
      c2: c2.probs,
      c3: c3.probs,
      c4: c4.probs,
    },
    confiancaMedia,
    flags: {
      anulacaoElementar: (a.anulacao_elementar?.noul ?? 0) >= 0.85,
      fugaAoTema: (a.fuga_ao_tema?.noul ?? 0) >= 0.85,
      outroTipoTextual: (a.outro_tipo_textual?.noul ?? 0) >= 0.85,
      ehMonobloco,
      abordagem,
      faixaDesvios,
      elementosC5: { agValido, acValida, meValido, efValido, dtValido, condicional, fereDh },
    },
    modo,
  };
}

/**
 * Combina o resultado do Corretor 1 (Motor Determinístico Factual) com o Corretor 2 (`gemini-decision-1`):
 * - Aplica calibração de fronteira quando C1/C2/C3/C4 divergem em 1 nível (40 pts) e o Decision tem alta confiança (>= 0.72);
 * - Detecta discrepância oficial no padrão INEP (> 80 pts numa competência ou > 100 pts no total);
 * - Anexa `confianca` e `probabilidades_nivel` em cada competência.
 */
export function reconciliarDuplaCorrecao(
  resultadoMotor: GradingResult,
  decisionResp: DecisionEvaluationResponse
): GradingResult {
  const dec = extrairNotasDoDecision(decisionResp, 'dupla_correcao_hibrida');
  const notaCorretor1 = resultadoMotor.nota_total;
  const ajustesFronteira: string[] = [];
  const motivosRevisao: string[] = [];

  const c1 = { ...resultadoMotor.c1, confianca: dec.confiancas.c1, probabilidades_nivel: dec.probabilidades.c1 };
  const c2 = { ...resultadoMotor.c2, confianca: dec.confiancas.c2, probabilidades_nivel: dec.probabilidades.c2 };
  const c3 = { ...resultadoMotor.c3, confianca: dec.confiancas.c3, probabilidades_nivel: dec.probabilidades.c3 };
  const c4 = { ...resultadoMotor.c4, confianca: dec.confiancas.c4, probabilidades_nivel: dec.probabilidades.c4 };
  const c5 = { ...resultadoMotor.c5, confianca: dec.confiancas.c5 };

  if (!resultadoMotor.anulada) {
    // Calibração de fronteira na C1 (ex.: redacao_13 onde o extrator contou 2 desvios = 200, mas o Decision detectou 3-5 desvios = 160 com alta confiança)
    if (Math.abs(c1.pontos - dec.notas.c1) === 40 && dec.confiancas.c1 >= 0.72) {
      const antes = c1.pontos;
      c1.nivel = dec.niveis.c1;
      c1.pontos = dec.notas.c1;
      ajustesFronteira.push(
        `C1 calibrada de ${antes} para ${c1.pontos} pelo 2º corretor (gemini-decision-1, confiança ${Math.round(dec.confiancas.c1 * 100)}%).`
      );
    }

    // Calibração de fronteira na C2 (quando houver traços constantes de outros tipos textuais detectados com alta confiança)
    if (
      dec.flags.abordagem === 'b_tracos_outros_tipos' &&
      dec.confiancas.c2 >= 0.75 &&
      c2.pontos > 40
    ) {
      const antes = c2.pontos;
      c2.nivel = 1;
      c2.pontos = 40;
      c2.justificativa_oficial = 'Traços constantes de outros tipos textuais (calibrado via gemini-decision-1).';
      ajustesFronteira.push(`C2 calibrada de ${antes} para 40 (traços constantes de outros tipos textuais).`);
    }

    // Calibração de fronteira em C3 e C4 (divergência de 40 pts com confiança >= 0.75)
    if (Math.abs(c3.pontos - dec.notas.c3) === 40 && dec.confiancas.c3 >= 0.75) {
      const antes = c3.pontos;
      c3.nivel = dec.niveis.c3;
      c3.pontos = dec.notas.c3;
      ajustesFronteira.push(
        `C3 calibrada de ${antes} para ${c3.pontos} pelo 2º corretor (confiança ${Math.round(dec.confiancas.c3 * 100)}%).`
      );
    }

    if (Math.abs(c4.pontos - dec.notas.c4) === 40 && dec.confiancas.c4 >= 0.75) {
      const antes = c4.pontos;
      c4.nivel = dec.niveis.c4;
      c4.pontos = dec.notas.c4;
      ajustesFronteira.push(
        `C4 calibrada de ${antes} para ${c4.pontos} pelo 2º corretor (confiança ${Math.round(dec.confiancas.c4 * 100)}%).`
      );
    }
  }

  // Checagem de Discrepância Oficial padrão INEP (diferença >= 80 pts numa competência ou > 100 pts no total entre Corretor 1 e Corretor 2)
  const diffs = [
    { nome: 'C1', d: Math.abs(resultadoMotor.c1.pontos - dec.notas.c1) },
    { nome: 'C2', d: Math.abs(resultadoMotor.c2.pontos - dec.notas.c2) },
    { nome: 'C3', d: Math.abs(resultadoMotor.c3.pontos - dec.notas.c3) },
    { nome: 'C4', d: Math.abs(resultadoMotor.c4.pontos - dec.notas.c4) },
    { nome: 'C5', d: Math.abs(resultadoMotor.c5.pontos - dec.notas.c5) },
  ];

  let houveDiscrepanciaInep = false;
  for (const item of diffs) {
    if (item.d >= 80) {
      houveDiscrepanciaInep = true;
      motivosRevisao.push(`Discrepância de ${item.d} pts na ${item.nome} entre os 2 corretores.`);
    }
  }

  if (Math.abs(notaCorretor1 - dec.total) > 100) {
    houveDiscrepanciaInep = true;
    motivosRevisao.push(
      `Diferença global superior a 100 pts entre Corretor 1 (${notaCorretor1}) e Corretor 2 (${dec.total}).`
    );
  }

  if (dec.confiancaMedia < 0.65) {
    motivosRevisao.push(`Confiança média calibrada abaixo do limiar (${Math.round(dec.confiancaMedia * 100)}%).`);
  }

  const novaNotaTotal = resultadoMotor.anulada
    ? 0
    : c1.pontos + c2.pontos + c3.pontos + c4.pontos + c5.pontos;

  const duplaCorrecao: DecisionCalibrationSummary = {
    ativo: true,
    modo: 'dupla_correcao_hibrida',
    confianca_media: dec.confiancaMedia,
    nota_corretor_1: notaCorretor1,
    nota_corretor_2: dec.total,
    notas_por_competencia_decision: dec.notas,
    houve_discrepancia_inep: houveDiscrepanciaInep,
    revisao_humana_recomendada: houveDiscrepanciaInep || dec.confiancaMedia < 0.65,
    ajustes_fronteira_aplicados: ajustesFronteira,
    motivos_revisao: motivosRevisao,
  };

  return {
    ...resultadoMotor,
    c1,
    c2,
    c3,
    c4,
    c5,
    nota_total: novaNotaTotal,
    dupla_correcao_decision: duplaCorrecao,
  };
}

/**
 * Gera um `GradingResult` completo diretamente a partir do `gemini-decision-1` (Modo 0 Output Tokens).
 */
export function construirResultadoDecisionPuro(
  redacaoId: string,
  decisionResp: DecisionEvaluationResponse,
  modalidade: InputModality,
  copiaPercentual?: number
): GradingResult {
  const dec = extrairNotasDoDecision(decisionResp, 'decision_puro');
  const f = dec.flags;

  const evidenciasSinteticas: ExtractedEvidence = {
    qualidade_estrutura_sintatica:
      dec.niveis.c1 >= 5
        ? 'excelente'
        : dec.niveis.c1 === 4
          ? 'boa'
          : dec.niveis.c1 === 3
            ? 'regular'
            : dec.niveis.c1 >= 1
              ? 'deficitaria'
              : 'inexistente',
    falhas_sintaticas: [],
    desvios_identificados: [],
    abordagem_tema: f.fugaAoTema ? 'fuga' : f.abordagem === 'c_tangencia' ? 'tangencia' : 'completa',
    tipo_textual: f.outroTipoTextual
      ? 'outro_predominante'
      : f.abordagem === 'b_tracos_outros_tipos'
        ? 'tracos_constantes_outros'
        : 'dissertativo_argumentativo',
    aglomerado_caotico_palavras: dec.niveis.c3 === 0,
    qtd_partes_texto: dec.niveis.c2 >= 3 ? 3 : 2,
    partes_embrionarias_indices: dec.niveis.c2 === 3 ? [2] : [],
    conclusao_finalizada_ideia_incompleta: false,
    copia_excessiva_motivadores: Boolean(copiaPercentual && copiaPercentual >= 25),
    repertorios:
      dec.niveis.c2 >= 4
        ? [
            {
              trecho_citado: '(Avaliado via Gemini Decision 1 - Zero Output Tokens)',
              fonte_ou_area: 'Repertório Calibrado',
              legitimado: true,
              pertinente: true,
              uso_produtivo: dec.niveis.c2 === 5,
              baseado_textos_motivadores: false,
            },
          ]
        : [],
    qualidade_projeto_texto:
      dec.niveis.c3 === 5
        ? 'estrategico'
        : dec.niveis.c3 === 4
          ? 'poucas_falhas'
          : dec.niveis.c3 === 3
            ? 'algumas_falhas'
            : dec.niveis.c3 === 2
              ? 'muitas_falhas'
              : 'sem_foco_ou_distorcido',
    desenvolvimento_argumentativo:
      dec.niveis.c3 === 5
        ? 'todo_texto'
        : dec.niveis.c3 === 4
          ? 'poucas_lacunas'
          : dec.niveis.c3 === 3
            ? 'algumas_lacunas'
            : 'apenas_uma_informacao',
    possui_contradicao_grave: false,
    presenca_coesivos:
      dec.niveis.c4 === 5
        ? 'expressiva'
        : dec.niveis.c4 === 4
          ? 'constante'
          : dec.niveis.c4 === 3
            ? 'regular'
            : dec.niveis.c4 === 2
              ? 'pontual'
              : dec.niveis.c4 === 1
                ? 'rara'
                : 'ausente',
    conectivos_interparagrafos_contagem: dec.niveis.c4 === 5 ? 2 : dec.niveis.c4 === 4 ? 1 : 0,
    inadequacoes_coesivas: [],
    repeticoes_excessivas_palavras: [],
    eh_monobloco: f.ehMonobloco,
    proposta_intervencao: {
      agente: f.elementosC5.agValido ? { trecho: 'Presente (Decision API)', valido: true } : undefined,
      acao: f.elementosC5.acValida ? { trecho: 'Presente (Decision API)', valido: true } : undefined,
      meio_modo: f.elementosC5.meValido ? { trecho: 'Presente (Decision API)', valido: true } : undefined,
      efeito: f.elementosC5.efValido ? { trecho: 'Presente (Decision API)', valido: true } : undefined,
      detalhamento: f.elementosC5.dtValido ? { trecho: 'Presente (Decision API)', valido: true } : undefined,
      eh_estrutura_condicional: f.elementosC5.condicional,
      desrespeita_direitos_humanos: f.elementosC5.fereDh,
      nao_relacionada_ao_assunto: false,
    },
    anulacao_detectada: {
      houve_anulacao: f.anulacaoElementar || f.fugaAoTema || f.outroTipoTextual,
      motivo_hierarquico: f.anulacaoElementar
        ? 'TEXTO_ILEGIVEL'
        : f.fugaAoTema
          ? 'FUGA_AO_TEMA'
          : f.outroTipoTextual
            ? 'NAO_ATENDIMENTO_TIPO_TEXTUAL'
            : undefined,
    },
  };

  const baseResult = calcularNotaEnem2025(redacaoId, evidenciasSinteticas, modalidade, copiaPercentual);

  // Sobrescreve C1..C5 com os níveis calibrados do Decision respeitando anulação
  if (!baseResult.anulada) {
    baseResult.c1 = {
      ...baseResult.c1,
      nivel: dec.niveis.c1,
      pontos: dec.notas.c1,
      confianca: dec.confiancas.c1,
      probabilidades_nivel: dec.probabilidades.c1,
    };
    baseResult.c2 = {
      ...baseResult.c2,
      nivel: dec.niveis.c2,
      pontos: dec.notas.c2,
      confianca: dec.confiancas.c2,
      probabilidades_nivel: dec.probabilidades.c2,
    };
    baseResult.c3 = {
      ...baseResult.c3,
      nivel: dec.niveis.c3,
      pontos: dec.notas.c3,
      confianca: dec.confiancas.c3,
      probabilidades_nivel: dec.probabilidades.c3,
    };
    baseResult.c4 = {
      ...baseResult.c4,
      nivel: dec.niveis.c4,
      pontos: dec.notas.c4,
      confianca: dec.confiancas.c4,
      probabilidades_nivel: dec.probabilidades.c4,
    };
    baseResult.c5 = {
      ...baseResult.c5,
      nivel: dec.niveis.c5,
      pontos: dec.notas.c5,
      confianca: dec.confiancas.c5,
    };
    baseResult.nota_total = dec.total;
  }

  baseResult.dupla_correcao_decision = {
    ativo: true,
    modo: 'decision_puro',
    confianca_media: dec.confiancaMedia,
    nota_corretor_2: dec.total,
    notas_por_competencia_decision: dec.notas,
    houve_discrepancia_inep: false,
    revisao_humana_recomendada: dec.confiancaMedia < 0.65,
    ajustes_fronteira_aplicados: ['Avaliação ultra-rápida via Gemini Decision 1 (0 tokens de saída).'],
    motivos_revisao:
      dec.confiancaMedia < 0.65
        ? [`Confiança média de ${Math.round(dec.confiancaMedia * 100)}% — recomendada conferência.`]
        : [],
  };

  return baseResult;
}
