import React, { useState, useEffect } from 'react';
import type { ComicPanel } from '../types';

interface ComicGridProps {
  panels: ComicPanel[];
  onRegenerate?: () => void;
  onRegeneratePanel?: (id: number) => void;
}

const ComicGrid: React.FC<ComicGridProps> = ({ panels, onRegenerate, onRegeneratePanel }) => {
  const [previewPanelId, setPreviewPanelId] = useState<number | null>(null);

  const isGenerating = panels.some(p => p.status === 'loading');
  const hasContent = panels.some(p => p.status === 'completed');
  const validPanels = panels.filter(p => p.status === 'completed' && p.imageData);
  const currentPreviewPanel = validPanels.find(p => p.id === previewPanelId);

  useEffect(() => {
    if (previewPanelId === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentIndex = validPanels.findIndex(p => p.id === previewPanelId);
      
      if (e.key === 'Escape') {
        setPreviewPanelId(null);
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setPreviewPanelId(validPanels[currentIndex - 1].id);
      } else if (e.key === 'ArrowRight' && currentIndex < validPanels.length - 1) {
        setPreviewPanelId(validPanels[currentIndex + 1].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewPanelId, validPanels]);

  const handleDownload = async () => {
    const validPanels = panels.filter(p => p.status === 'completed' && p.imageData);
    if (validPanels.length === 0) return;

    for (const panel of validPanels) {
      if (!panel.imageData) continue;
      const link = document.createElement('a');
      link.href = `data:image/png;base64,${panel.imageData}`;
      link.download = `comic-panel-${panel.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = validPanels.findIndex(p => p.id === previewPanelId);
    if (currentIndex > 0) {
      setPreviewPanelId(validPanels[currentIndex - 1].id);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = validPanels.findIndex(p => p.id === previewPanelId);
    if (currentIndex < validPanels.length - 1) {
      setPreviewPanelId(validPanels[currentIndex + 1].id);
    }
  };

  return (
     <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded bg-rose-50 text-rose-600 text-xs font-bold">2</span>
          漫画预览 (Preview)
        </h3>
        <div className="flex gap-3">
            {hasContent && onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-full hover:border-rose-200 hover:text-rose-600 hover:bg-rose-50 transition-all shadow-sm active:scale-95 disabled:opacity-50 group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500 ${isGenerating ? 'animate-spin' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          )}
          {hasContent && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-rose-600 rounded-full hover:bg-rose-700 transition-all shadow-md shadow-rose-200 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              一键下载
            </button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {panels.map((panel) => (
          <div 
            key={panel.id} 
            className="relative bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden aspect-square flex items-center justify-center group"
          >
            {panel.status === 'completed' && panel.imageData ? (
              <>
                <img
                  src={`data:image/png;base64,${panel.imageData}`}
                  alt={`Panel ${panel.id}`}
                  className="w-full h-full object-cover cursor-zoom-in transition-transform duration-500 group-hover:scale-105"
                  onClick={() => setPreviewPanelId(panel.id)}
                />
                <div className="absolute top-2 left-2 bg-black/40 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  #{panel.id}
                </div>
                {onRegeneratePanel && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRegeneratePanel(panel.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-gray-500 hover:text-rose-600 shadow-sm transition-all opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100"
                    title="重绘此格"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  </button>
                )}
              </>
            ) : panel.status === 'loading' ? (
              <div className="flex flex-col items-center justify-center p-4 w-full h-full bg-gray-50">
                <div className="relative w-8 h-8 mb-3">
                   <div className="absolute inset-0 border-2 border-gray-100 rounded-full"></div>
                   <div className="absolute inset-0 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-[10px] font-bold text-gray-400 animate-pulse uppercase tracking-wider">Drawing</p>
              </div>
            ) : panel.status === 'error' ? (
               <div className="flex flex-col items-center justify-center bg-red-50/20 w-full h-full p-4 text-center group cursor-pointer border-2 border-dashed border-red-50 hover:border-red-200 transition-colors" onClick={() => onRegeneratePanel && onRegeneratePanel(panel.id)}>
                 <p className="text-xs font-bold text-red-400">Failed</p>
                 <span className="text-[10px] text-red-300 mt-1">Retry</span>
               </div>
            ) : (
              <div className="flex flex-col items-center justify-center bg-gray-50/50 w-full h-full border border-dashed border-gray-200 rounded-xl">
                <span className="text-gray-300 font-bold text-2xl opacity-20">#{panel.id}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {currentPreviewPanel && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-fade-in"
          onClick={() => setPreviewPanelId(null)}
        >
          <div className="relative w-full max-w-5xl h-full max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {/* Nav Buttons */}
            {validPanels.indexOf(currentPreviewPanel) > 0 && (
              <button
                onClick={handlePrev}
                className="absolute left-2 md:-left-20 p-4 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-all z-20"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6 md:w-8 md:h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
            )}

            <div className="relative group">
               <img 
                src={`data:image/png;base64,${currentPreviewPanel.imageData}`} 
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                alt="Preview"
              />
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
                  onClick={() => setPreviewPanelId(null)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {validPanels.indexOf(currentPreviewPanel) < validPanels.length - 1 && (
              <button
                onClick={handleNext}
                className="absolute right-2 md:-right-20 p-4 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-all z-20"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6 md:w-8 md:h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            )}
            
            {/* Click outside to close helper */}
             <div className="absolute inset-0 -z-10" onClick={() => setPreviewPanelId(null)}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComicGrid;