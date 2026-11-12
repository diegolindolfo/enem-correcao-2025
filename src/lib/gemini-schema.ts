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
      description: 'Abordagem do tema proposto ("completa" se discute o tema/envelhecimento; "tangencia" apenas se NÃO menciona o núcleo do tema, tratando só do assunto amplo).',
    },
    tipo_textual: {
      type: Type.STRING,
      enum: ['dissertativo_argumentativo', 'outro_predominante', 'tracos_constantes_outros'],
      description:
        'Use "tracos_constantes_outros" quando o texto apresentar traços constantes de relato/desabafo pessoal em 1ª pessoa (ex.: narrar como se fosse um idoso desabafando sobre os próprios filhos por um parágrafo inteiro) e/ou injunção/apelo moral constante ("precisamos ter amor e paciência") sem estrutura dissertativa tripartite (ex.: apenas 2 parágrafos). Use "dissertativo_argumentativo" quando houver estrutura dissertativa em 3 partes.',
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

REGRAS DE EXTRAÇÃO CALIBRADAS COM REDAÇÕES OFICIAIS DO INEP 2025:
1. MANUSCRITOS, RASURAS REGULAMENTARES E CABEÇALHO OFICIAL:
   - RASURAS: Conforme a instrução oficial da folha do ENEM, palavras ou sílabas riscadas com traço simples e seguidas/sobrepostas pelo respectivo substitutivo (ex.: riscar "necessárias" e escrever "suficientes" acima; riscar sílaba no fim da linha e escrever a palavra inteira na linha seguinte) são RASURAS REGULAMENTARES. Ignore a palavra riscada na transcrição e JAMAIS a aponte como desvio na C1.
   - CABEÇALHO DO FORMULÁRIO: O nome completo, assinatura, CPF, número de inscrição e códigos de barras situados no cabeçalho/rodapé oficial da folha (fora das linhas numeradas de 1 a 30) fazem parte do documento oficial e JAMAIS configuram "PROVA_ASSINADA" ou "IDENTIFICACAO_CORPO_TEXTO".
   - Na transcrição de manuscritos, transcreva fielmente o texto válido (pós-rasura) sem corrigir erros reais deixados pelo candidato e una palavras translineadas (divididas por hífen na quebra de linha).

2. DESVIOS E FALHAS SINTÁTICAS (C1):
   - Inspecione linha por linha as categorias da C1:
     a) Acentuação gráfica (ex.: "errôneamente" -> "erroneamente", "maximo" -> "máximo", "Familia" -> "família", "Tedio" -> "tédio", "Historia" -> "história");
     b) Ortografia e parônimos (ex.: "experenciada" -> "experienciada", "alcansar" -> "alcançar", "Presensiar" -> "presenciar", "Mais Sim" -> "mas sim", "Por que" inicial causal -> "Porque");
     c) Convenções da escrita: uso indevido de letras maiúsculas no meio da frase em palavras comuns ("Eu", "De", "Ela", "Pai", "Dele", "Velhice", "Historia", "Temos Que Aproveitar");
     d) Concordância verbal e nominal (ex.: "a fase final... e morte são retratados" -> "são retratadas"; "tem-se... perspectivas contrastantes" -> "têm-se"; "muitas pessoas maltrata" -> "maltratam"; "eles também cuidou" -> "cuidaram"; "nos maltrata e judeia" -> "maltratam e judiam"; "como se fosse nós mesmos" -> "fôssemos");
     e) Regência e colocação pronominal (ex.: "maltratar da gente" -> "maltratar a gente"; "corrigíamos eles" -> "os corrigíamos"; próclise obrigatória após conjunção subordinativa ou pronome relativo: "uma vez que tem-se" -> "uma vez que se tem", "o qual ambienta-se" -> "o qual se ambienta");
     f) Pontuação (ex.: vírgula antes de travessão ", -", vírgula unindo orações independentes sem conjunção).
   - NÃO CONFUNDA RECURSOS ESTILÍSTICOS DE TEXTOS NOTA 1000 COM DESVIO:
     • Uso de aspas para destacar expressões figuradas/irônicas ("descarte", "guardiã", "ser velho", "deixar morrer") está CORRETO;
     • Uso de parênteses ou travessões para intercalar exemplos, apostos ou explicações está CORRETO;
     • Formas variantes dicionarizadas no VOLP ("óptica" e "ótica") estão CORRETAS;
     • Verbos coordenados que compartilham o mesmo sujeito singular ("o preconceito perpetua... e desumaniza...") estão CORRETOS.
   - O campo "trecho_original" DEVE ser uma cópia literal idêntica à grafia do candidato (inclua pelo menos 2 palavras quando o desvio envolver crase, pontuação ou monossílabo como "a" ou "e", ex.: "ir a praia" -> "ir à praia").
   - Para cada desvio, preencha "forma_correta" com o mesmo trecho corrigido. Se a forma correta for igual ao original, não é desvio: não registre.

3. TEMA E TIPO TEXTUAL (C2):
   - Classifique se o texto aborda o tema integralmente ("completa"), se apenas tangencia o tema ("tangencia") ou se foge completamente ("fuga"). Se o texto discute o recorte temático proposto, marque "completa".
   - Em "tipo_textual", marque "tracos_constantes_outros" quando o texto substituir a dissertação por desabafo/relato pessoal constante em 1ª pessoa e apelos morais sem as 3 partes dissertativas.
   - Identifique os repertórios socioculturais (obras literárias, filmes, conceitos filosóficos/sociológicos, legislação como CF/88, Estatuto do Idoso, LOA, Lei dos Sexagenários, projetos universitários, etc.), marcando "legitimado": true, "pertinente": true e "uso_produtivo": true quando articulados à discussão. Citações soltas na última frase de um texto sem desenvolvimento argumentativo têm "uso_produtivo": false.

4. PROJETO DE TEXTO E ARGUMENTAÇÃO (C3):
   - Marque "qualidade_projeto_texto": "estrategico" e "desenvolvimento_argumentativo": "todo_texto" quando o texto apresentar tese clara na introdução, desdobramento nos dois parágrafos de desenvolvimento (com causas/consequências e fundamentação) e retomada na conclusão (admitindo-se deslizes pontuais).
   - Marque "qualidade_projeto_texto": "muitas_falhas" e "desenvolvimento_argumentativo": "apenas_uma_informacao" (ou "sem_desenvolvimento") quando o texto se basear apenas em casos familiares pessoais, conselhos soltos ou repetição circular da mesma opinião sem fundamentação.

5. COESÃO (C4):
   - Conte em "conectivos_interparagrafos_contagem" os operadores argumentativos/coesivos interparágrafos que articulam a abertura dos parágrafos, tanto no início imediato (ex.: "Sob esse prisma", "Diante desse cenário", "De início", "Historicamente", "Por outro lado", "Ademais", "Outrossim", "Além disso", "Portanto", "Dessa forma", "Em síntese") quanto intercalados na primeira oração do parágrafo (ex.: "É premente, portanto, uma medida...", "Para além da literatura, contudo, ...").
   - Inícios puramente narrativos/verbais sem operador argumentativo ("Em casa...", "Vendo que...", "Entendo que...", "Depois que...") NÃO contam como conectivo interparágrafo.
   - Liste em "repeticoes_excessivas_palavras" apenas vocábulos ou expressões repetidos de modo vicioso/excessivo (ex.: repetir "a gente", "então", "muitas vezes" dezenas de vezes). Retomadas temáticas naturais do tema ("idosos", "envelhecimento", "sociedade") NÃO são repetições excessivas.

6. PROPOSTA DE INTERVENÇÃO (C5):
   - Identifique com exatidão as citações dos 5 elementos da proposta mais completa: Agente, Ação, Meio/Modo, Efeito e Detalhamento.
   - Os 5 elementos podem estar em um único período ou distribuídos em períodos consecutivos articulados por retomada anafórica (ex.: "Logo, cabe ao Poder Executivo Federal - mais especificamente ao Ministério dos Direitos Humanos - fomentar o respeito à terceira idade. Tal ação ocorrerá por meio da criação do 'Projeto Nacional Vida Feliz'...").
   - O MEIO/MODO pode vir antes ou depois da Ação (ex.: "é necessário que o Ministério da Educação, por meio de iniciativas de capacitação..., atue na formação dessas pessoas").
   - São DETALHAMENTOS VÁLIDOS: apostos explicativos ou especificadores do agente ("responsável pelo bem-estar social", "principal idealizador e aplicador das políticas públicas do país", "— órgão responsável pelas diretrizes nacionais do sistema de saúde —", "— mais especificamente ao Ministério dos Direitos Humanos —"), exemplificações entre parênteses ou travessões ("(por exemplo, a Globo e a Vitrine)", "(a exemplo de atendimento médico)", "como dança e pintura", "— ministrados por idosos —", "— como o 'projeto envelhecer' do Cin-UFPE —") e desdobramentos do efeito ("culminando na promoção da dignidade...", "promovendo, assim, a qualidade de vida...").
   - Agentes indeterminados, pronomes de 1ª pessoa do plural ("nós", "todos nós", "a gente") ou sujeito oculto em verbos ("temos que", "precisamos") são AGENTES NULOS ("valido": false).
   - Duas ações coordenadas ("Temos que aproveitar... e não deixar...") contam como uma única AÇÃO; só marque EFEITO quando houver finalidade/consequência explícita ("para", "para que", "a fim de", "com o fito de", "com a finalidade de", "com o objetivo de", "de modo a", "promovendo assim").

7. HIERARQUIA DE ANULAÇÃO:
   - Verifique sinais gráficos isolados, desenhos, emoticons, assinaturas DENTRO do corpo das 30 linhas, orações religiosas, ofensas, zombaria, impropérios ou frases desconectadas.`;
