import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { BookOpen, Brain, Trophy, Activity, Timer, ChevronRight } from 'lucide-react';
import { FileAttachment, UserProgress } from '../types';
import { identifyDocumentSubject } from '../services/gemini';
import { getProgress } from '../services/learning';
import { FileUploader } from './FileUploader';
import { usePomodoro } from '../contexts/PomodoroContext';

interface DashboardProps {
  attachments: FileAttachment[];
  setAttachments: React.Dispatch<React.SetStateAction<FileAttachment[]>>;
}

export const Dashboard: React.FC<DashboardProps> = ({ attachments, setAttachments }) => {
  const [progress, setProgress] = useState<UserProgress>(getProgress());
  const [currentSubject, setCurrentSubject] = useState<string>('General Knowledge');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [complexity, setComplexity] = useState(0);

  const { 
      isActive, 
      timeLeft, 
      mode, 
      setSessionSubject, 
      formatTime, 
      toggleTimer,
      setWidgetVisible
  } = usePomodoro();

  useEffect(() => {
    // Refresh progress when session might have been logged or on mount
    // Since progress is local state initialized from getProgress(), we need to update it.
    // Ideally we would subscribe to changes or use a Context for progress too, but for now:
    const interval = setInterval(() => {
        const newProgress = getProgress();
        if (JSON.stringify(newProgress) !== JSON.stringify(progress)) {
            setProgress(newProgress);
        }
    }, 2000); // Poll for updates every 2s
    
    return () => clearInterval(interval);
  }, [progress]);

  useEffect(() => {
    const analyzeContext = async () => {
      if (attachments.length > 0) {
        setIsAnalyzing(true);
        const result = await identifyDocumentSubject(attachments);
        if (result) {
          setCurrentSubject(result.subject);
          setComplexity(result.complexity);
        }
        setIsAnalyzing(false);
      } else {
        setCurrentSubject('General Knowledge');
        setComplexity(0);
      }
    };

    analyzeContext();
  }, [attachments.length]);

  // Sync subject with Pomodoro context
  useEffect(() => {
      setSessionSubject(currentSubject);
  }, [currentSubject, setSessionSubject]);

  const getElapsedTime = () => {
      const totalDuration = mode === 'work' ? 25 * 60 : (mode === 'shortBreak' ? 5 * 60 : 15 * 60);
      return formatTime(totalDuration - timeLeft);
  };

  const activityData = progress.sessions.slice(0, 7).reverse().map((s, i) => ({
    name: `S${i + 1}`,
    duration: Math.round(s.durationSeconds / 60),
    subject: s.subject
  }));

  const displayActivityData = activityData.length > 0 ? activityData : [
    { name: 'M', duration: 0 }, { name: 'T', duration: 0 }, { name: 'W', duration: 0 }
  ];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* Header & Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isAnalyzing ? 'Analyzing...' : currentSubject}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {attachments.length > 0 ? `${attachments.length} sources active` : 'No active sources'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {attachments.length === 0 ? (
            <div className="w-full md:w-64">
              <FileUploader onFilesSelected={(files) => setAttachments(prev => [...prev, ...files])} compact />
            </div>
          ) : (
            <button
              onClick={() => setAttachments([])}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Clear Context
            </button>
          )}
        </div>
      </div>

      {/* Live Activity / Session Status Chip */}
      {isActive && (
          <div className="flex items-center justify-between bg-indigo-50 dark:bg-slate-800/50 border border-indigo-100 dark:border-slate-700 rounded-xl p-4 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {mode === 'work' ? 'Focus session running' : 'Break time'}
                  </span>
                  <span className="text-sm font-mono text-slate-500 dark:text-slate-400">
                      • {getElapsedTime()} elapsed
                  </span>
              </div>
              <div className="flex items-center gap-3">
                   <button 
                      onClick={() => setWidgetVisible(true)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                   >
                      Show Timer
                   </button>
              </div>
          </div>
      )}
      
      {!isActive && (
         <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full text-slate-500">
                    <Timer size={16} />
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Ready to focus?</span>
             </div>
             <button 
                onClick={() => {
                    setWidgetVisible(true);
                    toggleTimer();
                }}
                className="text-sm font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
             >
                Start Session
             </button>
         </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Complexity', value: complexity > 0 ? complexity : '-', icon: Activity, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
          { label: 'Retention', value: `${progress.averageRetentionRate}%`, icon: Brain, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Sessions', value: progress.totalSessions, icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Streak', value: progress.streakDays, icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <div className={`p-2 rounded-full mb-2 ${stat.bg} ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</span>
            <span className="text-xs text-slate-500 font-medium">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 dark:text-white">Activity</h3>
            <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center">
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayActivityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} />
                <Bar dataKey="duration" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 dark:text-white">Focus Trend</h3>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayActivityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} />
                <Line type="monotone" dataKey="duration" stroke="#10b981" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
