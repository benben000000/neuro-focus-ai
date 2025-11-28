import React from 'react';
import { X, Sparkles, GraduationCap, Users, MessageCircle, Trophy } from 'lucide-react';

interface WelcomeModalProps {
    onStartTour: () => void;
    onSkip: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ onStartTour, onSkip }) => {
    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            role="dialog"
            aria-labelledby="welcome-modal-title"
            aria-describedby="welcome-modal-description"
        >
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full p-8 md:p-12 animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800">
                <button
                    onClick={onSkip}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    aria-label="Close welcome modal"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                        <Sparkles size={32} className="text-white" />
                    </div>

                    <h1 
                        id="welcome-modal-title"
                        className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4"
                    >
                        Welcome to NeuroFocus! 🎓
                    </h1>

                    <p 
                        id="welcome-modal-description"
                        className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-lg"
                    >
                        Your AI-powered learning companion is ready to help you master any subject with personalized tools and a supportive community.
                    </p>

                    {/* Feature Highlights */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 w-full">
                        {[
                            { icon: GraduationCap, label: 'AI Tutor', color: 'text-indigo-500 bg-indigo-500/10' },
                            { icon: Trophy, label: 'Study Tools', color: 'text-emerald-500 bg-emerald-500/10' },
                            { icon: Users, label: 'Community', color: 'text-blue-500 bg-blue-500/10' },
                            { icon: MessageCircle, label: 'Messaging', color: 'text-purple-500 bg-purple-500/10' }
                        ].map((feature, i) => (
                            <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                <div className={`p-3 rounded-xl ${feature.color}`}>
                                    <feature.icon size={24} />
                                </div>
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{feature.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                        <button
                            onClick={onStartTour}
                            className="flex-1 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:shadow-lg hover:scale-105 transition-all active:scale-95"
                        >
                            Start Tour
                        </button>
                        <button
                            onClick={onSkip}
                            className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Skip for Now
                        </button>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-6">
                        You can replay this tour anytime from your profile settings
                    </p>
                </div>
            </div>
        </div>
    );
};
