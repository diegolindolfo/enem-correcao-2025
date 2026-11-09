import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as evaluatePOST } from '@/app/api/evaluate/route';
import { POST as cachePOST } from '@/app/api/cache/route';

// Mock do SDK @google/genai para simular respostas da Gemini API (incluindo alucinações e erro 503)
const mockGenerateContent = vi.fn();
const mockCachesCreate = vi.fn();

vi.mock('@google/genai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@google/genai')>();
  return {
    ...actual,
    GoogleGenAI: class {
      models = {
        generateContent: mockGenerateContent,
      };
      caches = {
        create: mockCachesCreate,
      };
    },
  };
});

const REDAÇÃO_4_PARAGRAFOS = `Na obra "Utopia", de Thomas More, é retratada uma sociedade perfeita e harmônica, livre de conflitos sociais. Entretanto, fora da ficção, a realidade brasileira contemporânea distancia-se desse ideal, haja vista os desafios para a valorização de comunidades e povos tradicionais no Brasil. Nesse contexto, a negligência governamental e o apagamento histórico configuram entraves graves que demandam urgente solução.

Em primeira análise, cabe pontuar que a inoperância estatal compromete a proteção dos territórios tradicionais. Segundo o sociólogo Zygmunt Bauman, na obra "Modernidade Líquida", certas instituições deixam de cumprir sua função social básica em prol de interesses econômicos imediatos. De maneira análoga, a falta de fiscalização ambiental permite o avanço do desmatamento ilegal sobre terras indígenas e quilombolas, ameaçando a sobrevivência física e cultural desses grupos.

Ademais, a ausência de visibilidade midiática e educacional perpetua o preconceito contra essas populações. Conforme o pensamento de Djamila Ribeiro, tirar um problema da invisibilidade é o primeiro passo para superá-lo. Contudo, as escolas brasileiras ainda abordam a cultura dos povos originários, ribeirinhos e seringueiros de forma superficial, o que impede o reconhecimento de sua importância para a biodiversidade e para a identidade nacional.

Portanto, medidas estruturais são urgentes para reverter esse cenário. Para tanto, cabe ao Ministério dos Povos Indigenas, em parceria com o Ministério da Educação, promover campanhas educativas e ampliar a demarcação e fiscalização das terras tradicionais, por meio do uso de satélites de monitoramento em tempo real e da inclusão de oficinas culturais no currículo escolar, que devem contar com a participação ativa de lideranças comunitárias locais, a fim de assegurar a preservação e a valorização plena desses povos no Brasil.`;

describe('Testes de Integração da API (/api/evaluate e /api/cache)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Deve retornar 400 se a API Key não for informada', async () => {
    const req = new NextRequest('http://localhost:3000/api/evaluate', {
      method: 'POST',
      body: JSON.stringify({ texto: 'Texto de teste' }),
    });
    const res = await evaluatePOST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Chave da Gemini API');
  });

  it('2. Pré-filtro Custo Zero: Deve anular texto em branco sem chamar a Gemini API (0 tokens)', async () => {
    const req = new NextRequest('http://localhost:3000/api/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        apiKey: 'test-key',
        modalidade: 'text',
        texto: '    \n   ',
        tema: 'Tema Teste',
      }),
    });
    const res = await evaluatePOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.resultado.anulada).toBe(true);
    expect(data.resultado.nota_total).toBe(0);
    expect(data.tokensUsage.totalTokens).toBe(0);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('3. Pré-filtro Custo Zero: Deve anular redação com cópia massiva (>= 70%) dos textos motivadores sem gastar tokens', async () => {
    const motivador =
      'As comunidades e povos tradicionais no Brasil ocupam cerca de um quarto do território nacional e desempenham papel essencial na conservação da biodiversidade e dos recursos naturais.';
    const req = new NextRequest('http://localhost:3000/api/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        apiKey: 'test-key',
        modalidade: 'text',
        texto: motivador,
        textosMotivadores: motivador,
        tema: 'Desafios para a valorização de comunidades e povos tradicionais no Brasil',
      }),
    });
    const res = await evaluatePOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.resultado.anulada).toBe(true);
    expect(data.resultado.motivo_anulacao).toBe('COPIA_MOTIVADORES');
    expect(data.resultado.nota_total).toBe(0);
    expect(data.tokensUsage.totalTokens).toBe(0);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('4. Fluxo Completo (4 Parágrafos) + Filtro Anti-Alucinação: Descarta erro inventado pela IA e calcula Nota 1000', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        qualidade_estrutura_sintatica: 'excelente',
        falhas_sintaticas: [],
        desvios_identificados: [
          // Desvio real presente no texto ("Indigenas" sem acento no último parágrafo)
          {
            trecho_original: 'Ministerio dos Povos Indigenas',
            tipo: 'ortografia',
            explicacao_curta: 'Ausência de acento em Indígenas',
          },
          // Desvio ALUCINADO pela IA (não existe no texto original -> deve ser descartado!)
          {
            trecho_original: 'trecho inventado que nao existe na redacao',
            tipo: 'gramatical',
            explicacao_curta: 'Alucinação de teste',
          },
          // Outro desvio ALUCINADO pela IA
          {
            trecho_original: 'outro erro fantasma inexistente',
            tipo: 'pontuacao',
            explicacao_curta: 'Alucinação 2',
          },
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
            trecho_citado: 'Na obra "Utopia", de Thomas More',
            fonte_ou_area: 'Literatura / Filosofia',
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
        inadequacoes_coesivas: [
          // Conectivo alucinado que não está no texto -> deve ser descartado!
          { conectivo: 'conquanto todavia inexistente', contexto: '...', explicacao: '...' },
        ],
        repeticoes_excessivas_palavras: [],
        eh_monobloco: true, // Mesmo se a IA alucinar monobloco, o texto tem 4 parágrafos reais!
        proposta_intervencao: {
          agente: { trecho: 'Ministério dos Povos Indigenas, em parceria com o Ministério da Educação', valido: true },
          acao: { trecho: 'promover campanhas educativas e ampliar a demarcação e fiscalização das terras tradicionais', valido: true },
          meio_modo: { trecho: 'por meio do uso de satélites de monitoramento em tempo real e da inclusão de oficinas culturais no currículo escolar', valido: true },
          efeito: { trecho: 'a fim de assegurar a preservação e a valorização plena desses povos no Brasil', valido: true },
          detalhamento: { trecho: 'que devem contar com a participação ativa de lideranças comunitárias locais', valido: true },
          eh_estrutura_condicional: false,
          desrespeita_direitos_humanos: false,
          nao_relacionada_ao_assunto: false,
        },
      }),
      usageMetadata: {
        promptTokenCount: 850,
        candidatesTokenCount: 310,
        totalTokenCount: 1160,
      },
    });

    const req = new NextRequest('http://localhost:3000/api/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        redacaoId: 'red-4p',
        apiKey: 'test-key',
        modalidade: 'text',
        texto: REDAÇÃO_4_PARAGRAFOS,
        tema: 'Desafios para a valorização de comunidades e povos tradicionais no Brasil',
        modelName: 'gemini-3.8-flash',
      }),
    });

    const res = await evaluatePOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    // Verifica que os 2 desvios alucinados foram descartados, sobrando apenas 1 desvio real (<= 2 desvios = 200 na C1!)
    expect(data.auditoriaAntiAlucinacao.desviosDescartados).toBe(2);
    expect(data.resultado.desvios_c1_validados.length).toBe(1);
    expect(data.resultado.c1.pontos).toBe(200);
    expect(data.resultado.c2.pontos).toBe(200);
    expect(data.resultado.c3.pontos).toBe(200);
    expect(data.resultado.c4.pontos).toBe(200);
    expect(data.resultado.c5.pontos).toBe(200);
    expect(data.resultado.nota_total).toBe(1000);
  });

  it('5. Resiliência 503 (High Demand): Faz fallback automático de gemini-3.8-flash para gemini-3.5-flash-lite', async () => {
    const err503 = Object.assign(new Error('503 Service Unavailable'), { status: 503 });
    // Falha 2 vezes no gemini-3.8-flash e sucede no gemini-3.5-flash-lite
    mockGenerateContent
      .mockRejectedValueOnce(err503)
      .mockRejectedValueOnce(err503)
      .mockResolvedValueOnce({
        text: JSON.stringify({
          qualidade_estrutura_sintatica: 'boa',
          falhas_sintaticas: [],
          desvios_identificados: [],
          abordagem_tema: 'tangencia',
          tipo_textual: 'dissertativo_argumentativo',
          aglomerado_caotico_palavras: false,
          qtd_partes_texto: 3,
          partes_embrionarias_indices: [],
          conclusao_finalizada_ideia_incompleta: false,
          copia_excessiva_motivadores: false,
          repertorios: [],
          qualidade_projeto_texto: 'algumas_falhas',
          desenvolvimento_argumentativo: 'algumas_lacunas',
          possui_contradicao_grave: false,
          presenca_coesivos: 'regular',
          conectivos_interparagrafos_contagem: 1,
          inadequacoes_coesivas: [],
          repeticoes_excessivas_palavras: [],
          eh_monobloco: false,
          proposta_intervencao: {
            agente: { trecho: 'a sociedade como um todo', valido: true }, // Deve ser invalidado como agente nulo!
            acao: { trecho: 'deve refletir sobre a natureza', valido: true },
            eh_estrutura_condicional: false,
            desrespeita_direitos_humanos: false,
            nao_relacionada_ao_assunto: false,
          },
        }),
        usageMetadata: { totalTokenCount: 500 },
      });

    const req = new NextRequest('http://localhost:3000/api/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        redacaoId: 'red-fallback',
        apiKey: 'test-key',
        modalidade: 'text',
        texto: 'A natureza é importante.\n\nPor isso, a sociedade como um todo deve refletir sobre a natureza.',
        modelName: 'gemini-3.8-flash',
      }),
    });

    const res = await evaluatePOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.modeloUtilizado).toBe('gemini-3.5-flash-lite');
    // Tangência trava C2, C3 e C5 em 40 pontos
    expect(data.resultado.c2.pontos).toBe(40);
    expect(data.resultado.c3.pontos).toBe(40);
    expect(data.resultado.c5.pontos).toBe(40);
    // Agente "a sociedade como um todo" foi invalidado pelo validador anti-alucinação
    expect(data.resultado.evidencias_auditadas.proposta_intervencao.agente.valido).toBe(false);
  });

  it('6. Endpoint /api/cache faz fallback limpo quando o corpus tem menos tokens que o mínimo do Context Cache', async () => {
    mockCachesCreate.mockRejectedValueOnce(new Error('Cached content is too small. Minimum token count is 32768.'));

    const req = new NextRequest('http://localhost:3000/api/cache', {
      method: 'POST',
      body: JSON.stringify({
        apiKey: 'test-key',
        tema: 'Tema de teste',
        textosMotivadores: 'Texto motivador curto',
      }),
    });

    const res = await cachePOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.cached).toBe(false);
  });
});
