import {
  ExtractedEvidence,
  GradingResult,
  CompetenciaScore,
  InputModality,
  AnulacaoMotivoHierarquia,
} from './enem-rubric-types';

/**
 * Ordem hierárquica oficial de anulação (Página 2 da Grade 2025):
 * Quanto menor o índice, maior a prioridade de anulação.
 */
const HIERARQUIA_ANULACAO_ORDEM: AnulacaoMotivoHierarquia[] = [
  // Formas Elementares de Anulação
  'PROVA_ASSINADA',
  'DESENHO_OU_EMOJI',
  'NUMERO_ISOLADO',
  'SINAL_GRAFICO_ISOLADO',
  'ANULACAO_PROPOSITAL',
  'TEXTO_ILEGIVEL',
  'LINGUA_ESTRANGEIRA',
  'MENOS_DE_8_LINHAS_MANUSCRITO',
  // Cópia
  'COPIA_MOTIVADORES',
  // Fuga ao Tema
  'FUGA_AO_TEMA',
  // Não Atendimento ao Tipo Textual
  'NAO_ATENDIMENTO_TIPO_TEXTUAL',
  // Parte Desconectada
  'IMPROPERIO',
  'OFENSA',
  'ZOMBARIA',
  'IDENTIFICACAO_CORPO_TEXTO',
  'REFLEXAO_SOBRE_PROVA',
  'RECADO_BILHETE',
  'ORACAO_RELIGIOSA',
  'MENSAGEM_POLITICA',
  'TEXTO_SOBRE_OUTRO_ASSUNTO',
  'MENSAGEM_DESCONECTADA',
];

export function calcularNotaEnem2025(
  redacaoId: string,
  evidencias: ExtractedEvidence,
  modalidade: InputModality,
  copiaPercentual?: number
): GradingResult {
  // -------------------------------------------------------------
  // PASSO 1: VERIFICAÇÃO DE ANULAÇÃO (Página 2 - Situações)
  // -------------------------------------------------------------

  const motivosAnulacaoCandidatos: AnulacaoMotivoHierarquia[] = [];

  // Checagem de linhas físicas (APENAS PARA MANUSCRITOS)
  if (modalidade === 'handwritten_media' && typeof evidencias.total_linhas_manuscritas === 'number') {
    if (evidencias.total_linhas_manuscritas <= 7) {
      motivosAnulacaoCandidatos.push('MENOS_DE_8_LINHAS_MANUSCRITO');
    }
  }

  // Cópia massiva
  if (copiaPercentual !== undefined && copiaPercentual >= 70) {
    motivosAnulacaoCandidatos.push('COPIA_MOTIVADORES');
  }

  // Fuga ao tema
  if (evidencias.abordagem_tema === 'fuga') {
    motivosAnulacaoCandidatos.push('FUGA_AO_TEMA');
  }

  // Não atendimento ao tipo textual
  if (evidencias.tipo_textual === 'outro_predominante') {
    motivosAnulacaoCandidatos.push('NAO_ATENDIMENTO_TIPO_TEXTUAL');
  }

  // Motivos diretos trazidos pela evidência da IA
  if (evidencias.anulacao_detectada?.houve_anulacao && evidencias.anulacao_detectada.motivo_hierarquico) {
    motivosAnulacaoCandidatos.push(evidencias.anulacao_detectada.motivo_hierarquico);
  }

  if (motivosAnulacaoCandidatos.length > 0) {
    // Escolhe o motivo de maior prioridade segundo a hierarquia
    motivosAnulacaoCandidatos.sort((a, b) => {
      const idxA = HIERARQUIA_ANULACAO_ORDEM.indexOf(a);
      const idxB = HIERARQUIA_ANULACAO_ORDEM.indexOf(b);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });

    const motivoEscolhido = motivosAnulacaoCandidatos[0];
    const scoreZero: CompetenciaScore = {
      nivel: 0,
      pontos: 0,
      travas_acionadas: [`Redação anulada por: ${motivoEscolhido}`],
      justificativa_oficial: 'Redação com nota zero geral devido a critério eliminatório da Grade.',
    };

    return {
      redacao_id: redacaoId,
      anulada: true,
      motivo_anulacao: motivoEscolhido,
      justificativa_anulacao: `Nota zero conforme hierarquia da Grade 2025: ${motivoEscolhido}.`,
      c1: scoreZero,
      c2: scoreZero,
      c3: scoreZero,
      c4: scoreZero,
      c5: scoreZero,
      nota_total: 0,
      evidencias_auditadas: evidencias,
      desvios_c1_validados: evidencias.desvios_identificados,
      copia_percentual: copiaPercentual,
    };
  }

  // -------------------------------------------------------------
  // PASSO 2: CÁLCULO DAS 5 COMPETÊNCIAS (Página 1 da Grade)
  // -------------------------------------------------------------

  const tangenciaTema = evidencias.abordagem_tema === 'tangencia';

  // --- COMPETÊNCIA I ---
  const qtdDesvios = (evidencias.desvios_identificados || []).length;
  const qtdFalhasSintaticas = (evidencias.falhas_sintaticas || []).length;
  const estrutura = evidencias.qualidade_estrutura_sintatica || 'regular';
  const ehDeficitaria = estrutura === 'deficitaria' || qtdFalhasSintaticas >= 6;
  const temMuitosDesvios = qtdDesvios >= 8;

  let nivelC1: 0 | 1 | 2 | 3 | 4 | 5 = 3;
  let justificativaC1 = '';
  const travasC1: string[] = [];

  if (estrutura === 'inexistente') {
    nivelC1 = 0;
    justificativaC1 = 'Estrutura sintática inexistente (independentemente da quantidade de desvios).';
  } else if (ehDeficitaria && temMuitosDesvios) {
    nivelC1 = 1;
    justificativaC1 = `Estrutura sintática deficitária (${qtdFalhasSintaticas} falha(s)) COM muitos desvios (${qtdDesvios} desvio(s)).`;
  } else if (ehDeficitaria || temMuitosDesvios) {
    nivelC1 = 2;
    justificativaC1 = `Estrutura sintática deficitária (${qtdFalhasSintaticas} falha(s)) OU muitos desvios (${qtdDesvios} desvio(s)).`;
  } else if (qtdFalhasSintaticas <= 1 && qtdDesvios <= 2) {
    nivelC1 = 5;
    justificativaC1 = `Estrutura sintática excelente (${qtdFalhasSintaticas} falha(s) sintática(s), máx. 1) E, no máximo, dois desvios (${qtdDesvios} desvio(s) registrado(s)).`;
  } else if (qtdFalhasSintaticas <= 3 && qtdDesvios <= 4) {
    nivelC1 = 4;
    justificativaC1 = `Estrutura sintática boa (${qtdFalhasSintaticas} falha(s) sintática(s)) E poucos desvios (${qtdDesvios} desvio(s) registrado(s)).`;
  } else {
    nivelC1 = 3;
    justificativaC1 = `Estrutura sintática regular (${qtdFalhasSintaticas} falha(s) sintática(s)) E alguns desvios (${qtdDesvios} desvio(s) registrado(s)).`;
  }

  // --- COMPETÊNCIA II ---
  let nivelC2: 0 | 1 | 2 | 3 | 4 | 5 = 2;
  let justificativaC2 = '';
  const travasC2: string[] = [];

  if (
    tangenciaTema ||
    evidencias.aglomerado_caotico_palavras ||
    evidencias.tipo_textual === 'tracos_constantes_outros'
  ) {
    nivelC2 = 1;
    justificativaC2 = 'Tangência ao tema OU texto com traços constantes de outros tipos textuais.';
    if (tangenciaTema) travasC2.push('Trava C2 Nível 1: Tangência ao tema');
  } else {
    // Abordagem completa do tema
    const qtdPartes = evidencias.qtd_partes_texto ?? 3;
    const qtdEmbrionarias = (evidencias.partes_embrionarias_indices || []).length;
    const conclusaoIncompleta = Boolean(evidencias.conclusao_finalizada_ideia_incompleta);
    const copiaExcessiva = Boolean(evidencias.copia_excessiva_motivadores) || (copiaPercentual !== undefined && copiaPercentual >= 25);

    // Repertório mais forte do texto
    const reps = evidencias.repertorios || [];
    const temLegitimoPertinenteProdutivo = reps.some((r) => r.legitimado && r.pertinente && r.uso_produtivo && !r.baseado_textos_motivadores);
    const temLegitimoPertinenteSemProdutivo = reps.some((r) => r.legitimado && r.pertinente && !r.uso_produtivo && !r.baseado_textos_motivadores);

    if (!evidencias.eh_monobloco && (qtdPartes < 3 || qtdEmbrionarias >= 2 || conclusaoIncompleta)) {
      nivelC2 = 2;
      justificativaC2 = 'Abordagem completa do tema E 2 partes do texto OU 2 partes embrionárias OU conclusão finalizada por ideia incompleta.';
      if (conclusaoIncompleta) travasC2.push('Trava C2 Nível 2: Conclusão finalizada por ideia incompleta');
    } else if (
      qtdPartes >= 3 &&
      qtdEmbrionarias === 0 &&
      temLegitimoPertinenteProdutivo &&
      !copiaExcessiva
    ) {
      nivelC2 = 5;
      justificativaC2 = 'Abordagem completa do tema E 3 partes do texto (nenhuma embrionária) E Repertório legitimado E pertinente, COM uso produtivo.';
    } else if (
      qtdPartes >= 3 &&
      qtdEmbrionarias === 0 &&
      temLegitimoPertinenteSemProdutivo &&
      !copiaExcessiva
    ) {
      nivelC2 = 4;
      justificativaC2 = 'Abordagem completa do tema E 3 partes do texto (nenhuma embrionária) E Repertório legitimado E pertinente, SEM uso produtivo.';
    } else {
      nivelC2 = 3;
      justificativaC2 = 'Abordagem completa do tema E 3 partes do texto (1 pode ser embrionária) E Repertório baseado nos motivadores ou não legitimado/pertinente.';
    }

    // Travas de teto C2:
    if (copiaExcessiva && nivelC2 > 2) {
      nivelC2 = 2;
      travasC2.push('Trava C2 Nível 2: Redações com muitos trechos de cópia não devem ultrapassar este nível.');
    }

    // Trava de monobloco na C2 (não é possível reconhecer as 3 partes) -> teto Nível 3
    if (evidencias.eh_monobloco && nivelC2 > 3) {
      nivelC2 = 3;
      travasC2.push('Trava C2 Nível 3: Redações em que não é possível reconhecer as 3 partes (monobloco) não devem ultrapassar este nível.');
    }

    // Trava de linhas (somente manuscrito)
    if (
      modalidade === 'handwritten_media' &&
      typeof evidencias.total_linhas_manuscritas === 'number' &&
      evidencias.total_linhas_manuscritas <= 8 &&
      nivelC2 > 3
    ) {
      nivelC2 = 3;
      travasC2.push('Trava C2 Nível 3: Redações com até 8 linhas não devem ultrapassar este nível.');
    }
  }

  // --- COMPETÊNCIA III ---
  let nivelC3: 0 | 1 | 2 | 3 | 4 | 5 = 3;
  let justificativaC3 = '';
  const travasC3: string[] = [];

  if (evidencias.aglomerado_caotico_palavras) {
    nivelC3 = 0;
    justificativaC3 = 'Aglomerado caótico de palavras, independentemente da abordagem do tema.';
  } else if (tangenciaTema || evidencias.qualidade_projeto_texto === 'sem_foco_ou_distorcido') {
    nivelC3 = 1;
    justificativaC3 = 'Projeto de texto sem foco temático ou com foco distorcido.';
    if (tangenciaTema) {
      travasC3.push('Trava em cascata C3 Nível 1: Textos tangentes não devem ultrapassar este nível.');
    }
  } else {
    const proj = evidencias.qualidade_projeto_texto;
    const desenv = evidencias.desenvolvimento_argumentativo;

    const mapaProj: Record<string, number> = {
      estrategico: 5,
      poucas_falhas: 4,
      algumas_falhas: 3,
      muitas_falhas: 2,
      sem_foco_ou_distorcido: 1,
    };
    const mapaDesenv: Record<string, number> = {
      todo_texto: 5,
      poucas_lacunas: 4,
      algumas_lacunas: 3,
      apenas_uma_informacao: 2,
      sem_desenvolvimento: 2,
    };

    const nProj = mapaProj[proj] ?? 3;
    const nDesenv = mapaDesenv[desenv] ?? 3;
    // Conectivo lógico E da Grade C3: exige ambos os critérios no nível correspondente
    const nivelCombinadoC3 = Math.min(nProj, nDesenv);

    if (nivelCombinadoC3 === 5) {
      nivelC3 = 5;
      justificativaC3 = 'Projeto de texto estratégico E Desenvolvimento de informações, fatos e opiniões em todo o texto (admitindo-se deslizes pontuais).';
    } else if (nivelCombinadoC3 === 4) {
      nivelC3 = 4;
      justificativaC3 = 'Projeto de texto com poucas falhas E Desenvolvimento de informações, fatos e opiniões com poucas lacunas.';
    } else if (nivelCombinadoC3 === 3) {
      nivelC3 = 3;
      justificativaC3 = 'Projeto de texto com algumas falhas E Desenvolvimento de informações, fatos e opiniões com algumas lacunas.';
    } else {
      nivelC3 = 2;
      justificativaC3 = 'Projeto de texto com muitas falhas E Sem desenvolvimento ou com desenvolvimento de apenas uma informação, fato ou opinião.';
    }

    // Trava C3: Contradição Grave
    if (evidencias.possui_contradicao_grave && nivelC3 > 2) {
      nivelC3 = 2;
      travasC3.push('Trava C3 Nível 2: Textos que apresentam contradição grave não devem ultrapassar este nível.');
    }
  }

  // --- COMPETÊNCIA IV ---
  let nivelC4: 0 | 1 | 2 | 3 | 4 | 5 = 3;
  let justificativaC4 = '';
  const travasC4: string[] = [];

  const coesivos = evidencias.presenca_coesivos;
  const qtdInadequacoes = evidencias.inadequacoes_coesivas?.length || 0;
  const qtdRepeticoes = evidencias.repeticoes_excessivas_palavras?.length || 0;
  const interparagrafos = evidencias.conectivos_interparagrafos_contagem || 0;

  if (coesivos === 'ausente') {
    nivelC4 = 0;
    justificativaC4 = 'Ausência de articulação: palavras e/ou períodos desconexos ao longo de todo o texto.';
  } else if (coesivos === 'rara' || qtdRepeticoes >= 6 || qtdInadequacoes >= 5) {
    nivelC4 = 1;
    justificativaC4 = 'Presença rara de elementos coesivos E/OU excessivas repetições E/OU excessivas inadequações.';
  } else if (
    coesivos === 'expressiva' &&
    interparagrafos >= 2 &&
    qtdRepeticoes <= 1 &&
    qtdInadequacoes === 0
  ) {
    nivelC4 = 5;
    justificativaC4 = 'Presença expressiva de elementos coesivos intra e interparágrafos E raras ou ausentes repetições E sem inadequação.';
  } else if (
    (coesivos === 'constante' || coesivos === 'expressiva') &&
    qtdInadequacoes <= 2 &&
    qtdRepeticoes <= 3
  ) {
    nivelC4 = 4;
    justificativaC4 = 'Presença constante de elementos coesivos intra e/ou interparágrafos E/OU poucas repetições E/OU poucas inadequações.';
  } else if (
    (coesivos === 'regular' || coesivos === 'constante' || coesivos === 'expressiva') &&
    qtdInadequacoes <= 4 &&
    qtdRepeticoes <= 5
  ) {
    nivelC4 = 3;
    justificativaC4 = 'Presença regular de elementos coesivos E/OU algumas repetições E/OU algumas inadequações.';
  } else {
    nivelC4 = 2;
    justificativaC4 = 'Presença pontual de elementos coesivos intra e/ou interparágrafos E/OU muitas repetições E/OU muitas inadequações.';
  }

  // Trava C4: Monobloco
  if (evidencias.eh_monobloco && nivelC4 > 2) {
    nivelC4 = 2;
    travasC4.push('Trava C4 Nível 2: Textos em forma de monobloco não devem ultrapassar este nível.');
  }

  // --- COMPETÊNCIA V ---
  let nivelC5: 0 | 1 | 2 | 3 | 4 | 5 = 0;
  let justificativaC5 = '';
  const travasC5: string[] = [];

  const prop = evidencias.proposta_intervencao || {};

  if (prop.desrespeita_direitos_humanos) {
    nivelC5 = 0;
    justificativaC5 = 'Proposta de intervenção que desrespeita os direitos humanos (Nível 0 na C5).';
  } else if (prop.nao_relacionada_ao_assunto) {
    nivelC5 = 0;
    justificativaC5 = 'Proposta de intervenção não relacionada sequer ao assunto.';
  } else if (tangenciaTema) {
    nivelC5 = 1;
    justificativaC5 = 'Tangenciamento do tema.';
    travasC5.push('Trava em cascata C5 Nível 1: Tangenciamento do tema trava C5 no Nível 1.');
  } else {
    // Contagem de elementos válidos
    let elementosValidos = 0;
    if (prop.agente?.valido) elementosValidos++;
    if (prop.acao?.valido) elementosValidos++;
    if (prop.meio_modo?.valido) elementosValidos++;
    if (prop.efeito?.valido) elementosValidos++;
    if (prop.detalhamento?.valido) elementosValidos++;

    if (elementosValidos === 0) {
      nivelC5 = prop.agente || prop.acao ? 1 : 0;
      justificativaC5 = nivelC5 === 1 ? 'Apenas elemento(s) nulo(s).' : 'Ausência de proposta.';
    } else if (elementosValidos === 1) {
      nivelC5 = 1;
      justificativaC5 = '1 elemento válido.';
    } else if (elementosValidos === 2) {
      nivelC5 = 2;
      justificativaC5 = '2 elementos válidos.';
    } else if (elementosValidos === 3) {
      nivelC5 = 3;
      justificativaC5 = '3 elementos válidos.';
    } else if (elementosValidos === 4) {
      nivelC5 = 4;
      justificativaC5 = '4 elementos válidos.';
    } else {
      nivelC5 = 5;
      justificativaC5 = '5 elementos válidos (Agente, Ação, Meio/Modo, Efeito e Detalhamento).';
    }

    // Travas C5 Nível 2:
    // 1. Propostas em que não conste o elemento AÇÃO não devem ultrapassar o Nível 2
    if (!prop.acao?.valido && nivelC5 > 2) {
      nivelC5 = 2;
      travasC5.push('Trava C5 Nível 2: Propostas em que não conste o elemento AÇÃO não devem ultrapassar este nível.');
    }

    // 2. Estruturas condicionais com 2 ou mais elementos válidos não devem ultrapassar o Nível 2
    if (prop.eh_estrutura_condicional && elementosValidos >= 2 && nivelC5 > 2) {
      nivelC5 = 2;
      travasC5.push('Trava C5 Nível 2: Estruturas condicionais com 2 ou mais elementos válidos não devem ultrapassar este nível.');
    }
  }

  // Pontuação final
  const c1Score: CompetenciaScore = { nivel: nivelC1, pontos: nivelC1 * 40, travas_acionadas: travasC1, justificativa_oficial: justificativaC1 };
  const c2Score: CompetenciaScore = { nivel: nivelC2, pontos: nivelC2 * 40, travas_acionadas: travasC2, justificativa_oficial: justificativaC2 };
  const c3Score: CompetenciaScore = { nivel: nivelC3, pontos: nivelC3 * 40, travas_acionadas: travasC3, justificativa_oficial: justificativaC3 };
  const c4Score: CompetenciaScore = { nivel: nivelC4, pontos: nivelC4 * 40, travas_acionadas: travasC4, justificativa_oficial: justificativaC4 };
  const c5Score: CompetenciaScore = { nivel: nivelC5, pontos: nivelC5 * 40, travas_acionadas: travasC5, justificativa_oficial: justificativaC5 };

  const notaTotal = c1Score.pontos + c2Score.pontos + c3Score.pontos + c4Score.pontos + c5Score.pontos;

  return {
    redacao_id: redacaoId,
    anulada: false,
    c1: c1Score,
    c2: c2Score,
    c3: c3Score,
    c4: c4Score,
    c5: c5Score,
    nota_total: notaTotal,
    evidencias_auditadas: evidencias,
    desvios_c1_validados: evidencias.desvios_identificados,
    copia_percentual: copiaPercentual,
  };
}
