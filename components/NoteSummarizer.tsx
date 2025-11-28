import React, { useState, useEffect } from 'react';
import { useActivity } from '../contexts/ActivityContext';
import { FileUploader } from './FileUploader';
import { FileAttachment } from '../types';
import { FileText, Loader, AlertCircle, CheckCircle } from 'lucide-react';

type ViewState = 'empty' | 'loading' | 'success' | 'error';

export function NoteSummarizer() {
  const { setSubject } = useActivity();
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [viewState, setViewState] = useState<ViewState>('empty');
  const [summaryResult, setSummaryResult] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    setSubject('Notes');
  }, [setSubject]);

  const handleFilesSelected = (files: FileAttachment[]) => {
    setAttachments(files);
    if (files.length > 0) {
      setViewState('loading');
      setTimeout(() => {
        setSummaryResult(`Processed ${files.length} file(s). AI summarization coming soon.`);
        setViewState('success');
      }, 1500);
    }
  };

  const handleReset = () => {
    setAttachments([]);
    setSummaryResult('');
    setErrorMessage('');
    setViewState('empty');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <FileText className="text-indigo-600 dark:text-indigo-400" size={32} />
            Note Summarizer
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Upload your notes and get instant AI-powered summaries
          </p>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Upload Section */}
        {viewState === 'empty' && (
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Upload Your Notes
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Supported formats: PDF, Text, Markdown, and Images
              </p>
            </div>
            <FileUploader onFilesSelected={handleFilesSelected} />
          </div>
        )}

        {/* Loading State */}
        {viewState === 'loading' && (
          <div className="p-12 flex flex-col items-center justify-center text-center min-h-[300px]">
            <div className="mb-4 flex items-center justify-center">
              <div className="animate-spin">
                <Loader size={40} className="text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Processing Your Notes
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md">
              Our AI is analyzing your notes and creating a summary. This may take a moment...
            </p>
          </div>
        )}

        {/* Success State */}
        {viewState === 'success' && (
          <div className="p-8 space-y-6">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <CheckCircle size={24} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
                  Summary Ready
                </h3>
                <p className="text-sm text-emerald-700 dark:text-emerald-200">
                  {attachments.length} file(s) processed successfully
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 dark:text-white">Uploaded Files</h3>
              <div className="space-y-2">
                {attachments.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <FileText size={18} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {file.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 dark:text-white">Summary</h3>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[150px]">
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {summaryResult}
                </p>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
            >
              Summarize Another File
            </button>
          </div>
        )}

        {/* Error State */}
        {viewState === 'error' && (
          <div className="p-12 flex flex-col items-center justify-center text-center min-h-[300px]">
            <div className="mb-4 flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full">
              <AlertCircle size={32} className="text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Something Went Wrong
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6">
              {errorMessage || 'An error occurred while processing your notes. Please try again.'}
            </p>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Feature Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
              📄
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
                Multiple Formats
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-200 mt-1">
                Support for PDF, text, markdown, and images
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400">
              ✨
            </div>
            <div>
              <h4 className="font-semibold text-purple-900 dark:text-purple-100 text-sm">
                AI-Powered
              </h4>
              <p className="text-xs text-purple-700 dark:text-purple-200 mt-1">
                Intelligent summarization with key insights
              </p>
            </div>
          </div>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              ⚡
            </div>
            <div>
              <h4 className="font-semibold text-emerald-900 dark:text-emerald-100 text-sm">
                Instant Results
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-200 mt-1">
                Get summaries in seconds
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
