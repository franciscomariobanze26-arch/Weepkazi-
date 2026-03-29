
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Plus, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { compressImage } from '../lib/imageUtils';
import { cn } from '../App';

interface ImageUploadProps {
  onImageUploaded: (base64: string) => void;
  currentImage?: string;
  label?: string;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'any';
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  onImageUploaded, 
  currentImage, 
  label = "Adicionar Foto", 
  className,
  aspectRatio = 'square'
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setIsProcessing(true);
      try {
        const compressed = await compressImage(file, 1024, 1024, 0.6);
        onImageUploaded(compressed);
      } catch (error) {
        console.error('Image processing error:', error);
        alert('Erro ao processar imagem. Tenta outra.');
      } finally {
        setIsProcessing(false);
      }
    }
  }, [onImageUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  });

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageUploaded('');
  };

  return (
    <div 
      {...getRootProps()} 
      className={cn(
        "relative group cursor-pointer overflow-hidden border-2 border-dashed transition-all flex items-center justify-center",
        aspectRatio === 'square' ? "aspect-square rounded-[32px]" : "aspect-video rounded-3xl",
        isDragActive ? "border-primary bg-primary/5" : "border-brand-gray hover:border-primary/40 bg-brand-bg",
        className
      )}
    >
      <input {...getInputProps()} />
      
      {currentImage ? (
        <>
          <img src={currentImage} className="w-full h-full object-cover" alt="Uploaded" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <p className="text-white text-xs font-bold uppercase tracking-widest">Alterar Foto</p>
          </div>
          <button 
            onClick={handleRemove}
            className="absolute top-2 right-2 p-2 bg-white/90 text-brand-ink rounded-xl shadow-lg hover:bg-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </>
      ) : (
        <div className="text-center p-6">
          {isProcessing ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
          ) : (
            <Plus className={cn("w-8 h-8 mx-auto mb-2", isDragActive ? "text-primary" : "text-brand-ink/20")} />
          )}
          <p className={cn(
            "text-xs font-bold uppercase tracking-widest",
            isDragActive ? "text-primary" : "text-brand-ink/40"
          )}>
            {isProcessing ? "A processar..." : isDragActive ? "Larga para carregar" : label}
          </p>
          <p className="text-[10px] text-brand-ink/30 mt-2 font-medium">PNG, JPG até 5MB</p>
        </div>
      )}
    </div>
  );
};
