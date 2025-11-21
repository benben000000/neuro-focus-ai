import React, { useRef, useState } from 'react';
import { Upload, X, FileText, Image as ImageIcon, FileType, Presentation, File, Edit3 } from 'lucide-react';
import { FileAttachment } from '../types';
import { ImageEditor } from './ImageEditor';

interface FileUploaderProps {
  onFilesSelected: (files: FileAttachment[]) => void;
  compact?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFilesSelected, compact = false }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // Removed Office types as they cause API 400 errors with Gemini inlineData
  const allowedTypes = [
    "application/pdf",
    "text/plain",
    "text/markdown",
    "image/*"
  ].join(",");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files: File[] = Array.from(e.target.files);
      
      // Check if first file is an image
      if (files.length > 0 && files[0].type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setImageToEdit(event.target?.result as string);
          setPendingFiles(files);
        };
        reader.readAsDataURL(files[0]);
      } else {
        await processFiles(files);
      }
      
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const processFiles = async (files: File[]) => {
    setProcessing(true);
    const processed: FileAttachment[] = [];

    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) {
        alert(`File ${file.name} is too large (max 20MB)`);
        continue;
      }

      try {
        const base64 = await fileToBase64(file);
        const base64Data = base64.split(',')[1];
        
        processed.push({
          name: file.name,
          mimeType: file.type,
          data: base64Data
        });
      } catch (err) {
        console.error("Error processing file", err);
      }
    }

    onFilesSelected(processed);
    setProcessing(false);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageEditorSave = async (editedDataUrl: string) => {
    const processed: FileAttachment[] = [];
    
    // Process the edited image
    const base64Data = editedDataUrl.split(',')[1];
    processed.push({
      name: pendingFiles[0]?.name || 'image.jpg',
      mimeType: 'image/jpeg',
      data: base64Data
    });
    
    // Process remaining non-image files
    if (pendingFiles.length > 1) {
      for (let i = 1; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        if (!file.type.startsWith('image/')) {
          try {
            const base64 = await fileToBase64(file);
            const base64WithoutHeader = base64.split(',')[1];
            processed.push({
              name: file.name,
              mimeType: file.type,
              data: base64WithoutHeader
            });
          } catch (err) {
            console.error("Error processing file", err);
          }
        }
      }
    }
    
    onFilesSelected(processed);
    setImageToEdit(null);
    setPendingFiles([]);
  };

  const handleImageEditorCancel = () => {
    setImageToEdit(null);
    setPendingFiles([]);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <>
      {imageToEdit && (
        <ImageEditor
          imageDataUrl={imageToEdit}
          onSave={handleImageEditorSave}
          onCancel={handleImageEditorCancel}
        />
      )}
      {!imageToEdit && (
      <div className="w-full">
      <div 
        className={`relative border-2 border-dashed rounded-xl transition-colors cursor-pointer group
          ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}
          ${compact ? 'p-3 flex items-center justify-center gap-2' : 'p-6 text-center'}
        `}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        {processing ? (
           <div className="flex items-center justify-center text-indigo-600">
               <div className="animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full mr-2"></div>
               <span className="text-xs font-medium">Processing...</span>
           </div>
        ) : (
          <>
            {compact ? (
               <>
                 <Upload size={16} className="text-slate-500 group-hover:text-indigo-600" />
                 <span className="text-xs font-medium text-slate-600 group-hover:text-indigo-700">Add Files</span>
               </>
            ) : (
               <>
                <div className="mx-auto w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload size={24} />
                </div>
                <p className="text-sm font-medium text-slate-900">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  PDF, Text, Markdown, Images (max 20MB)
                </p>
               </>
            )}
          </>
        )}
        
        <input 
          type="file" 
          ref={inputRef} 
          className="hidden" 
          multiple 
          accept={allowedTypes}
          onChange={handleFileChange}
        />
      </div>
      </div>
      )}
    </>
  );
};