import { Type, Schema } from '@google/genai';

/**
 * Schema estrito (OpenAPI / Gemini SDK) para extração de evidências.
 * A IA NUNCA calcula nota: apenas cita trechos literais e classifica objetivamente.
 */
export const ENEM_EVIDENCE_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    transcricao: {
      type: Type.STRING,
      description: 'Transcrição literal e integral do texto (quando a entrada for imagem ou PDF manuscrito), PRESERVANDO todos os erros do candidato (grafia, acentuação, pontuação, maiúsculas) sem corrigir nada. Palavras divididas na troca de linha (ex.: "sa-" + "crifícios") devem ser unidas sem hífen ("sacrifícios"). Separe parágrafos com quebra de linha. Deixe vazio se já for texto digitado.',
    },
    total_linhas_manuscritas: {
      type: Type.INTEGER,
      description: 'Número de linhas físicas ocupadas na folha de redação oficial (somente para imagens/manuscritos).',
    },
    anulacao_detectada: {
      type: Type.OBJECT,
      properties: {
        houve_anulacao: { type: Type.BOOLEAN },
        motivo_hierarquico: {
          type: Type.STRING,
          enum: [
            'PROVA_ASSINADA',
            'DESENHO_OU_EMOJI',
            'NUMERO_ISOLADO',
            'SINAL_GRAFICO_ISOLADO',
            'ANULACAO_PROPOSITAL',
            'TEXTO_ILEGIVEL',
            'LINGUA_ESTRANGEIRA',
            'COPIA_MOTIVADORES',
            'FUGA_AO_TEMA',
            'NAO_ATENDIMENTO_TIPO_TEXTUAL',
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
          ],
        },
        evidencia_trecho: { type: Type.STRING },
        explicacao: { type: Type.STRING },
      },
      required: ['houve_anulacao'],
    },
    qualidade_estrutura_sintatica: {
      type: Type.STRING,
      enum: ['excelente', 'boa', 'regular', 'deficitaria', 'inexistente'],
      description: 'Classificação da estrutura sintática conforme a Grade C1.',
    },
    falhas_sintaticas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          trecho_original: { type: Type.STRING, description: 'Citação EXATA da falha sintática.' },
          tipo: { type: Type.STRING, enum: ['truncamento', 'justaposicao', 'outro'] },
          explicacao_curta: { type: Type.STRING },
        },
        required: ['trecho_original', 'tipo'],
      },
    },
    desvios_identificados: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          trecho_original: { type: Type.STRING, description: 'Citação LITERAL da palavra/termo com erro.' },
          forma_correta: {
            type: Type.STRING,
            description: 'Reescrita do MESMO trecho na forma correta da norma-padrão. Precisa ser diferente do trecho original. Se você não consegue escrever uma forma correta diferente, NÃO registre o desvio.',
          },
          tipo: {
            type: Type.STRING,
            enum: ['gramatical', 'ortografia', 'pontuacao', 'escolha_vocabular', 'convencoes_escrita'],
          },
          explicacao_curta: { type: Type.STRING },
        },
        required: ['trecho_original', 'forma_correta', 'tipo'],
      },
    },
    abordagem_tema: {
      type: Type.STRING,
      enum: ['completa', 'tangencia', 'fuga'],
      description: 'Abordagem do tema proposto.',
    },
    tipo_textual: {
      type: Type.STRING,
      enum: ['dissertativo_argumentativo', 'outro_predominante', 'tracos_constantes_outros'],
    },
    aglomerado_caotico_palavras: { type: Type.BOOLEAN },
    qtd_partes_texto: { type: Type.INTEGER, description: 'Quantidade de partes do texto (mínimo 3: introdução, desenvolvimento, conclusão).' },
    partes_embrionarias_indices: {
      type: Type.ARRAY,
      items: { type: Type.INTEGER },
      description: 'Índices dos parágrafos considerados partes embrionárias (com até 2 linhas ou sem desenvolvimento).',
    },
    conclusao_finalizada_ideia_incompleta: { type: Type.BOOLEAN },
    copia_excessiva_motivadores: { type: Type.BOOLEAN },
    repertorios: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          trecho_citado: { type: Type.STRING },
          fonte_ou_area: { type: Type.STRING },
          legitimado: { type: Type.BOOLEAN },
          pertinente: { type: Type.BOOLEAN },
          uso_produtivo: { type: Type.BOOLEAN },
          baseado_textos_motivadores: { type: Type.BOOLEAN },
        },
        required: ['trecho_citado', 'legitimado', 'pertinente', 'uso_produtivo'],
      },
    },
    qualidade_projeto_texto: {
      type: Type.STRING,
      enum: ['estrategico', 'poucas_falhas', 'algumas_falhas', 'muitas_falhas', 'sem_foco_ou_distorcido'],
    },
    desenvolvimento_argumentativo: {
      type: Type.STRING,
      enum: ['todo_texto', 'poucas_lacunas', 'algumas_lacunas', 'apenas_uma_informacao', 'sem_desenvolvimento'],
    },
    possui_contradicao_grave: { type: Type.BOOLEAN },
    contradicao_trecho: { type: Type.STRING },
    presenca_coesivos: {
      type: Type.STRING,
      enum: ['expressiva', 'constante', 'regular', 'pontual', 'rara', 'ausente'],
    },
    conectivos_interparagrafos_contagem: { type: Type.INTEGER },
    inadequacoes_coesivas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          conectivo: { type: Type.STRING },
          contexto: { type: Type.STRING },
          explicacao: { type: Type.STRING },
        },
        required: ['conectivo'],
      },
    },
    repeticoes_excessivas_palavras: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    eh_monobloco: { type: Type.BOOLEAN },
    proposta_intervencao: {
      type: Type.OBJECT,
      properties: {
        agente: {
          type: Type.OBJECT,
          properties: {
            trecho: { type: Type.STRING },
            valido: { type: Type.BOOLEAN },
            nulo_motivo: { type: Type.STRING },
          },
          required: ['trecho', 'valido'],
        },
        acao: {
          type: Type.OBJECT,
          properties: {
            trecho: { type: Type.STRING },
            valido: { type: Type.BOOLEAN },
            nulo_motivo: { type: Type.STRING },
          },
          required: ['trecho', 'valido'],
        },
        meio_modo: {
          type: Type.OBJECT,
          properties: {
            trecho: { type: Type.STRING },
            valido: { type: Type.BOOLEAN },
          },
          required: ['trecho', 'valido'],
        },
        efeito: {
          type: Type.OBJECT,
          properties: {
            trecho: { type: Type.STRING },
            valido: { type: Type.BOOLEAN },
          },
          required: ['trecho', 'valido'],
        },
        detalhamento: {
          type: Type.OBJECT,
          properties: {
            trecho: { type: Type.STRING },
            valido: { type: Type.BOOLEAN },
            elemento_detalhado: { type: Type.STRING },
          },
          required: ['trecho', 'valido'],
        },
        eh_estrutura_condicional: { type: Type.BOOLEAN },
        desrespeita_direitos_humanos: { type: Type.BOOLEAN },
        nao_relacionada_ao_assunto: { type: Type.BOOLEAN },
      },
      required: ['eh_estrutura_condicional', 'desrespeita_direitos_humanos', 'nao_relacionada_ao_assunto'],
    },
  },
  required: [
    'qualidade_estrutura_sintatica',
    'falhas_sintaticas',
    'desvios_identificados',
    'abordagem_tema',
    'tipo_textual',
    'aglomerado_caotico_palavras',
    'qtd_partes_texto',
    'conclusao_finalizada_ideia_incompleta',
    'qualidade_projeto_texto',
    'desenvolvimento_argumentativo',
    'possui_contradicao_grave',
    'presenca_coesivos',
    'conectivos_interparagrafos_contagem',
    'eh_monobloco',
    'proposta_intervencao',
  ],
};

export const ENEM_SYSTEM_INSTRUCTION = `Você é um avaliador e extrator de evidências extremamente rigoroso e factual da banca de correção da redação do ENEM, seguindo a Grade Específica de Avaliação Oficial 2025.

SUA ÚNICA TAREFA É EXTRAIR EVIDÊNCIAS FACTUAIS E CITAR TRECHOS EXATOS. VOCÊ NÃO ATRIBUI NOTAS NEM PONTOS (0 a 1000). O cálculo de notas é feito exclusivamente por código determinístico.

REGRAS DE EXTRAÇÃO:
1. DESVIOS E FALHAS SINTÁTICAS (C1):
   - Cite apenas palavras ou trechos que REALMENTE contenham erro gramatical, de concordância, regência, pontuação, crase, ortografia ou convenções da escrita.
   - O campo "trecho_original" DEVE ser uma cópia literal idêntica à grafia do candidato.
   - Para cada desvio, preencha "forma_correta" com o mesmo trecho corrigido. Se a forma correta for igual ao original, não é desvio: não registre.
   - Concordância: antes de apontar, identifique o núcleo do sujeito. Verbos coordenados com o mesmo sujeito singular ("X perpetua ... e desumaniza ...") estão CORRETOS.
   - Não invente erros e não aponte estilo pessoal como desvio.
   - Na transcrição de manuscritos, NUNCA corrija a grafia do candidato: um erro corrigido na transcrição é um desvio perdido.

2. TEMA E TIPO TEXTUAL (C2):
   - Classifique se o texto aborda o tema integralmente ("completa"), se apenas tangencia o tema ("tangencia") ou se foge completamente ("fuga").
   - Identifique os repertórios socioculturais utilizados, indicando se são legitimados por áreas do saber e se houve vínculo argumentativo direto ("uso_produtivo").
   - Aponte se a conclusão termina com ideia interrompida/incompleta.

3. PROJETO DE TEXTO E ARGUMENTAÇÃO (C3):
   - Avalie o planejamento argumentativo e se há lacunas no desenvolvimento dos argumentos.
   - Aponte se há contradição grave entre afirmações no texto.

4. COESÃO (C4):
   - Conte quantos conectivos interparágrafos interligam o início dos parágrafos (mínimo de 2 exigido para nível 5).
   - Aponte se há inadequação no sentido semântico de algum conectivo ou monobloco.

5. PROPOSTA DE INTERVENÇÃO (C5):
   - Identifique com exatidão as citações dos 5 elementos da proposta mais completa: Agente, Ação, Meio/Modo, Efeito e Detalhamento.
   - Indique se o agente é nulo (ex: "alguém", "a sociedade em geral", "a gente").
   - Marque "eh_estrutura_condicional" como true caso a proposta seja condicional ("Se o governo fizer X...", "Caso ocorra Y...").
   - Marque "desrespeita_direitos_humanos" como true caso fira a dignidade humana ou incite violência.

6. HIERARQUIA DE ANULAÇÃO:
   - Verifique sinais gráficos isolados, desenhos, emoticons, assinaturas, orações religiosas, ofensas, zombaria, impropérios ou frases desconectadas.`;
