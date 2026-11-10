import { describe, it, expect } from 'vitest';
import { validarEvidenciasAntiAlucinacao, unirTranslineacao } from '../anti-hallucination-validator';
import { ExtractedEvidence } from '../enem-rubric-types';

const base = (desvios: ExtractedEvidence['desvios_identificados']): ExtractedEvidence =>
  ({
    qualidade_estrutura_sintatica: 'boa',
    falhas_sintaticas: [],
    desvios_identificados: desvios,
    abordagem_tema: 'completa',
    tipo_textual: 'dissertativo_argumentativo',
    aglomerado_caotico_palavras: false,
    qtd_partes_texto: 3,
    partes_embrionarias_indices: [],
    conclusao_finalizada_ideia_incompleta: false,
    copia_excessiva_motivadores: false,
    repertorios: [],
    qualidade_projeto_texto: 'estrategico',
    desenvolvimento_argumentativo: 'completo',
    possui_contradicao_grave: false,
    presenca_coesivos: 'expressiva',
    conectivos_interparagrafos_contagem: 3,
    inadequacoes_coesivas: [],
    repeticoes_excessivas_palavras: [],
    eh_monobloco: false,
    proposta_intervencao: {
      eh_estrutura_condicional: false,
      desrespeita_direitos_humanos: false,
      nao_relacionada_ao_assunto: false,
    },
    anulacao_detectada: { houve_anulacao: false },
  }) as unknown as ExtractedEvidence;

const TEXTO =
  'O preconceito perpetua opiniões limitantes e desumaniza parcela da população.\n' +
  'Exalta-se a socialização, de encontro à inatividade errôneamente associ-\nada a essa fase, e a velhice experenciada pela personagem.';

describe('Validador C1 (redacao_13 / gabarito 960)', () => {
  it('une palavras divididas na troca de linha', () => {
    expect(unirTranslineacao('associ-\nada')).toBe('associada');
    expect(unirTranslineacao('sa- \r\n crifícios')).toBe('sacrifícios');
    expect(unirTranslineacao('quintas-feiras')).toBe('quintas-feiras');
  });

  it('descarta desvio cuja forma correta é idêntica ao original (falso positivo "desumaniza")', () => {
    const r = validarEvidenciasAntiAlucinacao(
      TEXTO,
      base([{ trecho_original: 'desumaniza', forma_correta: 'desumaniza', tipo: 'gramatical', explicacao_curta: '' }]),
      'handwritten_media'
    );
    expect(r.desviosValidados).toHaveLength(0);
    expect(r.desviosDescartadosPorAlucinacao).toHaveLength(1);
  });

  it('mantém desvio de acentuação (errôneamente -> erroneamente) e de grafia', () => {
    const r = validarEvidenciasAntiAlucinacao(
      TEXTO,
      base([
        { trecho_original: 'errôneamente', forma_correta: 'erroneamente', tipo: 'ortografia', explicacao_curta: '' },
        { trecho_original: 'experenciada', forma_correta: 'experienciada', tipo: 'ortografia', explicacao_curta: '' },
      ]),
      'handwritten_media'
    );
    expect(r.desviosValidados).toHaveLength(2);
  });

  it('valida desvio citado através de uma troca de linha hifenizada', () => {
    const r = validarEvidenciasAntiAlucinacao(
      TEXTO,
      base([{ trecho_original: 'associada', forma_correta: 'associada a', tipo: 'gramatical', explicacao_curta: '' }]),
      'handwritten_media'
    );
    expect(r.desviosValidados).toHaveLength(1);
  });
});
