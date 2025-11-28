import React, { useState } from 'react';
import { Mic, BookOpen, MessageSquare, PenTool, Globe, Trophy, Flame, Target } from 'lucide-react';
import { VoiceSessionConfig } from '../types';

interface LanguageLabProps {
  onStartVoice?: (config?: VoiceSessionConfig) => void;
  onClose?: () => void;
}

export function LanguageLab({ onStartVoice, onClose }: LanguageLabProps) {
  const [activeTab, setActiveTab] = useState<'daily' | 'coach' | 'writing'>('daily');
  const [selectedLanguage, setSelectedLanguage] = useState('Spanish');

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Globe className="text-indigo-600 dark:text-indigo-400" size={32} />
            Language Lab
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Master a new language with AI-powered coaching</p>
        </div>
        
        <div className="flex items-center gap-3">
            <select 
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
                <option value="Japanese">Japanese</option>
                <option value="Mandarin">Mandarin</option>
            </select>

            <button 
                onClick={() => onStartVoice?.({ targetLanguage: selectedLanguage })}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
                <Mic size={20} />
                <span>Voice Mode</span>
            </button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Flame size={24} />
            </div>
            <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">12</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Day Streak</div>
            </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Target size={24} />
            </div>
            <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">85%</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Accuracy</div>
            </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Trophy size={24} />
            </div>
            <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">B1</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Current Level</div>
            </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
                onClick={() => setActiveTab('daily')}
                className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${
                    activeTab === 'daily' 
                        ? 'text-indigo-600 dark:text-indigo-400' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
                <BookOpen size={18} />
                Daily Phrases
                {activeTab === 'daily' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
                )}
            </button>
            <button
                onClick={() => setActiveTab('coach')}
                className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${
                    activeTab === 'coach' 
                        ? 'text-indigo-600 dark:text-indigo-400' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
                <MessageSquare size={18} />
                Conversational Coach
                {activeTab === 'coach' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
                )}
            </button>
            <button
                onClick={() => setActiveTab('writing')}
                className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${
                    activeTab === 'writing' 
                        ? 'text-indigo-600 dark:text-indigo-400' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
                <PenTool size={18} />
                Writing Practice
                {activeTab === 'writing' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
                )}
            </button>
        </div>

        {/* Tab Content Placeholder */}
        <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400 dark:text-slate-500">
                {activeTab === 'daily' && <BookOpen size={32} />}
                {activeTab === 'coach' && <MessageSquare size={32} />}
                {activeTab === 'writing' && <PenTool size={32} />}
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                {activeTab === 'daily' && 'Daily Phrases'}
                {activeTab === 'coach' && 'Conversational Coach'}
                {activeTab === 'writing' && 'Writing Practice'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md">
                {activeTab === 'daily' && 'Learn essential phrases for everyday situations. Coming soon!'}
                {activeTab === 'coach' && 'Practice your speaking skills with our AI tutor. Coming soon!'}
                {activeTab === 'writing' && 'Improve your grammar and vocabulary through writing exercises. Coming soon!'}
            </p>
        </div>
      </div>
    </div>
  );
}
