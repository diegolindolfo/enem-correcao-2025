'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Props {
  dataUrl: string;
}

/**
 * Renderiza todas as páginas de um PDF (data: URL) em <canvas> usando pdf.js.
 * Funciona em qualquer navegador, inclusive webviews sem leitor de PDF nativo.
 */
export default function PdfPreview({ dataUrl }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'erro'>('carregando');

  useEffect(() => {
    let cancelado = false;
    let doc: any;

    (async () => {
      try {
        setEstado('carregando');
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const base64 = dataUrl.split(',')[1] || '';
        const bin = atob(base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

        doc = await pdfjs.getDocument({ data: bytes }).promise;
        const container = containerRef.current;
        if (cancelado || !container) return;
        container.innerHTML = '';

        const larguraAlvo = Math.max(container.clientWidth, 320);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n);
          if (cancelado) return;
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (larguraAlvo / base.width) * dpr });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          canvas.className = 'rounded-lg bg-white shadow-2xs';
          container.appendChild(canvas);

          await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise;
        }
        if (!cancelado) setEstado('ok');
      } catch {
        if (!cancelado) setEstado('erro');
      }
    })();

    return () => {
      cancelado = true;
      doc?.destroy?.();
    };
  }, [dataUrl]);

  return (
    <div className="w-full">
      {estado === 'carregando' && (
        <p className="text-xs text-stone-400 text-center py-10">Carregando folha…</p>
      )}
      {estado === 'erro' && (
        <p className="text-xs text-stone-500 text-center py-10">
          Não foi possível exibir o PDF aqui. Use o botão “Baixar” para abrir o arquivo.
        </p>
      )}
      <div ref={containerRef} className="space-y-3" />
    </div>
  );
}
