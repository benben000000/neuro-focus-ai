import React, { useRef, useState } from 'react';
import { Upload, X, FileText, Image as ImageIcon, FileType, Loader, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import { parseFile, ParsedFile } from '../../utils/fileParsers';

export interface UploadedFile {
    id: string;
    file: File;
    status: 'queued' | 'parsing' | 'ready' | 'error';
    progress: number;
    parsedContent?: ParsedFile;
    error?: string;
}

interface NoteUploadPanelProps {
    onFilesChanged: (files: UploadedFile[]) => void;
    disabled?: boolean;
}

export const NoteUploadPanel: React.FC<NoteUploadPanelProps> = ({ onFilesChanged, disabled = false }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileSelect = async (selectedFiles: File[]) => {
        const newFiles: UploadedFile[] = selectedFiles.map(file => ({
            id: Math.random().toString(36).substring(2, 9),
            file,
            status: 'queued',
            progress: 0
        }));

        const updatedFiles = [...files, ...newFiles];
        setFiles(updatedFiles);
        onFilesChanged(updatedFiles);

        // Process files one by one
        for (const fileObj of newFiles) {
            await processFile(fileObj.id, fileObj.file);
        }
    };

    const processFile = async (id: string, file: File) => {
        updateFileStatus(id, 'parsing', 0);

        try {
            // Simulate progress for better UX
            const progressInterval = setInterval(() => {
                setFiles(prev => prev.map(f => {
                    if (f.id === id && f.status === 'parsing') {
                        return { ...f, progress: Math.min(90, f.progress + 10) };
                    }
                    return f;
                }));
            }, 200);

            const parsed = await parseFile(file);

            clearInterval(progressInterval);
            updateFileStatus(id, 'ready', 100, parsed);
        } catch (error) {
            console.error(`Error parsing file ${file.name}:`, error);
            updateFileStatus(id, 'error', 0, undefined, error instanceof Error ? error.message : 'Unknown error');
        }
    };

    const updateFileStatus = (
        id: string,
        status: UploadedFile['status'],
        progress: number,
        parsedContent?: ParsedFile,
        error?: string
    ) => {
        setFiles(prev => {
            const newFiles = prev.map(f => {
                if (f.id === id) {
                    return { ...f, status, progress, parsedContent, error };
                }
                return f;
            });
            // Defer the callback to avoid render loop if needed, but here it's fine
            setTimeout(() => onFilesChanged(newFiles), 0);
            return newFiles;
        });
    };

    const removeFile = (id: string) => {
        setFiles(prev => {
            const newFiles = prev.filter(f => f.id !== id);
            onFilesChanged(newFiles);
            return newFiles;
        });
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
    };

    const onDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(Array.from(e.dataTransfer.files));
        }
    };

    const getFileIcon = (type: string) => {
        if (type.includes('pdf')) return <FileType className="text-red-500" size={20} />;
        if (type.includes('image')) return <ImageIcon className="text-blue-500" size={20} />;
        if (type.includes('word')) return <FileText className="text-blue-700" size={20} />;
        return <FileText className="text-slate-500" size={20} />;
    };

    return (
        <div className="space-y-4">
            {/* Drop Zone */}
            <div
                className={`
          relative border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer
          ${isDragging
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.01]'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => !disabled && inputRef.current?.click()}
            >
                <div className="p-8 text-center">
                    <div className="mx-auto w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-3">
                        <Upload size={24} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Upload Notes
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">
                        Drag & drop or click to browse
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-400">
                        <span className="px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">PDF</span>
                        <span className="px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">DOCX</span>
                        <span className="px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">TXT</span>
                        <span className="px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">JPG/PNG</span>
                    </div>
                </div>
                <input
                    type="file"
                    ref={inputRef}
                    className="hidden"
                    multiple
                    accept=".pdf,.docx,.txt,.md,.jpg,.jpeg,.png"
                    onChange={(e) => e.target.files && handleFileSelect(Array.from(e.target.files))}
                    disabled={disabled}
                />
            </div>

            {/* File List */}
            {files.length > 0 && (
                <div className="space-y-2">
                    {files.map(file => (
                        <div
                            key={file.id}
                            className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm group"
                        >
                            <div className="flex-shrink-0">
                                {getFileIcon(file.file.type)}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate pr-2">
                                        {file.file.name}
                                    </p>
                                    <span className="text-xs text-slate-500 flex-shrink-0">
                                        {(file.file.size / 1024 / 1024).toFixed(2)} MB
                                    </span>
                                </div>

                                {/* Status Bar */}
                                <div className="relative h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className={`absolute top-0 left-0 h-full transition-all duration-300 ${file.status === 'error' ? 'bg-red-500' :
                                                file.status === 'ready' ? 'bg-emerald-500' :
                                                    'bg-indigo-500'
                                            }`}
                                        style={{ width: `${file.progress}%` }}
                                    />
                                </div>

                                {/* Status Text */}
                                <div className="flex items-center justify-between mt-1">
                                    <span className={`text-xs ${file.status === 'error' ? 'text-red-500' :
                                            file.status === 'ready' ? 'text-emerald-600' :
                                                'text-indigo-600'
                                        }`}>
                                        {file.status === 'queued' && 'Queued...'}
                                        {file.status === 'parsing' && 'Extracting text...'}
                                        {file.status === 'ready' && 'Ready'}
                                        {file.status === 'error' && (file.error || 'Failed')}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => removeFile(file.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Remove file"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
