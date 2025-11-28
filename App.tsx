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
import { Onboarding } from './components/Onboarding';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProfileProvider, useProfile } from './contexts/ProfileContext';
import { ActivityProvider } from './contexts/ActivityContext';
import { FileAttachment, VoiceSessionConfig } from './types';
import { Profile } from './components/Profile';
import { SocialFeed } from './components/SocialFeed';
import { ChatSystem } from './components/ChatSystem';
import { LanguageLab } from './components/LanguageLab';
import { useSecurity } from './hooks/useSecurity';
import { ErrorBoundary, SocialErrorBoundary, StudyErrorBoundary, ChatErrorBoundary } from './components/ErrorBoundary';
import { OnboardingProvider } from './contexts/OnboardingContext';
import { TutorialManager } from './components/ui/TutorialManager';

// Private Route Wrapper
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const location = useLocation();

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (!profile?.hasCompletedOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" />;
  }

  return <>{children}</>;
}

function AppContent() {
  useSecurity();
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceSessionConfig, setVoiceSessionConfig] = useState<VoiceSessionConfig | undefined>(undefined);
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

  const handleStartVoice = (config?: VoiceSessionConfig) => {
    setVoiceSessionConfig(config);
    setIsVoiceMode(true);
  };

  const handleCloseVoice = () => {
    setIsVoiceMode(false);
    setVoiceSessionConfig(undefined);
  };

  return (
    <>
      <TutorialManager />
      
      {isVoiceMode && (
        <div className="fixed inset-0 z-[60]">
          <ChatErrorBoundary>
            <LiveVoiceTutor 
              onClose={handleCloseVoice} 
              attachments={attachments} 
              targetLanguage={voiceSessionConfig?.targetLanguage}
            />
          </ChatErrorBoundary>
        </div>
      )}

      <Routes>
        <Route path="/" element={<LandingPage theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/onboarding" element={
          <PrivateRoute>
            <Onboarding />
          </PrivateRoute>
        } />

        <Route path="/" element={
          <PrivateRoute>
            <Layout theme={theme} toggleTheme={toggleTheme} onStartVoice={handleStartVoice} />
          </PrivateRoute>
        }>
          <Route path="dashboard" element={
            <Dashboard
              attachments={attachments}
              setAttachments={setAttachments}
            />
          } />
          <Route path="tutor" element={
            <ChatErrorBoundary>
              <ChatTutor
                attachments={attachments}
                setAttachments={setAttachments}
                onStartVoice={handleStartVoice}
              />
            </ChatErrorBoundary>
          } />
          <Route path="language" element={
            <ChatErrorBoundary>
              <LanguageLab onStartVoice={handleStartVoice} />
            </ChatErrorBoundary>
          } />
          <Route path="tools" element={
            <StudyErrorBoundary>
              <StudyTools
                attachments={attachments}
                setAttachments={setAttachments}
                onStartVoice={handleStartVoice}
              />
            </StudyErrorBoundary>
          } />
          <Route path="profile" element={<Profile />} />
          <Route path="community" element={
            <SocialErrorBoundary>
              <SocialFeed />
            </SocialErrorBoundary>
          } />
          <Route path="chat" element={
            <ChatErrorBoundary>
              <ChatSystem />
            </ChatErrorBoundary>
          } />
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
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ProfileProvider>
            <ActivityProvider>
              <OnboardingProvider>
                <AppContent />
              </OnboardingProvider>
            </ActivityProvider>
          </ProfileProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
