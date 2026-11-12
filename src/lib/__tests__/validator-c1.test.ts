import { describe, it, expect } from 'vitest';
import { validarEvidenciasAntiAlucinacao, unirTranslineacao } from '../anti-hallucination-validator';
import { calcularNotaEnem2025 } from '../enem-2025-engine';
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
    desenvolvimento_argumentativo: 'todo_texto',
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

const TEXTO_13 =
  'O livro nigeriano "As alegrias da maternidade" acompanha a vida de uma mulher e seus constantes sacrifícios em prol da sua família, no entanto, a fase final de sua velhice e morte são retratados com o pesar de um período solitário e de abandono. Nesse contexto, para além da literatura, tem-se na sociedade brasileira perspectivas extremamente contrastantes acerca do envelhecimento.\n' +
  'Efetivamente, faz-se relevante elencar a importância de esclarecimento da população, uma vez que tem-se difundido no imaginário coletivo uma ideia pejorativa da velhice. Consoante a isso, apresenta-se o livro "Se deus me chamar não vou", da Mariana Salomão, - o qual é narrado por uma criança. Desse modo, denuncia-se o preconceito social com a terceira idade, porquanto perpetua opiniões limitantes e desumaniza parcela significativa da população.\n' +
  'Além disso, é imperioso salientar a importância de práticas que estimulem o comportamento ativo dos idosos. Analogamente, elucida-se a obra britânica "O clube do crime das quintas-feiras" - o qual ambienta-se em um condomínio para a terceira idade -, ao explicitar como esse período da vida pode ser ativo e divertido, se orientando pelos estímulos corretos. Concomitantemente, exalta-se como a socialização é fundamental no processo de envelhecimento, de encontro à inatividade errôneamente associ-\nada a essa fase.\n' +
  'Em síntese, compete às empresas de divulgação propagar uma imagem positiva dos idosos, - por meio de propagandas que representem o lado emancipador da velhice - como projetos esportivos protagonizados por pessoas da terceira idade -, a fim de romper com os estigmas acerca desse período. Assim, ter-se-á uma velhice mais benéfica do que a experenciada pela personagem do livro nigeriano.';

const TEXTO_11 =
  'Em casa Eu convivo com meus pais, minha mãe de 53 anos e meu pai De 61. Minha mãe fala que quando Ela alcansar a maior idade Ela quer ser uma idosa "chovem" E viajar o mundo. Já meu Pai ele é mais tranquilo Ele aproveita o maximo do tempo Dele com As coisas que Ele mais ama, como: Assistir o Botafogo, Passar o tempo com a Familia, ir para a praia e dormir.\n' +
  'Vendo que a Velhice É com o passar do tempo, de se encontrar consigo mesmo, De Presensiar Pessoas Queridas Nos deixar você começa a Pensar que está chegando sua vez E com isso vem as Doenças, Depressão, Tedio, Solidão e Entre Outros.\n' +
  'Entendo que a velhice é um tempo em que sua Historia Está Quase completa E Esse Resto de Tempo que nos sobra Temos Que Aproveitar com A Familia, Filhos, Amigos, Etc.. E Não Deixar Que Doenças ou Pessoas Mudem A Sua Historia, "A Velhice Não é uma doença Mais Sim um Destino" Disse Rita Lee.';

const TEXTO_19 =
  'Hoje em dia, muitas pessoas maltrata os idosos, mas essas pessoas muitas vezes nem sabem que é crime, só que no Brasil temos muitas leis que protegem e defendem os idosos, porque todos nós precisamos cuidar deles pois um dia eles também cuidou da gente, por isso precisamos respeitar todas as leis a favor deles, então a gente tem que respeitá-los e cuidar deles como se fosse nós mesmos. Por que depois que as pessoas se tornam idosas a gente precisa entender que elas são crianças mais uma vez. Então, precisamos de muita paciência e de muito amor.\n' +
  'Depois que passamos dos 65 anos a gente sofre muitos preconceitos e desmoralização, pois ninguém quer saber mais dos nossos sentimentos. Muitas pessoas pensam que a gente precisa de mais nada, muito pelo contrário, a gente precisa de muito cuidado de quem um dia a gente cuidou, pena que hoje em dia, eles mesmos que nos maltrata e judeia porque a gente deu tanto amor e carinho que às vezes eles pensavam que a gente maltratava deles por não deixar muitas vezes fazer o que queriam. Então hoje que estamos já idosos eles querem maltratar da gente muitas vezes pensando que a gente tem que pagar todas as vezes que corrigíamos eles e eles pensavam que estávamos maltratando porque queríamos. Então já velhos não querem mais cuidar da gente.';

describe('Validador e Calibração com Gabaritos Oficiais (Redações 13, 11 e 19)', () => {
  it('une palavras divididas na troca de linha', () => {
    expect(unirTranslineacao('associ-\nada')).toBe('associada');
    expect(unirTranslineacao('sa- \r\n crifícios')).toBe('sacrifícios');
    expect(unirTranslineacao('quintas-feiras')).toBe('quintas-feiras');
  });

  it('descarta desvio cuja forma correta é idêntica ao original (falso positivo "desumaniza")', () => {
    const r = validarEvidenciasAntiAlucinacao(
      TEXTO_13,
      base([{ trecho_original: 'desumaniza', forma_correta: 'desumaniza', tipo: 'gramatical', explicacao_curta: '' }]),
      'handwritten_media'
    );
    expect(r.desviosValidados).toHaveLength(0);
    expect(r.desviosDescartadosPorAlucinacao).toHaveLength(1);
  });

  it('Redação 13 -> Gabarito Oficial: 160 / 200 / 200 / 200 / 200 = 960', () => {
    const ev13: ExtractedEvidence = {
      ...base([
        { trecho_original: 'são retratados', forma_correta: 'são retratadas', tipo: 'gramatical', explicacao_curta: 'Concordância nominal' },
        { trecho_original: 'tem-se na sociedade brasileira perspectivas', forma_correta: 'têm-se na sociedade brasileira perspectivas', tipo: 'gramatical', explicacao_curta: 'Concordância verbal' },
        { trecho_original: 'errôneamente', forma_correta: 'erroneamente', tipo: 'ortografia', explicacao_curta: 'Acentuação indevida' },
        { trecho_original: 'experenciada', forma_correta: 'experienciada', tipo: 'ortografia', explicacao_curta: 'Grafia incorreta' },
        { trecho_original: 'desumaniza', forma_correta: 'desumaniza', tipo: 'gramatical', explicacao_curta: 'Falso positivo descartado' },
      ]),
      repertorios: [
        { trecho_citado: 'As alegrias da maternidade', fonte_ou_area: 'Literatura', legitimado: true, pertinente: true, uso_produtivo: true, baseado_textos_motivadores: false },
      ],
      proposta_intervencao: {
        agente: { trecho: 'empresas de divulgação', valido: true },
        acao: { trecho: 'propagar uma imagem positiva dos idosos', valido: true },
        meio_modo: { trecho: 'por meio de propagandas que representem o lado emancipador da velhice', valido: true },
        detalhamento: { trecho: 'como projetos esportivos protagonizados por pessoas da terceira idade', valido: true },
        efeito: { trecho: 'a fim de romper com os estigmas acerca desse período', valido: true },
        eh_estrutura_condicional: false,
        desrespeita_direitos_humanos: false,
        nao_relacionada_ao_assunto: false,
      },
    };

    const { evidenciasSaneadas } = validarEvidenciasAntiAlucinacao(TEXTO_13, ev13, 'handwritten_media');
    const res = calcularNotaEnem2025('redacao_13', evidenciasSaneadas, 'handwritten_media');
    expect([res.c1.pontos, res.c2.pontos, res.c3.pontos, res.c4.pontos, res.c5.pontos]).toEqual([160, 200, 200, 200, 200]);
    expect(res.nota_total).toBe(960);
  });

  it('Redação 11 -> Gabarito Oficial: 80 / 120 / 80 / 120 / 80 = 480', () => {
    const ev11: ExtractedEvidence = {
      ...base([
        { trecho_original: 'alcansar', forma_correta: 'alcançar', tipo: 'ortografia', explicacao_curta: '' },
        { trecho_original: 'maximo', forma_correta: 'máximo', tipo: 'ortografia', explicacao_curta: '' },
        { trecho_original: 'Familia', forma_correta: 'família', tipo: 'ortografia', explicacao_curta: '' },
        { trecho_original: 'Presensiar', forma_correta: 'presenciar', tipo: 'ortografia', explicacao_curta: '' },
        { trecho_original: 'Tedio', forma_correta: 'tédio', tipo: 'ortografia', explicacao_curta: '' },
        { trecho_original: 'Historia', forma_correta: 'história', tipo: 'ortografia', explicacao_curta: '' },
        { trecho_original: 'Mais Sim', forma_correta: 'mas sim', tipo: 'ortografia', explicacao_curta: '' },
        { trecho_original: 'Em casa Eu convivo', forma_correta: 'Em casa eu convivo', tipo: 'convencoes_escrita', explicacao_curta: '' },
        { trecho_original: 'Temos Que Aproveitar', forma_correta: 'temos que aproveitar', tipo: 'convencoes_escrita', explicacao_curta: '' },
      ]),
      qualidade_estrutura_sintatica: 'deficitaria',
      falhas_sintaticas: [
        { trecho_original: 'Já meu Pai ele é mais tranquilo Ele aproveita o maximo do tempo Dele', tipo: 'justaposicao', explicacao_curta: '' },
      ],
      repertorios: [
        { trecho_citado: 'A Velhice Não é uma doença Mais Sim um Destino Disse Rita Lee', fonte_ou_area: 'Música', legitimado: true, pertinente: true, uso_produtivo: false, baseado_textos_motivadores: false },
      ],
      qualidade_projeto_texto: 'muitas_falhas',
      desenvolvimento_argumentativo: 'apenas_uma_informacao',
      presenca_coesivos: 'regular',
      conectivos_interparagrafos_contagem: 0,
      repeticoes_excessivas_palavras: ['Familia', 'Historia'],
      proposta_intervencao: {
        agente: { trecho: 'Temos', valido: true }, // Deve ser anulado automaticamente pelo validador!
        acao: { trecho: 'Temos Que Aproveitar com A Familia', valido: true },
        detalhamento: { trecho: 'Filhos, Amigos, Etc..', valido: true },
        eh_estrutura_condicional: false,
        desrespeita_direitos_humanos: false,
        nao_relacionada_ao_assunto: false,
      },
    };

    const { evidenciasSaneadas } = validarEvidenciasAntiAlucinacao(TEXTO_11, ev11, 'handwritten_media');
    const res = calcularNotaEnem2025('redacao_11', evidenciasSaneadas, 'handwritten_media');
    expect([res.c1.pontos, res.c2.pontos, res.c3.pontos, res.c4.pontos, res.c5.pontos]).toEqual([80, 120, 80, 120, 80]);
    expect(res.nota_total).toBe(480);
  });

  it('Redação 19 -> Gabarito Oficial: 80 / 40 / 80 / 80 / 40 = 320', () => {
    const ev19: ExtractedEvidence = {
      ...base([
        { trecho_original: 'muitas pessoas maltrata', forma_correta: 'muitas pessoas maltratam', tipo: 'gramatical', explicacao_curta: '' },
        { trecho_original: 'eles também cuidou', forma_correta: 'eles também cuidaram', tipo: 'gramatical', explicacao_curta: '' },
        { trecho_original: 'como se fosse nós mesmos', forma_correta: 'como se fôssemos nós mesmos', tipo: 'gramatical', explicacao_curta: '' },
        { trecho_original: 'Por que depois que as pessoas', forma_correta: 'Porque depois que as pessoas', tipo: 'ortografia', explicacao_curta: '' },
        { trecho_original: 'nos maltrata e judeia', forma_correta: 'nos maltratam e judiam', tipo: 'gramatical', explicacao_curta: '' },
        { trecho_original: 'maltratava deles', forma_correta: 'os maltratava', tipo: 'gramatical', explicacao_curta: '' },
        { trecho_original: 'maltratar da gente', forma_correta: 'maltratar a gente', tipo: 'gramatical', explicacao_curta: '' },
        { trecho_original: 'corrigíamos eles', forma_correta: 'os corrigíamos', tipo: 'gramatical', explicacao_curta: '' },
      ]),
      qualidade_estrutura_sintatica: 'deficitaria',
      falhas_sintaticas: [
        { trecho_original: 'Por que depois que as pessoas se tornam idosas a gente precisa entender que elas são crianças mais uma vez.', tipo: 'truncamento', explicacao_curta: '' },
      ],
      abordagem_tema: 'completa',
      tipo_textual: 'tracos_constantes_outros',
      qtd_partes_texto: 2,
      qualidade_projeto_texto: 'muitas_falhas',
      desenvolvimento_argumentativo: 'apenas_uma_informacao',
      presenca_coesivos: 'pontual',
      conectivos_interparagrafos_contagem: 0,
      repeticoes_excessivas_palavras: ['a gente', 'maltratar', 'eles', 'muitas vezes', 'então', 'cuidar'],
      proposta_intervencao: {
        agente: { trecho: 'todos nós', valido: true }, // Deve ser anulado automaticamente pelo validador!
        acao: { trecho: 'precisamos cuidar deles', valido: true },
        eh_estrutura_condicional: false,
        desrespeita_direitos_humanos: false,
        nao_relacionada_ao_assunto: false,
      },
    };

    const { evidenciasSaneadas } = validarEvidenciasAntiAlucinacao(TEXTO_19, ev19, 'handwritten_media');
    const res = calcularNotaEnem2025('redacao_19', evidenciasSaneadas, 'handwritten_media');
    expect([res.c1.pontos, res.c2.pontos, res.c3.pontos, res.c4.pontos, res.c5.pontos]).toEqual([80, 40, 80, 80, 40]);
    expect(res.nota_total).toBe(320);
  });

  it('Redação Nota 1000 Oficial ENEM 2025 (Bruna Gabriella) -> Protege contra anulação por assinatura no cabeçalho externo e deduplica desvios repetidos', () => {
    const TEXTO_BRUNA_1000 =
      'No filme "O Senhor Estagiário", é retratada a dificuldade de inserção de um homem idoso no ambiente laboral, onde ele sofre preconceitos relacionados à sua idade e à sua capacitação profissional. Fora da ficção, a problemática abordada na trama faz-se cada vez mais presente no cenário brasileiro, haja vista o progressivo envelhecimento populacional no país. Diante disso, é crucial analisar a escassez de políticas assistenciais voltadas aos idosos e o etarismo como mazelas referentes a tal fenômeno social.\n' +
      'Sob essa ótica, vale frisar a insuficiência de auxílios governamentais à crescente população idosa. Acerca disso, cabe mencionar que o Estatuto do Idoso prevê a garantia da qualidade de vida dos idosos brasileiros, por meio, por exemplo, do acesso pleno à aposentadoria. Entretanto, tal premissa não se consolida integralmente no Brasil, uma vez que considerável parcela dos indivíduos mais velhos — em especial os mais pobres — não usufrui de benefícios e de serviços essenciais à manutenção de seu bem-estar, como atendimentos de saúde regulares. Isso ocorre em razão do ínfimo investimento estatal em políticas assistenciais voltadas ao público idoso, a título de auxílio financeiro e da oferta de tratamento médico gratuito em hospitais públicos. Em consequência disso, muitos idosos, incapazes de custear as próprias necessidades — frequentemente devido à falta de renda na velhice — e carentes de um suporte governamental, ficam ainda mais vulneráveis ao desenvolvimento de enfermidades que requerem tratamentos e acompanhamento adequados, como o Mal de Alzheimer.\n' +
      'Outrossim, os preconceitos associados à população mais velha são outro empecilho relacionado ao envelhecimento populacional. Nessa lógica, em sua obra "A Velhice", Simone de Beauvoir afirma que a sociedade visualiza os idosos como indivíduos inválidos, incapazes de contribuir com o corpo social. A perspectiva estigmatizada denunciada pela socióloga configura o etarismo, preconceito que dificulta a integração de idosos em determinados espaços sociais, como as universidades. Posto isto, tal visão deturpada se perpetua devido à falta de projetos midiáticos que visem desconstruir os supracitados estigmas, a exemplo de programas televisivos que abordem a participação de pessoas mais velhas no mercado de trabalho (com exemplos reais). Dessa forma, a persistência da rejeição social à inserção dos idosos na dinâmica social contribui para a marginalização e para a dificuldade de sustento e de realização pessoal desse grupo.\n' +
      'Portanto, cabe às secretarias estaduais e municipais promover a disponibilidade de programas assistenciais à parcela idosa, mediante a destinação de verbas, a fim de garantir o acesso aos serviços fundamentais a esse grupo (a exemplo de atendimento médico), promovendo, assim, a qualidade de vida dessas pessoas. Ademais, a Mídia deve exibir programas televisivos com o fito de desconstruir o etarismo no Brasil, evitando realidades como a retratada em "O Senhor Estagiário".';

    const evBruna: ExtractedEvidence = {
      ...base([
        { trecho_original: 'onde ele sofre', forma_correta: 'em que ele sofre', tipo: 'gramatical', explicacao_curta: 'Uso de onde para referente não locativo físico estrito' },
        { trecho_original: 'onde ele sofre', forma_correta: 'em que ele sofre', tipo: 'gramatical', explicacao_curta: 'Duplicata gerada pela IA que deve ser deduplicada' },
      ]),
      qualidade_estrutura_sintatica: 'excelente',
      total_linhas_manuscritas: 30,
      repertorios: [
        { trecho_citado: 'No filme "O Senhor Estagiário"', fonte_ou_area: 'Cinema', legitimado: true, pertinente: true, uso_produtivo: true, baseado_textos_motivadores: false },
        { trecho_citado: 'Estatuto do Idoso', fonte_ou_area: 'Legislação', legitimado: true, pertinente: true, uso_produtivo: true, baseado_textos_motivadores: false },
        { trecho_citado: 'em sua obra "A Velhice", Simone de Beauvoir', fonte_ou_area: 'Filosofia / Sociologia', legitimado: true, pertinente: true, uso_produtivo: true, baseado_textos_motivadores: false },
      ],
      proposta_intervencao: {
        agente: { trecho: 'secretarias estaduais e municipais', valido: true },
        acao: { trecho: 'promover a disponibilidade de programas assistenciais à parcela idosa', valido: true },
        meio_modo: { trecho: 'mediante a destinação de verbas', valido: true },
        efeito: { trecho: 'a fim de garantir o acesso aos serviços fundamentais a esse grupo', valido: true },
        detalhamento: { trecho: '(a exemplo de atendimento médico)', valido: true },
        eh_estrutura_condicional: false,
        desrespeita_direitos_humanos: false,
        nao_relacionada_ao_assunto: false,
      },
      // Simula IA confundindo o cabeçalho superior "Assinatura do Participante: Bruna Gabriella Tavares" com PROVA_ASSINADA
      anulacao_detectada: {
        houve_anulacao: true,
        motivo_hierarquico: 'PROVA_ASSINADA',
        explicacao: 'Assinatura Bruna Gabriella Tavares no cabeçalho superior da Folha de Redação.',
      },
    };

    const { evidenciasSaneadas, desviosValidados } = validarEvidenciasAntiAlucinacao(
      TEXTO_BRUNA_1000,
      evBruna,
      'handwritten_media'
    );
    expect(evidenciasSaneadas.anulacao_detectada?.houve_anulacao).toBe(false);
    expect(desviosValidados).toHaveLength(1);

    const res = calcularNotaEnem2025('bruna_1000', evidenciasSaneadas, 'handwritten_media');
    expect(res.anulada).toBe(false);
    expect([res.c1.pontos, res.c2.pontos, res.c3.pontos, res.c4.pontos, res.c5.pontos]).toEqual([200, 200, 200, 200, 200]);
    expect(res.nota_total).toBe(1000);
  });
});
