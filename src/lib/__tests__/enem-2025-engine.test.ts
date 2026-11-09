import { describe, it, expect } from 'vitest';
import { calcularNotaEnem2025 } from '../enem-2025-engine';
import { validarEvidenciasAntiAlucinacao } from '../anti-hallucination-validator';
import { ExtractedEvidence } from '../enem-rubric-types';

const EVIDENCIA_BASE_NOTA_1000: ExtractedEvidence = {
  qualidade_estrutura_sintatica: 'excelente',
  falhas_sintaticas: [],
  desvios_identificados: [
    { trecho_original: 'palavra', tipo: 'ortografia', explicacao_curta: 'acento' },
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
      trecho_citado: 'Segundo Zygmunt Bauman...',
      fonte_ou_area: 'Sociologia',
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
  conectivos_interparagrafos_contagem: 2,
  inadequacoes_coesivas: [],
  repeticoes_excessivas_palavras: [],
  eh_monobloco: false,
  proposta_intervencao: {
    agente: { trecho: 'O Ministério da Educação', valido: true },
    acao: { trecho: 'deve criar oficinas escolares', valido: true },
    meio_modo: { trecho: 'por meio de verbas públicas', valido: true },
    efeito: { trecho: 'a fim de conscientizar os jovens', valido: true },
    detalhamento: { trecho: 'incluindo parcerias locais', valido: true },
    eh_estrutura_condicional: false,
    desrespeita_direitos_humanos: false,
    nao_relacionada_ao_assunto: false,
  },
};

describe('Motor Determinístico ENEM 2025 - Testes de Regras e Travas', () => {
  it('Deve atribuir Nota 1000 para redação que atende todos os requisitos de Nível 5', () => {
    const res = calcularNotaEnem2025('red-1', EVIDENCIA_BASE_NOTA_1000, 'text');
    expect(res.anulada).toBe(false);
    expect(res.c1.pontos).toBe(200);
    expect(res.c2.pontos).toBe(200);
    expect(res.c3.pontos).toBe(200);
    expect(res.c4.pontos).toBe(200);
    expect(res.c5.pontos).toBe(200);
    expect(res.nota_total).toBe(1000);
  });

  it('Hierarquia de Anulação: Forma Elementar (desenho) tem prioridade sobre Fuga ao Tema', () => {
    const ev: ExtractedEvidence = {
      ...EVIDENCIA_BASE_NOTA_1000,
      abordagem_tema: 'fuga',
      anulacao_detectada: {
        houve_anulacao: true,
        motivo_hierarquico: 'DESENHO_OU_EMOJI',
      },
    };
    const res = calcularNotaEnem2025('red-2', ev, 'text');
    expect(res.anulada).toBe(true);
    expect(res.motivo_anulacao).toBe('DESENHO_OU_EMOJI');
    expect(res.nota_total).toBe(0);
  });

  it('Regra de Linhas: <= 7 linhas anula em manuscrito mas NÃO anula em texto digitado', () => {
    const ev: ExtractedEvidence = {
      ...EVIDENCIA_BASE_NOTA_1000,
      total_linhas_manuscritas: 6,
    };
    const resManuscrito = calcularNotaEnem2025('red-3a', ev, 'handwritten_media');
    expect(resManuscrito.anulada).toBe(true);
    expect(resManuscrito.motivo_anulacao).toBe('MENOS_DE_8_LINHAS_MANUSCRITO');

    const resTexto = calcularNotaEnem2025('red-3b', ev, 'text');
    expect(resTexto.anulada).toBe(false);
    expect(resTexto.nota_total).toBe(1000);
  });

  it('Efeito Cascata do Tangenciamento: Trava C2 em 40, C3 em 40 e C5 em 40', () => {
    const ev: ExtractedEvidence = {
      ...EVIDENCIA_BASE_NOTA_1000,
      abordagem_tema: 'tangencia',
    };
    const res = calcularNotaEnem2025('red-4', ev, 'text');
    expect(res.c2.pontos).toBe(40);
    expect(res.c2.travas_acionadas).toContain('Trava C2 Nível 1: Tangência ao tema');
    expect(res.c3.pontos).toBe(40);
    expect(res.c3.travas_acionadas[0]).toContain('Trava em cascata C3 Nível 1');
    expect(res.c5.pontos).toBe(40);
    expect(res.c5.travas_acionadas[0]).toContain('Trava em cascata C5 Nível 1');
  });

  it('Trava C5 Nível 2: Ausência do elemento AÇÃO não deixa passar de 80 pontos (mesmo com 4 válidos)', () => {
    const ev: ExtractedEvidence = {
      ...EVIDENCIA_BASE_NOTA_1000,
      proposta_intervencao: {
        ...EVIDENCIA_BASE_NOTA_1000.proposta_intervencao,
        acao: { trecho: '', valido: false }, // Sem ação
      },
    };
    const res = calcularNotaEnem2025('red-5', ev, 'text');
    expect(res.c5.pontos).toBe(80);
    expect(res.c5.travas_acionadas).toContain(
      'Trava C5 Nível 2: Propostas em que não conste o elemento AÇÃO não devem ultrapassar este nível.'
    );
  });

  it('Trava C5 Nível 2: Estrutura condicional com 2 ou mais elementos não passa de 80 pontos', () => {
    const ev: ExtractedEvidence = {
      ...EVIDENCIA_BASE_NOTA_1000,
      proposta_intervencao: {
        ...EVIDENCIA_BASE_NOTA_1000.proposta_intervencao,
        eh_estrutura_condicional: true,
      },
    };
    const res = calcularNotaEnem2025('red-6', ev, 'text');
    expect(res.c5.pontos).toBe(80);
    expect(res.c5.travas_acionadas).toContain(
      'Trava C5 Nível 2: Estruturas condicionais com 2 ou mais elementos válidos não devem ultrapassar este nível.'
    );
  });

  it('Trava de Monobloco: Trava C4 em no máximo 80 pontos (Nível 2)', () => {
    const ev: ExtractedEvidence = {
      ...EVIDENCIA_BASE_NOTA_1000,
      eh_monobloco: true,
    };
    const res = calcularNotaEnem2025('red-7', ev, 'text');
    expect(res.c4.pontos).toBe(80);
    expect(res.c4.travas_acionadas).toContain(
      'Trava C4 Nível 2: Textos em forma de monobloco não devem ultrapassar este nível.'
    );
  });

  it('Trava C3: Contradição grave não deixa passar de 80 pontos (Nível 2)', () => {
    const ev: ExtractedEvidence = {
      ...EVIDENCIA_BASE_NOTA_1000,
      possui_contradicao_grave: true,
      contradicao_trecho: 'Disse que o problema não existe e depois pediu verba urgente.',
    };
    const res = calcularNotaEnem2025('red-8', ev, 'text');
    expect(res.c3.pontos).toBe(80);
    expect(res.c3.travas_acionadas).toContain(
      'Trava C3 Nível 2: Textos que apresentam contradição grave não devem ultrapassar este nível.'
    );
  });

  it('Caso Real ("O Senhor Estagiário"): C1 com 0 desvios/0 falhas = 200 pts E C5 Efeito com detalhamento intercalado = Válido (200 pts)', () => {
    const textoTranscrito = `No filme "O Senhor Estagiário", é retratada a dificuldade de inserção de um homem idoso no ambiente laboral.
Portanto, cabe às secretarias estaduais e municipais promover a disponibilidade de programas assistenciais à parcela idosa, mediante a destinação de verbas, a fim de garantir o acesso aos serviços fundamentais a esse grupo, a exemplo de atendimento médico, promovendo, assim, a qualidade de vida das pessoas idosas.`;

    const evBruta: ExtractedEvidence = {
      ...EVIDENCIA_BASE_NOTA_1000,
      qualidade_estrutura_sintatica: 'boa', // Mesmo que a IA marque "boa", tem 0 falhas sintáticas e 0 desvios!
      falhas_sintaticas: [],
      desvios_identificados: [],
      proposta_intervencao: {
        agente: { trecho: 'secretarias estaduais e municipais', valido: true },
        acao: { trecho: 'promover a disponibilidade de programas assistenciais à parcela idosa', valido: true },
        meio_modo: { trecho: 'mediante a destinação de verbas', valido: true },
        // Nota: no texto original, "a exemplo de atendimento médico" estava intercalado no meio do efeito!
        efeito: {
          trecho: 'a fim de garantir o acesso aos serviços fundamentais a esse grupo, promovendo, assim, a qualidade de vida das pessoas',
          valido: true,
        },
        detalhamento: { trecho: 'a exemplo de atendimento médico', valido: true },
        eh_estrutura_condicional: false,
        desrespeita_direitos_humanos: false,
        nao_relacionada_ao_assunto: false,
      },
    };

    const { evidenciasSaneadas } = validarEvidenciasAntiAlucinacao(
      textoTranscrito,
      evBruta,
      'handwritten_media'
    );
    const res = calcularNotaEnem2025('red-estagiario', evidenciasSaneadas, 'handwritten_media');

    expect(res.c1.pontos).toBe(200);
    expect(res.evidencias_auditadas.proposta_intervencao.efeito?.valido).toBe(true);
    expect(res.c5.pontos).toBe(200);
    expect(res.nota_total).toBe(1000);
  });
});
