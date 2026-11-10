import { ExtractedEvidence, DesvioItem, FalhaSintaticaItem, InputModality } from './enem-rubric-types';

/**
 * Normaliza espaçamentos e pontuações para conferência semântica de substring
 */
function simplificar(texto: string): string {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Verifica se um trecho citado existe no texto original, tolerando:
 * 1. Substring contínua exata (após normalização de acentos/pontuação); OU
 * 2. Orações intercaladas (ex: quando a IA extrai o Efeito sem o Detalhamento que estava intercalado por vírgulas no meio da frase, ou com "..." omitindo o aposto).
 */
export function trechoExisteNoTexto(
  textoSimples: string,
  trechoCitado: string,
  tolerarIntercalacao: boolean = false
): boolean {
  const trechoSimp = simplificar(trechoCitado);
  if (!trechoSimp) return false;

  // 1. Substring direta
  if (textoSimples.includes(trechoSimp)) {
    return true;
  }

  if (!tolerarIntercalacao) {
    return false;
  }

  // 2. Se o trecho tiver reticências (...) ou oração intercalada (comum na C5),
  // verifica se as palavras significativas (>= 3 letras) pertencem de fato ao texto original
  const palavrasSignificativas = trechoSimp
    .split(' ')
    .filter((w) => w.length >= 3);

  if (palavrasSignificativas.length === 0) {
    return textoSimples.includes(trechoSimp);
  }

  let encontradas = 0;
  for (const palavra of palavrasSignificativas) {
    if (textoSimples.includes(palavra)) {
      encontradas++;
    }
  }

  const proporcao = encontradas / palavrasSignificativas.length;
  return proporcao >= 0.75;
}

/**
 * Lista de agentes nulos reconhecidos oficialmente pelo manual de corretores do ENEM
 */
const AGENTES_NULOS = [
  'alguem',
  'ninguem',
  'alguns',
  'muitos',
  'poucos',
  'todos',
  'todos nos',
  'nos todos',
  'a gente',
  'a gente tem que',
  'nos',
  'eu',
  'voce',
  'voces',
  'cada um',
  'cada pessoa',
  'qualquer um',
  'qualquer pessoa',
  'quem sabe',
  'a sociedade como um todo',
  'o ser humano',
  'os seres humanos',
  'as pessoas',
  'todo mundo',
  'temos',
  'temos que',
  'precisamos',
  'precisamos de',
  'devemos',
  'podemos',
  'vamos',
];

export interface ValidationSummary {
  evidenciasSaneadas: ExtractedEvidence;
  desviosValidados: DesvioItem[];
  falhasSintaticasValidadas: FalhaSintaticaItem[];
  desviosDescartadosPorAlucinacao: DesvioItem[];
  avisosAuditoria: string[];
}

/**
 * Une palavras divididas na troca de linha ("sa-\ncrifícios" -> "sacrifícios").
 */
export function unirTranslineacao(texto: string): string {
  return (texto || '').replace(/(\p{L})-[ \t]*\r?\n[ \t]*(\p{L})/gu, '$1$2');
}

/**
 * Compara mantendo acentos e pontuação (para não confundir "errôneamente" com "erroneamente").
 */
function normalizarParaComparacao(texto: string): string {
  return (texto || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function validarEvidenciasAntiAlucinacao(
  textoRedacaoBruto: string,
  rawEvidence: ExtractedEvidence,
  modalidade: InputModality = 'text'
): ValidationSummary {
  const textoRedacao = unirTranslineacao(textoRedacaoBruto);
  const textoSimples = simplificar(textoRedacao);
  const avisosAuditoria: string[] = [];
  const desviosValidados: DesvioItem[] = [];
  const desviosDescartadosPorAlucinacao: DesvioItem[] = [];
  const falhasSintaticasValidadas: FalhaSintaticaItem[] = [];

  // 1. Validação C1: Desvios (exige substring exata para não inventar erro ortográfico/gramatical)
  if (Array.isArray(rawEvidence.desvios_identificados)) {
    for (const d of rawEvidence.desvios_identificados) {
      if (!d?.trecho_original || d.trecho_original.trim().length === 0) continue;

      // Falso positivo: a "correção" proposta é idêntica ao que o candidato escreveu
      if (
        typeof d.forma_correta === 'string' &&
        d.forma_correta.trim().length > 0 &&
        normalizarParaComparacao(d.forma_correta) === normalizarParaComparacao(d.trecho_original)
      ) {
        desviosDescartadosPorAlucinacao.push(d);
        avisosAuditoria.push(`Desvio descartado: a forma correta proposta é idêntica ao original ("${d.trecho_original}").`);
        continue;
      }

      if (trechoExisteNoTexto(textoSimples, unirTranslineacao(d.trecho_original), false)) {
        desviosValidados.push(d);
      } else {
        desviosDescartadosPorAlucinacao.push(d);
        avisosAuditoria.push(`Desvio descartado por não existir no texto original: "${d.trecho_original}"`);
      }
    }
  }

  // 2. Validação C1: Falhas Sintáticas (truncamento / justaposição)
  if (Array.isArray(rawEvidence.falhas_sintaticas)) {
    for (const f of rawEvidence.falhas_sintaticas) {
      if (!f?.trecho_original || f.trecho_original.trim().length === 0) continue;

      if (trechoExisteNoTexto(textoSimples, f.trecho_original, false)) {
        falhasSintaticasValidadas.push(f);
      } else {
        avisosAuditoria.push(`Falha sintática descartada por não existir no texto: "${f.trecho_original}"`);
      }
    }
  }

  // 3. Validação C4: Inadequações Coesivas, Monobloco e Partes do Texto
  const inadequacoesValidadas = Array.isArray(rawEvidence.inadequacoes_coesivas)
    ? rawEvidence.inadequacoes_coesivas.filter((inad) => {
        if (!inad?.conectivo) return false;
        const existe = trechoExisteNoTexto(textoSimples, inad.conectivo, false);
        if (!existe) {
          avisosAuditoria.push(`Inadequação coesiva descartada por não constar no texto: "${inad.conectivo}"`);
        }
        return existe;
      })
    : [];

  const paragrafosReais = (textoRedacao || '')
    .split(/\r?\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // Determinação segura de monobloco:
  // - Se for texto digitado e tiver 2 ou mais parágrafos separados por quebra de linha, NÃO é monobloco.
  // - Se for imagem/PDF manuscrito, confia na inspeção visual da folha (rawEvidence.eh_monobloco).
  let ehMonoblocoSaneado = Boolean(rawEvidence.eh_monobloco);
  if (modalidade === 'text' && paragrafosReais.length >= 2) {
    ehMonoblocoSaneado = false;
  }

  // Na Grade C2 do ENEM, "3 partes do texto" significa Introdução, Desenvolvimento e Conclusão (máx 3 partes macroestruturais).
  let qtdPartesMacro = rawEvidence.qtd_partes_texto ?? 3;
  if (ehMonoblocoSaneado) {
    qtdPartesMacro = Math.min(qtdPartesMacro, 1);
  } else if (modalidade === 'text' && paragrafosReais.length === 2) {
    qtdPartesMacro = Math.min(qtdPartesMacro, 2);
  } else if (qtdPartesMacro > 3) {
    qtdPartesMacro = 3;
  }

  // 4. Validação C5: Agente Nulo e Citações dos 5 Elementos (tolerando orações intercaladas como aposto/detalhamento no meio do efeito/ação)
  const proposta = {
    eh_estrutura_condicional: false,
    desrespeita_direitos_humanos: false,
    nao_relacionada_ao_assunto: false,
    ...(rawEvidence.proposta_intervencao || {}),
  };

  if (proposta.agente && proposta.agente.trecho) {
    const agenteSimples = simplificar(proposta.agente.trecho);
    const contemIndicadorOculto = /\b(oculto|implicito|desinencial|indeterminado|inexistente|eliptico)\b/.test(
      agenteSimples
    );
    const ehNulo =
      contemIndicadorOculto ||
      AGENTES_NULOS.some(
        (nulo) =>
          agenteSimples === nulo ||
          agenteSimples === `o ${nulo}` ||
          agenteSimples === `a ${nulo}` ||
          agenteSimples === `os ${nulo}` ||
          agenteSimples === `as ${nulo}`
      );
    if (ehNulo) {
      proposta.agente = {
        ...proposta.agente,
        valido: false,
        nulo_motivo: 'Agente considerado nulo/indeterminado pela banca do ENEM',
      };
      avisosAuditoria.push(`Agente anulado por indefinição ("${proposta.agente.trecho}")`);
    }
  }

  // Validação C5: Existência das citações dos 5 elementos no texto (com tolerância a aposto/detalhamento intercalado)
  const elementos = ['agente', 'acao', 'meio_modo', 'efeito', 'detalhamento'] as const;
  for (const elem of elementos) {
    const item = proposta[elem];
    if (item && item.trecho) {
      if (!trechoExisteNoTexto(textoSimples, item.trecho, true)) {
        proposta[elem] = { ...item, valido: false };
        avisosAuditoria.push(`Elemento ${elem.toUpperCase()} invalidado: trecho não localizado no texto original.`);
      }
    }
  }

  // Clonagem saneada das evidências com arrays garantidos
  const evidenciasSaneadas: ExtractedEvidence = {
    ...rawEvidence,
    desvios_identificados: desviosValidados,
    falhas_sintaticas: falhasSintaticasValidadas,
    partes_embrionarias_indices: Array.isArray(rawEvidence.partes_embrionarias_indices)
      ? rawEvidence.partes_embrionarias_indices
      : [],
    repertorios: Array.isArray(rawEvidence.repertorios) ? rawEvidence.repertorios : [],
    inadequacoes_coesivas: inadequacoesValidadas,
    repeticoes_excessivas_palavras: Array.isArray(rawEvidence.repeticoes_excessivas_palavras)
      ? rawEvidence.repeticoes_excessivas_palavras
      : [],
    eh_monobloco: ehMonoblocoSaneado,
    qtd_partes_texto: qtdPartesMacro,
    proposta_intervencao: proposta,
  };

  return {
    evidenciasSaneadas,
    desviosValidados,
    falhasSintaticasValidadas,
    desviosDescartadosPorAlucinacao,
    avisosAuditoria,
  };
}
