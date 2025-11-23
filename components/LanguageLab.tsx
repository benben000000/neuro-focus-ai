import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    subscribeToLanguageProgress,
    subscribeToLanguageSettings,
    setLanguage as setLanguageService,
    markPhraseLearned,
    saveWritingSample,
    saveSpeakingSession,
    LanguageProgress,
    updateDailyPhrases,
    DailyPhraseSet
} from '../services/languageProgress';
import { LiveVoiceTutor } from './LiveVoiceTutor';
import { Button } from './ui/Button';
import { Mic, PenTool, BookOpen, CheckCircle2, ChevronRight, RefreshCw, Trophy, Languages, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { playSuccess, playClick } from '../services/sound';
import { FileAttachment } from '../types';

const LANGUAGES = [
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
];

export const LanguageLab: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [currentLanguage, setCurrentLanguage] = useState<string>('es');
    const [progress, setProgress] = useState<LanguageProgress | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Modes
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [voicePhrase, setVoicePhrase] = useState<string>('');
    
    // Writing
    const [writingText, setWritingText] = useState('');
    const [writingSubmitted, setWritingSubmitted] = useState(false);
    
    const { currentUser: user } = useAuth();

    useEffect(() => {
        if (!user) return;
        
        // Subscribe to settings to get last language
        const unsubSettings = subscribeToLanguageSettings(user.uid, (settings) => {
            if (settings && settings.currentLanguage) {
                setCurrentLanguage(settings.currentLanguage);
            }
        });
        
        return () => unsubSettings();
    }, [user]);

    useEffect(() => {
        if (!user || !currentLanguage) return;
        setLoading(true);
        const unsubProgress = subscribeToLanguageProgress(user.uid, currentLanguage, (data) => {
            setProgress(data);
            setLoading(false);
        });
        
        return () => unsubProgress();
    }, [user, currentLanguage]);

    const handleLanguageChange = (lang: string) => {
        setCurrentLanguage(lang);
        if (user) {
            setLanguageService(user.uid, lang);
        }
    };

    const generateDailyPhrases = async () => {
        if (!user) return;
        
        // Mock generation for now - in production this would call Gemini
        const phrases = [
            { text: "Hola, ¿cómo estás?", translation: "Hello, how are you?", status: 'new' },
            { text: "Me gustaría un café, por favor.", translation: "I would like a coffee, please.", status: 'new' },
            { text: "No entiendo.", translation: "I don't understand.", status: 'new' }
        ] as const;

        const mockSet: DailyPhraseSet = {
            date: new Date().toISOString().split('T')[0],
            phrases: phrases.map(p => ({ ...p, status: 'new' as const }))
        };
        
        await updateDailyPhrases(user.uid, currentLanguage, mockSet);
    };

    const handleMarkLearned = async (phrase: string) => {
        if (!user) return;
        await markPhraseLearned(user.uid, currentLanguage, phrase);
        playSuccess();
    };

    const handleVoiceFeedback = async (data: any) => {
        if (!user) return;
        // Expected data from tool call: { score, confidence, feedback }
        console.log("Voice Feedback:", data);
        if (data.score !== undefined) {
            await saveSpeakingSession(user.uid, currentLanguage, voicePhrase, data.score, data.confidence || 0);
        }
    };

    const submitWriting = async () => {
        if (!user || !writingText.trim()) return;
        
        await saveWritingSample(user.uid, currentLanguage, writingText, "Great job practicing!"); // Mock feedback
        setWritingSubmitted(true);
        playSuccess();
        setTimeout(() => {
            setWritingSubmitted(false);
            setWritingText('');
        }, 3000);
    };

    const today = new Date().toISOString().split('T')[0];
    const todaysPhrases = progress?.dailyPhrases?.find(p => p.date === today);

    if (loading && !progress) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>;
    }

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={onClose} icon={<ArrowLeft size={16} />}>Back</Button>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Languages className="text-indigo-500" /> Language Lab
                    </h1>
                </div>
                
                <div className="flex gap-2">
                    {LANGUAGES.map(l => (
                        <button
                            key={l.code}
                            onClick={() => handleLanguageChange(l.code)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${currentLanguage === l.code ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                        >
                            <span className="mr-1">{l.flag}</span> {l.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-6 max-w-6xl mx-auto w-full space-y-8">
                
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg"><BookOpen size={20} /></div>
                            <h3 className="font-bold text-slate-700 dark:text-slate-200">Vocabulary</h3>
                        </div>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white">{progress?.learnedWords?.length || 0}</p>
                        <p className="text-sm text-slate-500">Words learned</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg"><PenTool size={20} /></div>
                            <h3 className="font-bold text-slate-700 dark:text-slate-200">Writing</h3>
                        </div>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white">{progress?.writingSamples?.length || 0}</p>
                        <p className="text-sm text-slate-500">Samples submitted</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg"><Mic size={20} /></div>
                            <h3 className="font-bold text-slate-700 dark:text-slate-200">Speaking</h3>
                        </div>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white">{progress?.speakingSessions?.length || 0}</p>
                        <p className="text-sm text-slate-500">Sessions completed</p>
                    </div>
                </div>

                {/* Daily Phrases */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="text-yellow-500" /> Daily Phrases
                        </h2>
                        {!todaysPhrases && (
                            <Button onClick={generateDailyPhrases} size="sm" icon={<RefreshCw size={14} />}>Generate Today's Set</Button>
                        )}
                    </div>

                    {todaysPhrases ? (
                        <div className="grid grid-cols-1 gap-4">
                            {todaysPhrases.phrases.map((phrase, idx) => {
                                const isLearned = progress?.learnedWords?.includes(phrase.text);
                                return (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <div>
                                            <p className="text-lg font-medium text-slate-900 dark:text-white">{phrase.text}</p>
                                            <p className="text-slate-500 dark:text-slate-400">{phrase.translation}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button 
                                                size="sm" 
                                                variant="secondary"
                                                onClick={() => {
                                                    setVoicePhrase(phrase.text);
                                                    setIsVoiceActive(true);
                                                }}
                                                icon={<Mic size={14} />}
                                            >
                                                Practice
                                            </Button>
                                            <Button 
                                                size="sm"
                                                variant={isLearned ? "ghost" : "primary"}
                                                disabled={isLearned}
                                                onClick={() => handleMarkLearned(phrase.text)}
                                                icon={isLearned ? <CheckCircle2 size={14} /> : undefined}
                                            >
                                                {isLearned ? 'Learned' : 'Mark Learned'}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-slate-500">
                            <p>No phrases for today yet. Click generate to start.</p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Speaking Practice Panel */}
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-32 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                        <div className="relative z-10">
                            <h2 className="text-2xl font-bold mb-2">Speaking Practice</h2>
                            <p className="text-indigo-100 mb-8">Improve your pronunciation with real-time AI feedback.</p>
                            
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 mb-6">
                                <p className="font-mono text-sm opacity-70 mb-2">LATEST SESSION</p>
                                {progress?.speakingSessions && progress.speakingSessions.length > 0 ? (
                                    <div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-3xl font-bold">{progress.speakingSessions[progress.speakingSessions.length - 1].pronunciationScore}%</span>
                                            <span className="text-sm opacity-80 mb-1">Score</span>
                                        </div>
                                        <p className="text-sm truncate opacity-80 mt-1">"{progress.speakingSessions[progress.speakingSessions.length - 1].phrase}"</p>
                                    </div>
                                ) : (
                                    <p className="text-sm italic opacity-70">No sessions yet</p>
                                )}
                            </div>

                            <Button 
                                className="w-full bg-white text-indigo-600 hover:bg-indigo-50 border-none" 
                                onClick={() => {
                                    setVoicePhrase("General conversation");
                                    setIsVoiceActive(true);
                                }}
                                icon={<Mic />}
                            >
                                Start Session
                            </Button>
                        </div>
                    </div>

                    {/* Writing Practice Module */}
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                            <PenTool className="text-blue-500" /> Writing Lab
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Write a journal entry or practice sentences.</p>
                        
                        <textarea 
                            className="flex-1 w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-4 resize-none focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                            placeholder={`Write something in ${LANGUAGES.find(l => l.code === currentLanguage)?.name}...`}
                            value={writingText}
                            onChange={(e) => setWritingText(e.target.value)}
                        />
                        
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400">{writingText.length} chars</span>
                            <Button 
                                onClick={submitWriting} 
                                disabled={!writingText.trim() || writingSubmitted}
                                className={writingSubmitted ? "bg-green-600 hover:bg-green-700" : ""}
                            >
                                {writingSubmitted ? "Saved!" : "Submit & Save"}
                            </Button>
                        </div>
                    </div>
                </div>

            </div>

            {isVoiceActive && (
                <LiveVoiceTutor 
                    onClose={() => setIsVoiceActive(false)} 
                    attachments={[]}
                    mode="pronunciation"
                    targetPhrase={voicePhrase}
                    systemInstructionOverride={`You are a language tutor for ${LANGUAGES.find(l => l.code === currentLanguage)?.name}. 
The user is practicing the phrase: "${voicePhrase}".
Listen to their pronunciation.
After they speak, you MUST use the 'provide_pronunciation_score' tool to give them a score out of 100 and feedback.
Be encouraging but precise about accent and intonation.`}
                    onFeedback={handleVoiceFeedback}
                />
            )}
        </div>
    );
};
