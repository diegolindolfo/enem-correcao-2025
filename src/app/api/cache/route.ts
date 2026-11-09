import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { ENEM_SYSTEM_INSTRUCTION } from '@/lib/gemini-schema';



export async function POST(req: NextRequest) {
  try {
    const { apiKey: customApiKey, tema, textosMotivadores, model = 'gemini-3.8-flash', ttlSeconds = 3600 } = await req.json();
    const apiKey = customApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Chave Gemini API não fornecida.' }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Monta o corpus compartilhado para cache (Tema + Motivadores + Grade ENEM)
    const promptCorpus = `${ENEM_SYSTEM_INSTRUCTION}\n\nTEMA OFICIAL DO LOTE:\n"${tema}"\n\nTEXTOS MOTIVADORES DO EXAME:\n${textosMotivadores || 'Sem textos motivadores específicos.'}`;

    // A API de cache do Gemini exige uma quantidade mínima de tokens (~32k para gemini-2.5-flash).
    // Se o lote for menor, a chamada direta sem cache é mais econômica.
    try {
      const cache = await ai.caches.create({
        model,
        config: {
          displayName: `enem-cache-${Date.now()}`,
          ttl: `${ttlSeconds}s`,
          contents: [{ parts: [{ text: promptCorpus }] }],
        },
      });

      return NextResponse.json({
        cached: true,
        cacheName: cache.name,
        expireTime: cache.expireTime,
      });
    } catch (cacheErr: any) {
      // Se não atingir o limite mínimo de tokens para criar cache, retorna aviso para usar chamada direta
      return NextResponse.json({
        cached: false,
        motivo: 'Volume de texto inferior ao mínimo exigido pela API para Context Cache. As chamadas serão feitas diretamente com sistema de prompt enxuto.',
        detalhes: cacheErr?.message,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao criar cache' }, { status: 500 });
  }
}
