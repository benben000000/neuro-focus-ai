import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { updateUserProfile } from '../services/social';
import { BrainCircuit, User, FileText, Image as ImageIcon, Calendar, GraduationCap, ArrowRight, ArrowLeft, Loader2, X } from 'lucide-react';

export function Onboarding() {
    const { currentUser } = useAuth();
    const { refreshProfile } = useProfile();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [formData, setFormData] = useState({
        displayName: currentUser?.displayName || '',
        bio: '',
        photoURL: '',
        birthday: '',
        university: ''
    });

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size should be less than 5MB');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setFormData(prev => ({ ...prev, photoURL: base64String }));
            };
            reader.readAsDataURL(file);
        }
    };

    const clearPhoto = () => {
        setFormData(prev => ({ ...prev, photoURL: '' }));
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleNext = () => {
        if (step < 5) {
            setStep(step + 1);
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    const handleSkip = async () => {
        if (!currentUser) return;

        setLoading(true);
        try {
            await updateUserProfile(currentUser.uid, {
                hasCompletedOnboarding: true
            });
            
            await refreshProfile();
            navigate('/dashboard');
        } catch (error) {
            console.error('Error skipping onboarding:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async () => {
        if (!currentUser) return;

        setLoading(true);
        try {
            const profileUpdate: any = {
                hasCompletedOnboarding: true
            };

            if (formData.displayName.trim()) {
                profileUpdate.displayName = formData.displayName.trim();
            }
            if (formData.bio.trim()) {
                profileUpdate.bio = formData.bio.trim();
            }
            if (formData.photoURL) {
                profileUpdate.photoURL = formData.photoURL;
            }
            if (formData.birthday) {
                profileUpdate.birthday = formData.birthday;
            }
            if (formData.university.trim()) {
                profileUpdate.university = formData.university.trim();
            }

            await updateUserProfile(currentUser.uid, profileUpdate);
            
            await refreshProfile();
            navigate('/dashboard');
        } catch (error) {
            console.error('Error completing onboarding:', error);
        } finally {
            setLoading(false);
        }
    };

    const canProceedFromStep1 = () => {
        return formData.displayName.trim().length > 0;
    };

    const totalSteps = 5;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl w-full max-w-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none mb-4">
                        <BrainCircuit size={36} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Welcome to NeuroFocus</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Let's set up your profile</p>
                </div>

                <div className="mb-8">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        {[1, 2, 3, 4, 5].map(num => (
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
                    <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                        Step {step} of {totalSteps}
                    </p>
                </div>

                {step === 1 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
                            <User size={24} />
                            <h2 className="text-xl font-bold">What should we call you?</h2>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Display Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.displayName}
                                onChange={(e) => handleInputChange('displayName', e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white"
                                placeholder="Your name"
                                autoFocus
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                This is how others will see you in the community
                            </p>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
                            <FileText size={24} />
                            <h2 className="text-xl font-bold">Tell us about yourself</h2>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Bio (Optional)
                            </label>
                            <textarea
                                value={formData.bio}
                                onChange={(e) => handleInputChange('bio', e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-slate-900 dark:text-white"
                                placeholder="I'm a student passionate about learning..."
                                rows={4}
                                maxLength={200}
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                {formData.bio.length}/200 characters
                            </p>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
                            <ImageIcon size={24} />
                            <h2 className="text-xl font-bold">Add a profile picture</h2>
                        </div>
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-5xl font-bold text-slate-400 border-4 border-white dark:border-slate-900 shadow-lg overflow-hidden">
                                    {formData.photoURL ? (
                                        <img 
                                            src={formData.photoURL} 
                                            alt="Profile preview" 
                                            className="w-full h-full rounded-full object-cover" 
                                        />
                                    ) : (
                                        formData.displayName?.charAt(0).toUpperCase() || 'U'
                                    )}
                                </div>
                                {formData.photoURL && (
                                    <button
                                        onClick={clearPhoto}
                                        className="absolute top-0 right-0 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>

                            <div className="w-full">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="profile-picture-upload"
                                />
                                <label
                                    htmlFor="profile-picture-upload"
                                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <ImageIcon size={20} className="text-slate-500" />
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                        {formData.photoURL ? 'Change Picture' : 'Upload Picture'}
                                    </span>
                                </label>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                                    JPG, PNG or GIF (max 5MB)
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
                            <Calendar size={24} />
                            <h2 className="text-xl font-bold">When's your birthday?</h2>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Birthday (Optional)
                            </label>
                            <input
                                type="date"
                                value={formData.birthday}
                                onChange={(e) => handleInputChange('birthday', e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                We'll use this to celebrate your special day!
                            </p>
                        </div>
                    </div>
                )}

                {step === 5 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
                            <GraduationCap size={24} />
                            <h2 className="text-xl font-bold">Where do you study?</h2>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                University (Optional)
                            </label>
                            <input
                                type="text"
                                value={formData.university}
                                onChange={(e) => handleInputChange('university', e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white"
                                placeholder="e.g., Stanford University, MIT, Oxford..."
                                maxLength={100}
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                Connect with students from your institution
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex gap-4 mt-8">
                    {step > 1 && (
                        <button
                            onClick={handleBack}
                            className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-all hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-2"
                        >
                            <ArrowLeft size={18} />
                            Back
                        </button>
                    )}
                    
                    {step > 1 && (
                        <button
                            onClick={handleSkip}
                            disabled={loading}
                            className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-all hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Skip
                        </button>
                    )}
                    
                    <button
                        onClick={handleNext}
                        disabled={(step === 1 && !canProceedFromStep1()) || loading}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                {step === 5 ? 'Complete Setup' : 'Continue'}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </div>

                {step === 1 && (
                    <div className="mt-6 text-center">
                        <button
                            onClick={handleSkip}
                            disabled={loading}
                            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors underline disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Skip setup for now
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
