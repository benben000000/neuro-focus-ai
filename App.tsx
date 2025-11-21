import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { ChatTutor } from './components/ChatTutor';
import { StudyTools } from './components/StudyTools';
import { LandingPage } from './components/LandingPage';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Layout } from './components/Layout';
import { LiveVoiceTutor } from './components/LiveVoiceTutor';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PomodoroProvider } from './contexts/PomodoroContext';
import { FileAttachment, StudySessionStats } from './types';
import { logSession } from './services/learning';
import { Profile } from './components/Profile';
import { SocialFeed } from './components/SocialFeed';
import { ChatSystem } from './components/ChatSystem';
import { OnboardingFlow } from './components/OnboardingFlow';
import { getUserProfile } from './services/social';

// Private Route Wrapper
function PrivateRoute({ children, requireOnboarding = true }: { children: React.ReactNode; requireOnboarding?: boolean }) {
  const { currentUser, loading } = useAuth();
  const [profileLoading, setProfileLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (currentUser && requireOnboarding && location.pathname !== '/onboarding') {
        try {
          const profile = await getUserProfile(currentUser.uid);
          if (profile) {
            setHasCompletedOnboarding(profile.hasCompletedOnboarding);
          }
        } catch (error) {
          console.error('Error checking onboarding status:', error);
        } finally {
          setProfileLoading(false);
        }
      } else {
        setProfileLoading(false);
      }
    };

    if (currentUser) {
      checkOnboardingStatus();
    } else {
      setProfileLoading(false);
    }
  }, [currentUser, requireOnboarding, location.pathname]);

  if (loading || profileLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;

  if (!currentUser) return <Navigate to="/login" />;

  // Redirect to onboarding if not completed and onboarding is required
  if (requireOnboarding && !hasCompletedOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" />;
  }

  // If on onboarding page and already completed, redirect to dashboard
  if (location.pathname === '/onboarding' && hasCompletedOnboarding) {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
}

function AppContent() {
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);

  // --- THEME STATE ---
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('neurofocus-theme') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('neurofocus-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // --- SESSION STATE (Legacy/Dashboard prop) ---
  // We might want to move this to a context later, but for now keep it here or in Dashboard
  // Actually, Dashboard expects these props. Let's keep them in Dashboard or lift them here if shared.
  // Dashboard handles its own session logic mostly, but App passed it down.
  // Let's check Dashboard props. It takes isSessionActive, etc.
  // For now, let's manage session state here to pass to Dashboard, 
  // BUT Dashboard is now a Route. We can pass props to element.

  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [sessionSubject, setSessionSubject] = useState('General Knowledge');
  const sessionStartTimeRef = React.useRef<number>(0);
  const timerIntervalRef = React.useRef<number | null>(null);

  useEffect(() => {
    if (isSessionActive) {
      timerIntervalRef.current = window.setInterval(() => {
        setSessionSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [isSessionActive]);

  const startSession = (subject: string) => {
    setSessionSubject(subject);
    setSessionSeconds(0);
    sessionStartTimeRef.current = Date.now();
    setIsSessionActive(true);
  };

  const endSession = () => {
    setIsSessionActive(false);
    const endTime = Date.now();
    const duration = sessionSeconds;

    if (duration > 10) {
      const newSession: StudySessionStats = {
        id: Date.now().toString(),
        subject: sessionSubject,
        startTime: sessionStartTimeRef.current,
        endTime,
        durationSeconds: duration,
        toolsUsed: ['Timer'],
        xpEarned: Math.floor(duration / 60) * 10,
        mastery: 0,
        lastStudied: new Date().toISOString(),
        hoursSpent: duration / 3600
      };
      logSession(newSession);
    }
    setSessionSeconds(0);
  };

  return (
    <>
      {isVoiceMode && (
        <div className="fixed inset-0 z-[60]">
          <LiveVoiceTutor onClose={() => setIsVoiceMode(false)} attachments={attachments} />
        </div>
      )}

      <Routes>
        <Route path="/" element={<LandingPage theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Onboarding route - doesn't require onboarding completion */}
        <Route path="/onboarding" element={
          <PrivateRoute requireOnboarding={false}>
            <OnboardingFlow />
          </PrivateRoute>
        } />

        {/* Protected routes that require onboarding completion */}
        <Route path="/" element={
          <PrivateRoute>
            <Layout theme={theme} toggleTheme={toggleTheme} onStartVoice={() => setIsVoiceMode(true)} />
          </PrivateRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={
            <Dashboard
              attachments={attachments}
              setAttachments={setAttachments}
              isSessionActive={isSessionActive}
              sessionSeconds={sessionSeconds}
              sessionSubject={sessionSubject}
              onStartSession={startSession}
              onEndSession={endSession}
            />
          } />
          <Route path="tutor" element={
            <ChatTutor
              attachments={attachments}
              setAttachments={setAttachments}
              onStartVoice={() => setIsVoiceMode(true)}
            />
          } />
          <Route path="tools" element={
            <StudyTools
              attachments={attachments}
              setAttachments={setAttachments}
              onStartVoice={() => setIsVoiceMode(true)}
            />
          } />
          <Route path="profile" element={<Profile />} />
          <Route path="community" element={<SocialFeed />} />
          <Route path="chat" element={<ChatSystem />} />
          <Route path="settings" element={
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
              <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">Settings</h2>
              <p className="text-slate-500">Settings moved to profile.</p>
            </div>
          } />
        </Route>
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PomodoroProvider>
          <AppContent />
        </PomodoroProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
