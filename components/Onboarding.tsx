import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { updateUserProfile } from '../services/social';
import { BrainCircuit, User, BookOpen, Target, ArrowRight, Loader2 } from 'lucide-react';

export function Onboarding() {
    const { currentUser } = useAuth();
    const { refreshProfile } = useProfile();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        displayName: currentUser?.displayName || '',
        bio: '',
        goals: '',
        subjects: ''
    });

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleNext = () => {
        if (step < 3) {
            setStep(step + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = async () => {
        if (!currentUser) return;

        setLoading(true);
        try {
            await updateUserProfile(currentUser.uid, {
                displayName: formData.displayName || currentUser.displayName || 'Student',
                bio: formData.bio || 'Ready to learn!',
                hasCompletedOnboarding: true
            });
            
            await refreshProfile();
            navigate('/dashboard');
        } catch (error) {
            console.error('Error completing onboarding:', error);
        } finally {
            setLoading(false);
        }
    };

    const canProceed = () => {
        if (step === 1) return formData.displayName.trim().length > 0;
        if (step === 2) return formData.bio.trim().length > 0;
        return true;
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl w-full max-w-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none mb-4">
                        <BrainCircuit size={36} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Welcome to NeuroFocus</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Let's personalize your learning experience</p>
                </div>

                <div className="flex items-center justify-center gap-2 mb-8">
                    {[1, 2, 3].map(num => (
                        <div
                            key={num}
                            className={`h-2 rounded-full transition-all ${
                                num === step 
                                    ? 'w-8 bg-indigo-600' 
                                    : num < step 
                                        ? 'w-2 bg-indigo-400' 
                                        : 'w-2 bg-slate-200 dark:bg-slate-700'
                            }`}
                        />
                    ))}
                </div>

                {step === 1 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
                            <User size={24} />
                            <h2 className="text-xl font-bold">Tell us about yourself</h2>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                What should we call you?
                            </label>
                            <input
                                type="text"
                                value={formData.displayName}
                                onChange={(e) => handleInputChange('displayName', e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="Your name"
                            />
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
                            <BookOpen size={24} />
                            <h2 className="text-xl font-bold">Share your story</h2>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Tell us a bit about yourself
                            </label>
                            <textarea
                                value={formData.bio}
                                onChange={(e) => handleInputChange('bio', e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                                placeholder="I'm a student passionate about learning..."
                                rows={4}
                            />
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
                            <Target size={24} />
                            <h2 className="text-xl font-bold">Set your goals</h2>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                What are your learning goals?
                            </label>
                            <textarea
                                value={formData.goals}
                                onChange={(e) => handleInputChange('goals', e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                                placeholder="Master calculus, prepare for exams, improve study habits..."
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                What subjects are you studying?
                            </label>
                            <input
                                type="text"
                                value={formData.subjects}
                                onChange={(e) => handleInputChange('subjects', e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="Math, Physics, Chemistry..."
                            />
                        </div>
                    </div>
                )}

                <div className="flex gap-4 mt-8">
                    {step > 1 && (
                        <button
                            onClick={() => setStep(step - 1)}
                            className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                            Back
                        </button>
                    )}
                    <button
                        onClick={handleNext}
                        disabled={!canProceed() || loading}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                {step === 3 ? 'Get Started' : 'Continue'}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
