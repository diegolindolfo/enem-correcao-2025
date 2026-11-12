export type AnulacaoMotivoHierarquia =
  // 1. FORMAS ELEMENTARES DE ANULAÇÃO (Prioridade máxima)
  | 'PROVA_ASSINADA'
  | 'DESENHO_OU_EMOJI'
  | 'NUMERO_ISOLADO'
  | 'SINAL_GRAFICO_ISOLADO'
  | 'ANULACAO_PROPOSITAL'
  | 'TEXTO_ILEGIVEL'
  | 'LINGUA_ESTRANGEIRA'
  | 'MENOS_DE_8_LINHAS_MANUSCRITO'
  // 2. CÓPIA
  | 'COPIA_MOTIVADORES'
  // 3. FUGA AO TEMA
  | 'FUGA_AO_TEMA'
  // 4. NÃO ATENDIMENTO AO TIPO TEXTUAL
  | 'NAO_ATENDIMENTO_TIPO_TEXTUAL'
  // 5. PARTE DESCONECTADA (Prioridade final na hierarquia)
  | 'IMPROPERIO'
  | 'OFENSA'
  | 'ZOMBARIA'
  | 'IDENTIFICACAO_CORPO_TEXTO'
  | 'REFLEXAO_SOBRE_PROVA'
  | 'RECADO_BILHETE'
  | 'ORACAO_RELIGIOSA'
  | 'MENSAGEM_POLITICA'
  | 'TEXTO_SOBRE_OUTRO_ASSUNTO'
  | 'MENSAGEM_DESCONECTADA';

export type InputModality = 'text' | 'handwritten_media';

export interface DesvioItem {
  trecho_original: string;
  forma_correta?: string;
  tipo: 'gramatical' | 'ortografia' | 'pontuacao' | 'escolha_vocabular' | 'convencoes_escrita';
  explicacao_curta: string;
}

export interface FalhaSintaticaItem {
  trecho_original: string;
  tipo: 'truncamento' | 'justaposicao' | 'outro';
  explicacao_curta: string;
}

export interface RepertorioItem {
  trecho_citado: string;
  fonte_ou_area: string;
  legitimado: boolean;
  pertinente: boolean;
  uso_produtivo: boolean;
  baseado_textos_motivadores: boolean;
}

export interface ElementosC5 {
  agente?: { trecho: string; valido: boolean; nulo_motivo?: string };
  acao?: { trecho: string; valido: boolean; nulo_motivo?: string };
  meio_modo?: { trecho: string; valido: boolean; nulo_motivo?: string };
  efeito?: { trecho: string; valido: boolean; nulo_motivo?: string };
  detalhamento?: { trecho: string; valido: boolean; elemento_detalhado?: string };
  eh_estrutura_condicional?: boolean;
  desrespeita_direitos_humanos?: boolean;
  nao_relacionada_ao_assunto?: boolean;
}

export interface ExtractedEvidence {
  // Transcrição integral fiel (se a entrada for imagem/pdf manuscrito)
  transcricao?: string;
  total_linhas_manuscritas?: number;

  // Anulações detectadas
  anulacao_detectada?: {
    houve_anulacao: boolean;
    motivo_hierarquico?: AnulacaoMotivoHierarquia;
    evidencia_trecho?: string;
    explicacao?: string;
  };

  // C1
  qualidade_estrutura_sintatica: 'excelente' | 'boa' | 'regular' | 'deficitaria' | 'inexistente';
  falhas_sintaticas: FalhaSintaticaItem[];
  desvios_identificados: DesvioItem[];

  // C2
  abordagem_tema: 'completa' | 'tangencia' | 'fuga';
  tipo_textual: 'dissertativo_argumentativo' | 'outro_predominante' | 'tracos_constantes_outros';
  aglomerado_caotico_palavras: boolean;
  qtd_partes_texto: number; // 1, 2, 3 ou mais
  partes_embrionarias_indices: number[]; // índices dos parágrafos com até 2 linhas/ideia não desenvolvida
  conclusao_finalizada_ideia_incompleta: boolean;
  repertorios: RepertorioItem[];
  copia_excessiva_motivadores: boolean;

  // C3
  qualidade_projeto_texto: 'estrategico' | 'poucas_falhas' | 'algumas_falhas' | 'muitas_falhas' | 'sem_foco_ou_distorcido';
  desenvolvimento_argumentativo: 'todo_texto' | 'poucas_lacunas' | 'algumas_lacunas' | 'apenas_uma_informacao' | 'sem_desenvolvimento';
  possui_contradicao_grave: boolean;
  contradicao_trecho?: string;

  // C4
  presenca_coesivos: 'expressiva' | 'constante' | 'regular' | 'pontual' | 'rara' | 'ausente';
  conectivos_interparagrafos_contagem: number;
  inadequacoes_coesivas: Array<{ conectivo: string; contexto: string; explicacao: string }>;
  repeticoes_excessivas_palavras: string[];
  eh_monobloco: boolean;

  // C5
  proposta_intervencao: ElementosC5;
}

export interface CompetenciaScore {
  nivel: 0 | 1 | 2 | 3 | 4 | 5;
  pontos: number; // 0, 40, 80, 120, 160, 200
  travas_acionadas: string[];
  justificativa_oficial: string;
}

export interface GradingResult {
  redacao_id: string;
  anulada: boolean;
  motivo_anulacao?: AnulacaoMotivoHierarquia;
  justificativa_anulacao?: string;
  c1: CompetenciaScore;
  c2: CompetenciaScore;
  c3: CompetenciaScore;
  c4: CompetenciaScore;
  c5: CompetenciaScore;
  nota_total: number;
  evidencias_auditadas: ExtractedEvidence;
  desvios_c1_validados: DesvioItem[];
  copia_percentual?: number;
}
