
import { UserProgress, StudySessionStats } from '../types';

const STORAGE_KEY = 'neurofocus_progress_v1';

const DEFAULT_PROGRESS: UserProgress = {
  totalSessions: 0,
  streakDays: 0,
  retentionRate: 0,
  lastStudyDate: '',
  totalStudySeconds: 0,
  averageRetentionRate: 0,
  sessions: []
};

export const getProgress = (): UserProgress => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_PROGRESS;
  } catch (e) {
    return DEFAULT_PROGRESS;
  }
};

export const saveProgress = (progress: UserProgress) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
};

const updateStreak = (currentStreak: number, lastDate: string): number => {
  if (!lastDate) return 1;
  const last = new Date(lastDate);
  const today = new Date();
  last.setHours(0,0,0,0);
  today.setHours(0,0,0,0);
  const diffTime = Math.abs(today.getTime() - last.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return currentStreak;
  if (diffDays === 1) return currentStreak + 1;
  return 1;
};

const calculateRetention = (sessions: StudySessionStats[]): number => {
    if (sessions.length === 0) return 0;
    const avgDuration = sessions.reduce((acc, s) => acc + s.durationSeconds, 0) / sessions.length;
    const efficiency = Math.min(100, (avgDuration / 1800) * 100);
    return Math.min(98, Math.max(65, Math.round(efficiency)));
};

export const logSession = (session: StudySessionStats) => {
    const progress = getProgress();
    progress.totalSessions += 1;
    progress.totalStudySeconds += session.durationSeconds;
    progress.streakDays = updateStreak(progress.streakDays, progress.lastStudyDate);
    progress.lastStudyDate = new Date().toISOString();
    progress.sessions = [session, ...progress.sessions].slice(0, 50);
    progress.averageRetentionRate = calculateRetention(progress.sessions);
    saveProgress(progress);
    return progress;
};

export const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};
