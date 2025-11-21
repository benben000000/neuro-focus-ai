import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { BookOpen, Brain, Trophy, Activity, Play, Square, Timer, ChevronRight } from 'lucide-react';
import { FileAttachment, UserProgress, StudySessionStats } from '../types';
import { identifyDocumentSubject } from '../services/gemini';
import { getProgress, logSession, formatTime } from '../services/learning';
import { FileUploader } from './FileUploader';

interface DashboardProps {
  attachments: FileAttachment[];
  setAttachments: React.Dispatch<React.SetStateAction<FileAttachment[]>>;
}

export const Dashboard: React.FC<DashboardProps> = ({ attachments, setAttachments }) => {
  const [progress, setProgress] = useState<UserProgress>(getProgress());
  const [currentSubject, setCurrentSubject] = useState<string>('General Knowledge');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [complexity, setComplexity] = useState(0);

  // Session Timer State
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [sessionSubject, setSessionSubject] = useState('General Knowledge');
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    setProgress(getProgress());
  }, []);

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

  useEffect(() => {
    if (isSessionActive) {
      timerRef.current = window.setInterval(() => {
        setSessionSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isSessionActive]);

  const handleStartSession = () => {
    startTimeRef.current = Date.now();
    setSessionSubject(currentSubject);
    setSessionSeconds(0);
    setIsSessionActive(true);
  };

  const handleEndSession = () => {
    setIsSessionActive(false);
    const endTime = Date.now();
    const duration = sessionSeconds;

    if (duration > 10) {
      const newSession: StudySessionStats = {
        id: Date.now().toString(),
        subject: sessionSubject,
        startTime: startTimeRef.current,
        endTime,
        durationSeconds: duration,
        toolsUsed: ['Timer'],
        xpEarned: Math.floor(duration / 60) * 10,
        mastery: 0,
        lastStudied: new Date().toISOString(),
        hoursSpent: duration / 3600
      };
      const updatedProgress = logSession(newSession);
      setProgress(updatedProgress);
    }
    setSessionSeconds(0);
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

      {/* Live Activity / Session Timer */}
      <div className="bg-slate-900 dark:bg-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isSessionActive ? 'bg-indigo-500 animate-pulse' : 'bg-slate-800 border border-slate-700'}`}>
              <Timer size={24} className={isSessionActive ? 'text-white' : 'text-slate-400'} />
            </div>
            <div>
              <h2 className="font-bold text-lg">{isSessionActive ? 'Focus Session' : 'Start Focusing'}</h2>
              <p className="text-slate-400 text-sm font-mono">
                {isSessionActive ? formatTime(sessionSeconds) : 'Ready to learn?'}
              </p>
            </div>
          </div>

          <button
            onClick={isSessionActive ? handleEndSession : handleStartSession}
            className={`px-6 py-2 rounded-xl font-bold transition-all ${isSessionActive
                ? 'bg-rose-500 hover:bg-rose-600 text-white'
                : 'bg-white text-slate-900 hover:bg-slate-100'
              }`}
          >
            {isSessionActive ? 'End' : 'Start'}
          </button>
        </div>
      </div>

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
