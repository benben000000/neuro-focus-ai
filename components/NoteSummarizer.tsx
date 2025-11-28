import React, { useState, useEffect } from 'react';
import { useActivity } from '../contexts/ActivityContext';
import { useAuth } from '../contexts/AuthContext';
import { NoteUploadPanel, UploadedFile } from './NoteSummarizer/NoteUploadPanel';
import { SummarySectionsAccordion } from './NoteSummarizer/SummarySectionsAccordion';
import { KeyConceptsBar } from './NoteSummarizer/KeyConceptsBar';
import { ConceptMap } from './NoteSummarizer/ConceptMap';
import { ActiveRecallDeck } from './NoteSummarizer/ActiveRecallDeck';
import { SpacedRepetitionList } from './NoteSummarizer/SpacedRepetitionList';
import { ElaborationBlocks } from './NoteSummarizer/ElaborationBlocks';
import { FileAttachment, NoteSummary, DetectedSubject } from '../types';
import { detectSubject, generateStructuredSummary } from '../services/noteSummarizer';
import { saveNoteSummary } from '../services/notes';
import { FileText, Loader, AlertCircle, CheckCircle, Save, RefreshCw } from 'lucide-react';

type ViewState = 'upload' | 'analyzing' | 'generating' | 'success' | 'error';

export function NoteSummarizer() {
  const { setSubject } = useActivity();
  const { user } = useAuth();

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [viewState, setViewState] = useState<ViewState>('upload');
  const [summary, setSummary] = useState<NoteSummary | null>(null);
  const [detectedSubject, setDetectedSubject] = useState<DetectedSubject>('general');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setSubject('Notes');
  }, [setSubject]);

  const handleFilesChanged = (newFiles: UploadedFile[]) => {
    setFiles(newFiles);
  };

  const canSummarize = files.length > 0 && files.every((f: UploadedFile) => f.status === 'ready');

  const handleSummarize = async () => {
    if (!canSummarize) return;

    try {
      setViewState('analyzing');

      // Prepare attachments for AI
      const attachments: FileAttachment[] = files
        .filter((f: UploadedFile) => f.parsedContent)
        .map((f: UploadedFile) => ({
          name: f.file.name,
          mimeType: 'text/plain', // We send parsed text to Gemini to avoid token limits/parsing issues with raw files if possible, or we can send raw. 
          // The service expects FileAttachment with base64 data usually. 
          // But our new parser returns text. 
          // Let's adapt: The service `prepareContentWithAttachments` uses inlineData. 
          // If we want to use the parsed text, we should probably modify the service or just send the text as part of the prompt.
          // However, the service `generateStructuredSummary` takes `attachments`.
          // Let's construct a text file attachment from the parsed text.
          data: btoa(unescape(encodeURIComponent(f.parsedContent!.text))) // Simple base64 encoding of text
        }));

      // 1. Detect Subject
      const detectionResult = await detectSubject(attachments);
      setDetectedSubject(detectionResult.subject);

      setViewState('generating');

      // 2. Generate Summary
      const result = await generateStructuredSummary(detectionResult.subject, attachments);
      setSummary(result);
      setViewState('success');

    } catch (error) {
      console.error("Summarization failed:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to generate summary");
      setViewState('error');
    }
  };

  const handleSave = async () => {
    if (!user || !summary) return;

    try {
      setIsSaving(true);
      const sourceFiles = files.map((f: UploadedFile) => ({
        name: f.file.name,
        type: f.file.type,
        size: f.file.size
      }));

      await saveNoteSummary(user.uid, summary, sourceFiles);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Save failed:", error);
      // Could show a toast here
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setSummary(null);
    setViewState('upload');
    setErrorMessage('');
    setSaveSuccess(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
              <FileText size={32} />
            </div>
            Note Summarizer
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 ml-14">
            Transform your documents into interactive study guides
          </p>
        </div>

        {viewState === 'success' && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <RefreshCw size={18} />
              New Summary
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || saveSuccess}
              className={`
                px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2
                ${saveSuccess
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-indigo-500/30'
                }
              `}
            >
              {saveSuccess ? (
                <>
                  <CheckCircle size={18} />
                  Saved to Profile
                </>
              ) : (
                <>
                  {isSaving ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
                  Save Summary
                </>
              )}
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[500px]">

        {/* Upload State */}
        {viewState === 'upload' && (
          <div className="p-8 max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
                Upload Your Material
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                We support PDF, DOCX, TXT, and Images. Multiple files supported.
              </p>
            </div>

            <NoteUploadPanel onFilesChanged={handleFilesChanged} />

            <div className="mt-8 flex justify-center">
              <button
                onClick={handleSummarize}
                disabled={!canSummarize}
                className={`
                  w-full md:w-auto px-8 py-3 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2
                  ${canSummarize
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl hover:shadow-indigo-500/20 transform hover:-translate-y-0.5'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <span>Generate Summary</span>
                  {canSummarize && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Loading States */}
        {(viewState === 'analyzing' || viewState === 'generating') && (
          <div className="p-12 flex flex-col items-center justify-center text-center h-[500px]">
            <div className="relative mb-8">
              <div className="w-20 h-20 border-4 border-indigo-100 dark:border-indigo-900/30 rounded-full animate-pulse"></div>
              <div className="absolute top-0 left-0 w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <Loader size={32} className="text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              {viewState === 'analyzing' ? 'Analyzing Documents...' : 'Generating Study Guide...'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md animate-pulse">
              {viewState === 'analyzing'
                ? 'Detecting subject matter and extracting key text.'
                : 'Creating structured summaries, concept maps, and review questions.'}
            </p>
          </div>
        )}

        {/* Error State */}
        {viewState === 'error' && (
          <div className="p-12 flex flex-col items-center justify-center text-center h-[500px]">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-6">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Generation Failed
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
              {errorMessage}
            </p>
            <button
              onClick={() => setViewState('upload')}
              className="px-6 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Success State - The Dashboard */}
        {viewState === 'success' && summary && (
          <div className="flex flex-col lg:flex-row h-full">
            {/* Sidebar / Navigation (Desktop) */}
            <div className="hidden lg:block w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-6 space-y-6">
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Structure
                </h3>
                <nav className="space-y-1">
                  {['Overview', 'Key Concepts', 'Concept Map', 'Active Recall', 'Study Plan'].map((item) => (
                    <a
                      key={item}
                      href={`#${item.toLowerCase().replace(' ', '-')}`}
                      className="block px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                    >
                      {item}
                    </a>
                  ))}
                </nav>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Metadata
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-slate-500 block text-xs">Subject</span>
                    <span className="font-medium text-slate-900 dark:text-white capitalize">
                      {detectedSubject.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Source Files</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {files.length} file(s)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 lg:p-10 space-y-12 overflow-y-auto max-h-[calc(100vh-200px)]">

              {/* Title Section */}
              <div id="overview">
                <span className="inline-block px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-4 capitalize">
                  {detectedSubject.replace('_', ' ')}
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-6">
                  {summary.title}
                </h2>
                <SummarySectionsAccordion sections={summary.sections} />
              </div>

              {/* Key Concepts */}
              <div id="key-concepts" className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-8 h-1 bg-indigo-500 rounded-full"></span>
                  Key Concepts
                </h3>
                <KeyConceptsBar concepts={summary.keyConcepts} />
              </div>

              {/* Concept Map */}
              <div id="concept-map" className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-8 h-1 bg-purple-500 rounded-full"></span>
                  Knowledge Graph
                </h3>
                <ConceptMap nodes={summary.conceptMap.nodes} links={summary.conceptMap.links} />
              </div>

              {/* Elaboration */}
              <div id="deep-dive" className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-8 h-1 bg-blue-500 rounded-full"></span>
                  Deep Dive
                </h3>
                <ElaborationBlocks blocks={summary.elaborationBlocks} />
              </div>

              {/* Active Recall */}
              <div id="active-recall" className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-8 h-1 bg-emerald-500 rounded-full"></span>
                  Active Recall Deck
                </h3>
                <ActiveRecallDeck questions={summary.activeRecallQuestions} />
              </div>

              {/* Spaced Repetition */}
              <div id="study-plan" className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-8 h-1 bg-amber-500 rounded-full"></span>
                  Spaced Repetition Schedule
                </h3>
                <SpacedRepetitionList signals={summary.spacedRepetitionSignals} />
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

