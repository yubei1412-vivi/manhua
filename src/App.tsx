import React, { useState } from 'react';
import ImageUploader from './components/ImageUploader';
import ComicGrid from './components/ComicGrid';
import CopySection from './components/CopySection';
import type { ComicPanel, GeneratedCopy, GenerationState } from './types';
import { fileToGenerativePart, generateComicScript, generatePanelImage, generateXiaohongshuCopy, generateRandomStory } from './services/geminiService';

const App: React.FC = () => {
  // Input State
  const [image, setImage] = useState<File | null>(null);
  const [story, setStory] = useState<string>('');
  
  // Output State
  const [panels, setPanels] = useState<ComicPanel[]>([
    { id: 1, prompt: '', imageData: null, status: 'pending' },
    { id: 2, prompt: '', imageData: null, status: 'pending' },
    { id: 3, prompt: '', imageData: null, status: 'pending' },
    { id: 4, prompt: '', imageData: null, status: 'pending' },
  ]);
  const [copyData, setCopyData] = useState<GeneratedCopy | null>(null);

  // App State
  const [status, setStatus] = useState<GenerationState>({
    isGenerating: false,
    step: 'idle',
    error: null,
  });
  const [isCopyLoading, setIsCopyLoading] = useState(false);
  const [isStoryGenerating, setIsStoryGenerating] = useState(false);

  const handleRandomStory = async () => {
    setIsStoryGenerating(true);
    try {
      let randomStory = "";
      if (image) {
        const base64Image = await fileToGenerativePart(image);
        randomStory = await generateRandomStory(base64Image, image.type);
      } else {
        randomStory = await generateRandomStory();
      }
      setStory(randomStory);
    } catch (e) {
      console.error("Failed to generate random story", e);
      setStatus({ ...status, error: "无法生成随机故事，请重试 (Failed to generate random story)" });
    } finally {
      setIsStoryGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!image || !story.trim()) {
      setStatus({ ...status, error: "请先上传图片并输入故事描述 (Please upload image and enter story)" });
      return;
    }

    try {
      setStatus({ isGenerating: true, step: 'scripting', error: null });
      setPanels(prev => prev.map(p => ({ ...p, status: 'pending', imageData: null })));
      setCopyData(null);

      // 0. Pre-process Image
      const base64Image = await fileToGenerativePart(image);
      const imageMimeType = image.type;

      // 1. Generate Script
      const scripts = await generateComicScript(story);
      
      if (scripts.length !== 4) {
        throw new Error("Script generation failed to produce 4 panels.");
      }

      setPanels(prev => prev.map((p, i) => ({ ...p, prompt: scripts[i], status: 'loading' })));
      
      // 2. Start Parallel Image Generation & Copywriting
      setStatus({ isGenerating: true, step: 'drawing', error: null });

      // Create promises for images
      const imagePromises = scripts.map(async (prompt, index) => {
        try {
          const imageData = await generatePanelImage(base64Image, prompt, imageMimeType);
          setPanels(currentPanels => 
            currentPanels.map(p => 
              p.id === index + 1 ? { ...p, imageData, status: 'completed' } : p
            )
          );
        } catch (error) {
          console.error(`Failed to generate panel ${index + 1}`, error);
          setPanels(currentPanels => 
            currentPanels.map(p => 
              p.id === index + 1 ? { ...p, status: 'error' } : p
            )
          );
        }
      });

      // Start copywriting in parallel
      const copyPromise = (async () => {
        try {
            const copy = await generateXiaohongshuCopy(story);
            setCopyData(copy);
        } catch (e) {
            console.error("Copy generation failed", e);
        }
      })();

      // Wait for all
      await Promise.all([...imagePromises, copyPromise]);

      setStatus({ isGenerating: false, step: 'done', error: null });

    } catch (error: any) {
      console.error(error);
      setStatus({ 
        isGenerating: false, 
        step: 'idle', 
        error: error.message || "Something went wrong. Please try again." 
      });
    }
  };

  const handleRegenerateImages = async () => {
    if (!image) return;
    const currentPanels = [...panels];
    if (currentPanels.some(p => !p.prompt)) return; 

    setPanels(prev => prev.map(p => ({ ...p, status: 'loading', imageData: null })));

    try {
      const base64Image = await fileToGenerativePart(image);
      const imageMimeType = image.type;

      const promises = currentPanels.map(async (panel) => {
         try {
           const imageData = await generatePanelImage(base64Image, panel.prompt, imageMimeType);
           setPanels(prev => prev.map(p => p.id === panel.id ? { ...p, imageData, status: 'completed' } : p));
         } catch (e) {
           console.error(e);
           setPanels(prev => prev.map(p => p.id === panel.id ? { ...p, status: 'error' } : p));
         }
      });
      await Promise.all(promises);
    } catch (e) {
      console.error("Regeneration failed", e);
      setStatus({ ...status, error: "Regeneration failed." });
    }
  };

  const handleRegeneratePanel = async (id: number) => {
    const targetPanel = panels.find(p => p.id === id);
    if (!image || !targetPanel || !targetPanel.prompt) return;

    setPanels(prev => prev.map(p => p.id === id ? { ...p, status: 'loading' } : p));

    try {
      const base64Image = await fileToGenerativePart(image);
      const imageMimeType = image.type;
      const imageData = await generatePanelImage(base64Image, targetPanel.prompt, imageMimeType);
      setPanels(prev => prev.map(p => p.id === id ? { ...p, status: 'completed', imageData } : p));
    } catch (e) {
      console.error(e);
      setPanels(prev => prev.map(p => p.id === id ? { ...p, status: 'error' } : p));
    }
  };

  const handleRegenerateCopy = async () => {
    if (!story) return;
    setIsCopyLoading(true);
    setCopyData(null);
    try {
      const copy = await generateXiaohongshuCopy(story);
      setCopyData(copy);
    } catch (e) {
      console.error("Copy regeneration failed", e);
    } finally {
      setIsCopyLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-gray-800 pb-12 font-sans selection:bg-rose-100 selection:text-rose-600">
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl pl-6 sm:pl-8 pr-4 sm:pr-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-16 h-8 bg-rose-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md shadow-rose-200">
              灌木
            </div>
            <h1 className="font-bold text-lg tracking-tight text-gray-800">
              ComicGen <span className="text-rose-600">AI</span>
            </h1>
          </div>
          <nav className="flex items-center gap-4">
            <a href="#" className="text-sm font-medium text-gray-500 hover:text-rose-600 transition-colors">
            </a>
          </nav>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-24">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Input (4 columns on large screens) */}
          <div className="md:col-span-4 lg:col-span-3 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded bg-rose-50 text-rose-600 text-xs font-bold">1</span>
                配置 (Settings)
              </h2>
              
              <ImageUploader 
                selectedImage={image} 
                onImageSelect={setImage} 
              />

              <div className="mt-8">
                <div className="flex justify-between items-end mb-3">
                  <label className="block text-sm font-bold text-gray-700">
                    输入故事 (Story)
                  </label>
                  <button 
                    onClick={handleRandomStory}
                    disabled={isStoryGenerating || status.isGenerating}
                    className="group relative px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-medium transition-all hover:bg-rose-100 hover:shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                  >
                     <span className={`text-xs ${isStoryGenerating ? 'animate-spin' : ''}`}>
                        {isStoryGenerating ? '⏳' : '🎲'}
                     </span>
                    {isStoryGenerating ? '构思中...' : '随机灵感'}
                  </button>
                </div>
                <div className="relative group">
                  <textarea
                    value={story}
                    onChange={(e) => setStory(e.target.value)}
                    placeholder="例如：一个小女孩在公园里迷路了，遇到了一只神奇的猫，猫带她找到了宝藏，最后发现宝藏是友谊..."
                    className="w-full h-40 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-rose-500 focus:ring-1 focus:ring-rose-200 transition-all resize-none text-sm leading-relaxed placeholder-gray-400"
                  />
                  <div className="absolute bottom-3 right-3 text-[10px] text-gray-400 font-medium pointer-events-none bg-white/60 px-2 rounded-full backdrop-blur-sm">
                     {story.length} chars
                  </div>
                </div>
              </div>

              {status.error && (
                <div className="mt-5 p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 flex gap-2 items-start">
                  <span className="text-base">⚠️</span>
                  <span className="mt-0.5">{status.error}</span>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={status.isGenerating}
                className={`mt-8 w-full py-3.5 px-6 rounded-xl font-bold text-white text-base tracking-wide shadow-lg shadow-rose-200 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2
                  ${status.isGenerating 
                    ? 'bg-gray-400 cursor-not-allowed shadow-none' 
                    : 'bg-rose-600 hover:bg-rose-700 hover:shadow-rose-300'
                  }`}
              >
                {status.isGenerating ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    开始生成
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Results (8 columns on large screens) */}
          <div className="md:col-span-8 lg:col-span-9 grid grid-cols-1 xl:grid-cols-2 gap-8 items-stretch">
            <ComicGrid 
              panels={panels} 
              onRegenerate={handleRegenerateImages}
              onRegeneratePanel={handleRegeneratePanel}
            />
            
            <CopySection 
              copyData={copyData} 
              isLoading={(status.isGenerating && !copyData) || isCopyLoading}
              onRegenerate={handleRegenerateCopy}
            />
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;