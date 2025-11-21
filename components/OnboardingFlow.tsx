import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getUserProfile, updateUserProfile, UserProfile } from '../services/social';
import { User, Calendar, GraduationCap, Upload, Check, ArrowRight, ArrowLeft, Camera, Sparkles } from 'lucide-react';

interface OnboardingData {
    displayName: string;
    bio: string;
    photoURL: string;
    birthday: string;
    university: string;
}

export function OnboardingFlow() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [profile, setProfile] = useState<UserProfile | null>(null);
    
    const [formData, setFormData] = useState<OnboardingData>({
        displayName: '',
        bio: '',
        photoURL: '',
        birthday: '',
        university: ''
    });

    const totalSteps = 5;

    useEffect(() => {
        if (currentUser) {
            loadProfile();
        }
    }, [currentUser]);

    const loadProfile = async () => {
        if (!currentUser) return;
        
        try {
            const data = await getUserProfile(currentUser.uid);
            if (data) {
                setProfile(data);
                setFormData({
                    displayName: data.displayName || '',
                    bio: data.bio || '',
                    photoURL: data.photoURL || '',
                    birthday: data.birthday || '',
                    university: data.university || ''
                });

                // If already completed onboarding, redirect to dashboard
                if (data.hasCompletedOnboarding) {
                    navigate('/dashboard');
                }
            }
        } catch (err) {
            setError('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const updateStep = async (step: number) => {
        if (!currentUser) return;
        
        setSaving(true);
        setError('');
        
        try {
            await updateUserProfile(currentUser.uid, formData);
            setCurrentStep(step);
        } catch (err) {
            setError('Failed to save progress');
        } finally {
            setSaving(false);
        }
    };

    const handleNext = () => {
        if (currentStep < totalSteps) {
            updateStep(currentStep + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            updateStep(currentStep - 1);
        }
    };

    const handleComplete = async () => {
        if (!currentUser) return;
        
        setSaving(true);
        setError('');
        
        try {
            await updateUserProfile(currentUser.uid, {
                ...formData,
                hasCompletedOnboarding: true
            });
            
            // Show success and redirect
            setTimeout(() => {
                navigate('/dashboard');
            }, 1500);
        } catch (err) {
            setError('Failed to complete onboarding');
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, photoURL: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const validateStep = () => {
        switch (currentStep) {
            case 1:
                return formData.displayName.trim().length >= 2;
            case 2:
                return formData.bio.trim().length >= 10;
            case 3:
                return true; // Photo is optional
            case 4:
                return formData.birthday;
            case 5:
                return formData.university.trim().length >= 2;
            default:
                return false;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-center w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full mb-4">
                            <User className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white">What's your name?</h2>
                        <p className="text-center text-slate-600 dark:text-slate-400">This is how other students will see you</p>
                        <input
                            type="text"
                            value={formData.displayName}
                            onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                            placeholder="Enter your full name"
                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-800 dark:text-white"
                            maxLength={50}
                        />
                        <p className="text-sm text-slate-500 text-center">{formData.displayName.length}/50 characters</p>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full mb-4">
                            <Sparkles className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white">Tell us about yourself</h2>
                        <p className="text-center text-slate-600 dark:text-slate-400">Share a bit about your learning journey</p>
                        <textarea
                            value={formData.bio}
                            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                            placeholder="I'm a passionate learner interested in..."
                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-800 dark:text-white resize-none"
                            rows={4}
                            maxLength={200}
                        />
                        <p className="text-sm text-slate-500 text-center">{formData.bio.length}/200 characters</p>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-4">
                            <Camera className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white">Add a photo</h2>
                        <p className="text-center text-slate-600 dark:text-slate-400">Help others recognize you (optional)</p>
                        
                        <div className="flex flex-col items-center space-y-4">
                            {formData.photoURL ? (
                                <div className="relative">
                                    <img
                                        src={formData.photoURL}
                                        alt="Profile preview"
                                        className="w-32 h-32 rounded-full object-cover border-4 border-slate-200 dark:border-slate-700"
                                    />
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, photoURL: '' }))}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                    >
                                        <span className="sr-only">Remove photo</span>
                                        ×
                                    </button>
                                </div>
                            ) : (
                                <div className="w-32 h-32 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                                    <User className="w-16 h-16 text-slate-400 dark:text-slate-500" />
                                </div>
                            )}
                            
                            <label className="cursor-pointer bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                                {formData.photoURL ? 'Change Photo' : 'Upload Photo'}
                            </label>
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
                            <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white">When's your birthday?</h2>
                        <p className="text-center text-slate-600 dark:text-slate-400">We'll celebrate your learning milestones!</p>
                        <input
                            type="date"
                            value={formData.birthday}
                            onChange={(e) => setFormData(prev => ({ ...prev, birthday: e.target.value }))}
                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-800 dark:text-white"
                            max={new Date().toISOString().split('T')[0]}
                        />
                    </div>
                );

            case 5:
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-center w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full mb-4">
                            <GraduationCap className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white">Where do you study?</h2>
                        <p className="text-center text-slate-600 dark:text-slate-400">Connect with fellow students from your university</p>
                        <input
                            type="text"
                            value={formData.university}
                            onChange={(e) => setFormData(prev => ({ ...prev, university: e.target.value }))}
                            placeholder="Enter your university name"
                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-800 dark:text-white"
                            maxLength={100}
                        />
                        <p className="text-sm text-slate-500 text-center">{formData.university.length}/100 characters</p>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            Step {currentStep} of {totalSteps}
                        </span>
                        <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                            {Math.round((currentStep / totalSteps) * 100)}%
                        </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Main Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    {renderStep()}

                    {/* Navigation */}
                    <div className="flex justify-between mt-8">
                        <button
                            onClick={handlePrevious}
                            disabled={currentStep === 1 || saving}
                            className="flex items-center px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Previous
                        </button>

                        {currentStep === totalSteps ? (
                            <button
                                onClick={handleComplete}
                                disabled={!validateStep() || saving}
                                className="flex items-center px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Completing...
                                    </>
                                ) : (
                                    <>
                                        Complete
                                        <Check className="w-4 h-4 ml-2" />
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={handleNext}
                                disabled={!validateStep() || saving}
                                className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        Next
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}