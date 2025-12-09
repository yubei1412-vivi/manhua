import React, { useState } from 'react';
import type { GeneratedCopy } from '../types';

interface CopySectionProps {
  copyData: GeneratedCopy | null;
  isLoading: boolean;
  onRegenerate?: () => void;
}

const CopySection: React.FC<CopySectionProps> = ({ copyData, isLoading, onRegenerate }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!copyData) return;
    const fullText = `${copyData.title}\n\n${copyData.content}\n\n${copyData.tags.map(t => `#${t}`).join(' ')}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
        <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2 px-1">
          <span className="flex items-center justify-center w-6 h-6 rounded bg-rose-50 text-rose-600 text-xs font-bold">3</span>
          文案预览 (Copy)
        </h3>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 space-y-5">
            <div className="h-6 bg-gray-50 rounded w-2/3 animate-pulse"></div>
            <div className="space-y-2.5 pt-1">
                <div className="h-3.5 bg-gray-50 rounded w-full animate-pulse"></div>
                <div className="h-3.5 bg-gray-50 rounded w-full animate-pulse"></div>
                <div className="h-3.5 bg-gray-50 rounded w-4/5 animate-pulse"></div>
            </div>
            <div className="flex gap-2 pt-2">
                <div className="h-5 bg-gray-50 rounded-full w-12 animate-pulse"></div>
                <div className="h-5 bg-gray-50 rounded-full w-16 animate-pulse"></div>
            </div>
        </div>
      </div>
    );
  }

  if (!copyData && !onRegenerate) return null;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5 px-1">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
           <span className="flex items-center justify-center w-6 h-6 rounded bg-rose-50 text-rose-600 text-xs font-bold">3</span>
          文案预览 (Copy)
        </h3>
        <div className="flex gap-2">
          {onRegenerate && copyData && (
              <button
                onClick={onRegenerate}
                className="p-1.5 rounded-full text-gray-400 bg-white border border-gray-100 hover:text-rose-500 hover:border-rose-200 transition-all active:scale-95"
                title="重写文案"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </button>
            )}
            <button
              onClick={handleCopy}
              disabled={!copyData}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                copied 
                  ? 'bg-green-500 text-white shadow-md shadow-green-100 ring-0' 
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  复制
                </>
              )}
            </button>
        </div>
      </div>

       <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 flex-1 hover:border-rose-100 transition-colors duration-300">
        {copyData ? (
          <div className="p-6">
            <h1 className="font-bold text-gray-900 text-lg leading-relaxed mb-4">
              {copyData.title}
            </h1>
            
            <div className="text-gray-600 text-sm leading-6 whitespace-pre-wrap mb-6">
              {copyData.content}
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-50">
              {copyData.tags.map((tag, idx) => (
                <span 
                  key={idx} 
                  className="px-2.5 py-1 bg-gray-50 text-gray-500 rounded-full text-[10px] font-medium border border-gray-100 hover:text-rose-500 hover:border-rose-100 transition-colors cursor-default"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-300">
             <div className="w-12 h-12 bg-gray-50 rounded-full mx-auto mb-3 flex items-center justify-center border border-gray-100">
               <span className="text-2xl opacity-30">📝</span>
             </div>
             <p className="text-xs">Waiting for generation...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CopySection;