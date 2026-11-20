import React, { useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  FileText,
  ZoomIn,
  ZoomOut,
  Loader2,
  AlertCircle,
  Maximize2,
  ExternalLink,
  Download,
  X,
} from 'lucide-react';

import { dataUrlToUint8Array } from '../utils/documentPersistence';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfCanvasPreviewProps {
  fileUrl: string;
  fileDataUrl?: string;
  fileName: string;
  fileSize?: string;
}

interface RenderedPage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}

export const PdfCanvasPreview: React.FC<PdfCanvasPreviewProps> = ({
  fileUrl,
  fileDataUrl,
  fileName,
  fileSize,
}) => {
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;

    const renderPdf = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      setPages([]);
      setTotalPages(0);
      setExtractedText('');

      try {
        let bytes: Uint8Array;
        const directDataUrl = fileDataUrl || (fileUrl.startsWith('data:') ? fileUrl : '');
        if (directDataUrl) {
          bytes = dataUrlToUint8Array(directDataUrl);
        } else {
          const response = await fetch(fileUrl, { cache: 'no-store' });
          if (!response.ok) {
            throw new Error(`Impossible de charger le document (${response.status}).`);
          }

          const arrayBuffer = await response.arrayBuffer();
          bytes = new Uint8Array(arrayBuffer);
        }

        loadingTask = pdfjsLib.getDocument({
          data: bytes,
          useSystemFonts: true,
        });

        const pdfDoc = await loadingTask.promise;
        if (cancelled) {
          await pdfDoc.cleanup();
          await loadingTask.destroy();
          return;
        }

        const numPages = pdfDoc.numPages;
        setTotalPages(numPages);

        // Render up to 10 pages cleanly into crisp PNG dataURLs for reliable large-format display
        const maxPagesToRender = Math.min(numPages, 10);
        const rendered: RenderedPage[] = [];
        const textChunks: string[] = [];

        for (let pageNum = 1; pageNum <= maxPagesToRender; pageNum++) {
          if (cancelled) break;
          const page = await pdfDoc.getPage(pageNum);

          const baseViewport = page.getViewport({ scale: 1 });
          const targetWidth = 1200;
          const renderScale = Math.min(
            2.25,
            Math.max(1.5, targetWidth / Math.max(baseViewport.width, 1))
          );
          const viewport = page.getViewport({ scale: renderScale });

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);

          if (context) {
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);

            await page.render({
              canvas,
              canvasContext: context,
              viewport,
            }).promise;

            rendered.push({
              pageNumber: pageNum,
              dataUrl: canvas.toDataURL('image/png'),
              width: canvas.width,
              height: canvas.height,
            });
          }

          try {
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => ('str' in item ? item.str : ''))
              .join(' ')
              .trim();
            if (pageText) textChunks.push(pageText);
          } catch {
            // Optional text extraction
          }

          page.cleanup();
        }

        await pdfDoc.cleanup();
        await loadingTask.destroy();

        if (!cancelled) {
          setPages(rendered);
          setExtractedText(textChunks.join('\n\n'));
          setIsLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('PDF.js render error:', err);
          setErrorMsg(
            err?.message || 'Aperçu direct indisponible pour ce fichier PDF.'
          );
          setIsLoading(false);
        }
      }
    };

    renderPdf();

    return () => {
      cancelled = true;
      if (loadingTask) {
        loadingTask.destroy().catch(() => {});
      }
    };
  }, [fileUrl, fileDataUrl]);

  const zoomSteps = [60, 75, 90, 100, 115, 130, 145, 160] as const;
  const zoomWidthClassMap: Record<number, string> = {
    60: 'w-[60%] max-w-full',
    75: 'w-[75%] max-w-full',
    90: 'w-[90%] max-w-full',
    100: 'w-full max-w-full',
    115: 'w-[115%] max-w-none',
    130: 'w-[130%] max-w-none',
    145: 'w-[145%] max-w-none',
    160: 'w-[160%] max-w-none',
  };

  const handleZoomOut = () =>
    setZoomPercent((z) => {
      const idx = zoomSteps.indexOf(z as (typeof zoomSteps)[number]);
      return idx > 0 ? zoomSteps[idx - 1] : zoomSteps[0];
    });
  const handleZoomIn = () =>
    setZoomPercent((z) => {
      const idx = zoomSteps.indexOf(z as (typeof zoomSteps)[number]);
      return idx >= 0 && idx < zoomSteps.length - 1 ? zoomSteps[idx + 1] : zoomSteps[zoomSteps.length - 1];
    });

  const renderCompactActionBar = (inLightbox = false) => (
    <div
      className={`px-3.5 py-2.5 border-b flex flex-wrap items-center justify-between gap-2.5 ${
        inLightbox
          ? 'bg-slate-900 text-white border-slate-800'
          : 'bg-slate-50 text-slate-800 border-slate-200'
      }`}
    >
      {/* File Identity & Page Count */}
      <div className="flex items-center gap-2 min-w-0 flex-1 basis-48">
        <FileText
          className={`w-4 h-4 shrink-0 ${inLightbox ? 'text-slate-300' : 'text-slate-600'}`}
        />
        <div className="min-w-0 flex items-baseline gap-2">
          <span
            className={`font-mono text-xs font-bold truncate ${
              inLightbox ? 'text-white' : 'text-slate-900'
            }`}
            title={fileName}
          >
            {fileName}
          </span>
          <span
            className={`text-[11px] font-mono whitespace-nowrap shrink-0 ${
              inLightbox ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {[
              fileSize,
              totalPages > 0 ? `${totalPages} p.` : null,
            ]
              .filter(Boolean)
              .join(' • ')}
          </span>
        </div>
      </div>

      {/* Unified Compact Controls: Zoom, Agrandir, Ouvrir, Télécharger */}
      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        {pages.length > 0 && (
          <div
            className={`inline-flex items-center rounded-lg border overflow-hidden ${
              inLightbox
                ? 'bg-slate-800 border-slate-700 text-slate-100'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomPercent <= 60}
              className={`px-1.5 py-1 disabled:opacity-40 cursor-pointer transition-colors ${
                inLightbox ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
              }`}
              title="Zoom arrière"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] font-semibold px-1.5 min-w-[42px] text-center select-none">
              {zoomPercent}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomPercent >= 160}
              className={`px-1.5 py-1 disabled:opacity-40 cursor-pointer transition-colors ${
                inLightbox ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
              }`}
              title="Zoom avant"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {!inLightbox && pages.length > 0 && (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
            title="Agrandir l'aperçu plein écran"
          >
            <Maximize2 className="w-3.5 h-3.5 shrink-0" />
            <span>Agrandir</span>
          </button>
        )}

        {fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              inLightbox
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-100'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
            title="Ouvrir le PDF dans un nouvel onglet"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            <span>Ouvrir</span>
          </a>
        )}

        {fileUrl && (
          <a
            href={fileUrl}
            download={fileName}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              inLightbox
                ? 'bg-white hover:bg-slate-100 border-white text-slate-900'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-900 text-white'
            }`}
            title="Télécharger le fichier PDF"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Télécharger</span>
          </a>
        )}

        {inLightbox && (
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors ml-1"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  const renderPagesList = (containerHeightClass: string) => (
    <div
      className={`overflow-auto bg-slate-100 p-4 sm:p-5 space-y-4 ${containerHeightClass}`}
    >
      {pages.map((p) => (
        <div
          key={p.pageNumber}
          className={`mx-auto bg-white shadow-md border border-slate-200/90 rounded-lg overflow-hidden transition-all ${zoomWidthClassMap[zoomPercent] || 'w-full max-w-full'}`}
        >
          <img
            src={p.dataUrl}
            alt={`${fileName} — Page ${p.pageNumber}`}
            className="w-full h-auto block select-none"
          />
          {totalPages > 1 && (
            <div className="px-3.5 py-1.5 bg-slate-50 border-t border-slate-200 text-[10px] font-mono text-slate-500 text-right">
              Page {p.pageNumber} / {totalPages}
            </div>
          )}
        </div>
      ))}

      {totalPages > pages.length && (
        <div className="text-center text-[11px] text-slate-600 py-1">
          Affichage des {pages.length} premières pages sur {totalPages}. Utilisez « Ouvrir » ou « Télécharger » pour consulter l’intégralité du PDF.
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div>
        {renderCompactActionBar(false)}
        <div className="h-[480px] sm:h-[520px] bg-slate-100/70 flex flex-col items-center justify-center gap-2.5 text-slate-600 p-6">
          <Loader2 className="w-6 h-6 animate-spin text-slate-800" />
          <div className="text-xs font-semibold text-slate-800">
            Chargement de l'aperçu PDF…
          </div>
          <div className="text-[11px] font-mono text-slate-500 truncate max-w-full">
            {fileName}
          </div>
        </div>
      </div>
    );
  }

  if (errorMsg || pages.length === 0) {
    return (
      <div>
        {renderCompactActionBar(false)}
        <div className="p-5 bg-white space-y-3 text-xs">
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <FileText className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0 flex-1">
              <div className="font-bold text-slate-900 truncate">{fileName}</div>
              <div className="text-[11px] text-slate-600">
                Document PDF vérifié et enregistré{fileSize ? ` (${fileSize})` : ''}.
              </div>
              {errorMsg && (
                <div className="text-[11px] text-amber-800 flex items-center gap-1 pt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          </div>

          {extractedText && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 whitespace-pre-wrap max-h-64 overflow-y-auto font-mono">
              {extractedText}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Unified Compact Top Action Bar */}
      {renderCompactActionBar(false)}

      {/* Spacious Scrollable Large-Format PDF Page Container */}
      {renderPagesList('h-[480px] sm:h-[540px]')}

      {/* Fullscreen Lightbox Viewer */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-6xl w-full max-h-[94vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {renderCompactActionBar(true)}
            {renderPagesList('flex-1 max-h-[85vh]')}
          </div>
        </div>
      )}
    </>
  );
};
