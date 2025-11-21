import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, updateUserProfile, UserProfile } from '../services/social';
import { Edit2, Save, Award, Clock, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';

export function Profile() {
    const { currentUser } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editBio, setEditBio] = useState('');
    const [editPhotoURL, setEditPhotoURL] = useState('');
    const [loading, setLoading] = useState(true);
    const [saveLoading, setSaveLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearSuccessTimeout = () => {
        if (successTimeoutRef.current) {
            clearTimeout(successTimeoutRef.current);
            successTimeoutRef.current = null;
        }
    };

    const clearErrorTimeout = () => {
        if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current);
            errorTimeoutRef.current = null;
        }
    };

    const resetBanners = () => {
        setError('');
        setSuccess('');
        clearSuccessTimeout();
        clearErrorTimeout();
    };

    const showSuccessMessage = (message: string) => {
        setSuccess(message);
        clearSuccessTimeout();
        successTimeoutRef.current = setTimeout(() => setSuccess(''), 3000);
    };

    const showErrorMessage = (message: string) => {
        setError(message);
        clearErrorTimeout();
        errorTimeoutRef.current = setTimeout(() => setError(''), 5000);
    };

    const hydrateEditFields = (profileData: UserProfile) => {
        setEditName(profileData.displayName || '');
        setEditBio(profileData.bio || '');
        setEditPhotoURL(profileData.photoURL || '');
    };

    const loadProfile = async () => {
        if (!currentUser) return;
        try {
            const data = await getUserProfile(currentUser.uid);
            if (data) {
                setProfile(data);
                hydrateEditFields(data);
            }
        } catch (err) {
            console.error('Error loading profile:', err);
            showErrorMessage('Unable to load your profile. Please refresh.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!currentUser) {
            setProfile(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        loadProfile();
    }, [currentUser]);

    useEffect(() => {
        return () => {
            clearSuccessTimeout();
            clearErrorTimeout();
        };
    }, []);

    const handleSave = async () => {
        if (!currentUser || !profile) return;

        resetBanners();

        const trimmedName = editName.trim();
        if (!trimmedName) {
            showErrorMessage('Display name cannot be empty.');
            return;
        }

        const updatedProfile = {
            displayName: trimmedName,
            bio: editBio,
            photoURL: editPhotoURL || ''
        };

        setSaveLoading(true);

        try {
            await updateUserProfile(currentUser.uid, updatedProfile);
            setProfile(prev => (prev ? { ...prev, ...updatedProfile } : prev));
            setEditName(updatedProfile.displayName);
            setEditBio(updatedProfile.bio || '');
            setEditPhotoURL(updatedProfile.photoURL || '');
            setIsEditing(false);
            showSuccessMessage('Profile updated successfully!');
        } catch (err) {
            console.error('Error updating profile:', err);
            showErrorMessage('Failed to update profile. Please try again.');
        } finally {
            setSaveLoading(false);
        }
    };

    const handleEditClick = () => {
        if (!profile) return;
        hydrateEditFields(profile);
        resetBanners();
        setIsEditing(true);
    };

    const isSaveDisabled = saveLoading || (isEditing && !editName.trim());

    if (loading) return <div className="p-8 text-center">Loading profile...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Error and Success Messages */}
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-center gap-3">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            {success && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-sm rounded-xl flex items-center gap-3">
                    <CheckCircle size={18} />
                    {success}
                </div>
            )}

            {/* Header Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-10"></div>

                <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-4xl font-bold text-slate-400 border-4 border-white dark:border-slate-900 shadow-lg overflow-hidden">
                            {(isEditing ? editPhotoURL : profile?.photoURL) ? (
                                <img src={isEditing ? editPhotoURL : profile?.photoURL} alt={profile?.displayName} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                profile?.displayName?.charAt(0).toUpperCase() || 'U'
                            )}
                        </div>
                        {isEditing && (
                            <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                                <span className="text-xs font-bold">Change</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                                const base64String = reader.result as string;
                                                setEditPhotoURL(base64String);
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                />
                            </label>
                        )}
                    </div>

                    <div className="flex-1">
                        {isEditing ? (
                            <div className="space-y-3 max-w-md">
                                <div className="space-y-1">
                                    <input
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full text-2xl font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1"
                                        placeholder="Display Name"
                                    />
                                    {!editName.trim() && (
                                        <p className="text-sm text-red-500 dark:text-red-400">Display name is required.</p>
                                    )}
                                </div>
                                <textarea
                                    value={editBio}
                                    onChange={(e) => setEditBio(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 h-20 resize-none"
                                    placeholder="Tell us about yourself..."
                                />
                            </div>
                        ) : (
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{profile?.displayName}</h1>
                                <p className="text-slate-500 dark:text-slate-400 max-w-xl">{profile?.bio || "No bio yet."}</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => (isEditing ? handleSave() : handleEditClick())}
                        disabled={isSaveDisabled}
                        className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors ${isEditing
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                    >
                        {isEditing ? (
                            saveLoading ? (
                                <>Saving...</>
                            ) : (
                                <><Save size={18} /> Save Changes</>
                            )
                        ) : (
                            <><Edit2 size={18} /> Edit Profile</>
                        )}
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                    <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
                        <Award size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Level {profile?.level || 1}</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{profile?.xp || 0} XP</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Study Hours</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">0.0h</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Sessions</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">0</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
