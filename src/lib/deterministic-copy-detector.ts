/**
 * Comparador determinístico de cópia entre o texto da redação e os textos motivadores.
 * Executado localmente em milissegundos, com custo zero de API.
 */

function normalizarTexto(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^\w\s]/g, ' ') // remove pontuações
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

export interface CopyAnalysisResult {
  totalPalavrasRedacao: number;
  totalPalavrasCopiadas: number;
  percentualCopia: number;
  trechosCopiados: string[];
  ehCopiaMassivaAnulacao: boolean; // >= 70% de cópia
  ehCopiaExcessivaC2: boolean; // >= 25% de cópia dos motivadores
}

export function analisarCopiaMotivadores(
  textoRedacao: string,
  textosMotivadores: string,
  tamanhoMinimoSequencia: number = 5
): CopyAnalysisResult {
  if (!textoRedacao || !textosMotivadores || textosMotivadores.trim().length === 0) {
    const palavras = normalizarTexto(textoRedacao || '');
    return {
      totalPalavrasRedacao: palavras.length,
      totalPalavrasCopiadas: 0,
      percentualCopia: 0,
      trechosCopiados: [],
      ehCopiaMassivaAnulacao: false,
      ehCopiaExcessivaC2: false,
    };
  }

  const palavrasRedacao = normalizarTexto(textoRedacao);
  const palavrasMotivadores = normalizarTexto(textosMotivadores);

  if (palavrasRedacao.length === 0) {
    return {
      totalPalavrasRedacao: 0,
      totalPalavrasCopiadas: 0,
      percentualCopia: 0,
      trechosCopiados: [],
      ehCopiaMassivaAnulacao: false,
      ehCopiaExcessivaC2: false,
    };
  }

  // Monta dicionário de n-gramas dos textos motivadores
  const conjuntoMotivadores = new Set<string>();
  for (let i = 0; i <= palavrasMotivadores.length - tamanhoMinimoSequencia; i++) {
    const gram = palavrasMotivadores.slice(i, i + tamanhoMinimoSequencia).join(' ');
    conjuntoMotivadores.add(gram);
  }

  const palavrasIndicesCopiados = new Set<number>();
  const trechosCopiados: string[] = [];

  for (let i = 0; i <= palavrasRedacao.length - tamanhoMinimoSequencia; i++) {
    const gram = palavrasRedacao.slice(i, i + tamanhoMinimoSequencia).join(' ');
    if (conjuntoMotivadores.has(gram)) {
      for (let k = 0; k < tamanhoMinimoSequencia; k++) {
        palavrasIndicesCopiados.add(i + k);
      }
      trechosCopiados.push(gram);
    }
  }

  const totalPalavrasCopiadas = palavrasIndicesCopiados.size;
  const percentualCopia = Number(((totalPalavrasCopiadas / palavrasRedacao.length) * 100).toFixed(1));

  return {
    totalPalavrasRedacao: palavrasRedacao.length,
    totalPalavrasCopiadas,
    percentualCopia,
    trechosCopiados: Array.from(new Set(trechosCopiados)).slice(0, 10), // deduplica e limita
    ehCopiaMassivaAnulacao: percentualCopia >= 70,
    ehCopiaExcessivaC2: percentualCopia >= 25,
  };
}
