import React, { useCallback } from 'react';

interface ImageUploaderProps {
  selectedImage: File | null;
  onImageSelect: (file: File) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ selectedImage, onImageSelect }) => {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        onImageSelect(e.dataTransfer.files[0]);
      }
    },
    [onImageSelect]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageSelect(e.target.files[0]);
    }
  };

  return (
    <div className="w-full group">
      <label className="block text-sm font-bold text-gray-700 mb-3">
        1. 上传角色 (Reference Image)
      </label>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`relative w-full h-52 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer overflow-hidden
          ${selectedImage 
            ? 'border-2 border-rose-500 bg-rose-50/20' 
            : 'border-2 border-dashed border-gray-200 bg-gray-50/50 hover:border-rose-400 hover:bg-rose-50/10 hover:shadow-lg hover:shadow-gray-200/50'
          }`}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        
        {selectedImage ? (
          <div className="relative w-full h-full flex items-center justify-center p-3">
            <img
              src={URL.createObjectURL(selectedImage)}
              alt="Preview"
              className="h-full w-full object-contain rounded-xl shadow-sm"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transform translate-y-3 group-hover:translate-y-0 transition-all duration-300 bg-white/95 backdrop-blur text-gray-800 px-5 py-2.5 rounded-full text-xs font-bold shadow-xl flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  更换图片
                </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-6 transition-transform duration-300 group-hover:scale-105">
            <div className="w-16 h-16 mx-auto mb-4 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100 group-hover:shadow-md transition-shadow">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400 group-hover:text-rose-500 transition-colors">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
               </svg>
            </div>
            <p className="text-sm font-semibold text-gray-600">点击上传或拖拽图片</p>
            <p className="text-xs text-gray-400 mt-2">支持 JPG, PNG • 推荐单人角色图</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;