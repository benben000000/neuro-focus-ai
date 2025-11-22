import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { updateUserProfile, SocialPost, subscribeToUserPosts, deletePost } from '../services/social';
import { getProgress } from '../services/learning';
import type { UserProgress } from '../types';
import { MediaCarousel } from './MediaCarousel';
import { CommentThread } from './CommentThread';
import { Edit2, Save, Award, Clock, BookOpen, AlertCircle, CheckCircle, X, ChevronLeft, ChevronRight, Heart, MessageCircle } from 'lucide-react';

export function Profile() {
    const { currentUser } = useAuth();
    const { profile, loading: profileLoading, refreshProfile } = useProfile();
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editBio, setEditBio] = useState('');
    const [editPhotoURL, setEditPhotoURL] = useState('');
    const [saveLoading, setSaveLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [userPosts, setUserPosts] = useState<SocialPost[]>([]);
    const [layoutMode, setLayoutMode] = useState<'grid' | 'masonry'>('grid');
    const [activeFilter, setActiveFilter] = useState<'all' | 'study' | 'notes' | 'highlights'>('all');
    const [selectedPostIndex, setSelectedPostIndex] = useState<number | null>(null);
    const [progressSummary, setProgressSummary] = useState<UserProgress | null>(null);
    const [viewerTouchStartX, setViewerTouchStartX] = useState<number | null>(null);

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

    const hydrateEditFields = (profileData: any) => {
        setEditName(profileData.displayName || '');
        setEditBio(profileData.bio || '');
        setEditPhotoURL(profileData.photoURL || '');
    };

    useEffect(() => {
        if (profile && !isEditing) {
            hydrateEditFields(profile);
        }
    }, [profile, isEditing]);

    useEffect(() => {
        if (!currentUser) return;

        const unsubscribe = subscribeToUserPosts(currentUser.uid, (posts) => {
            setUserPosts(posts);
        });

        return () => unsubscribe();
    }, [currentUser]);

    useEffect(() => {
        try {
            const progress = getProgress();
            setProgressSummary(progress);
        } catch (e) {
            console.error('Failed to load study progress', e);
        }
    }, []);

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
            await refreshProfile();
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

    const resolvedProgress = progressSummary;
    const totalFocusHours = resolvedProgress ? Math.round((resolvedProgress.totalStudySeconds / 3600) * 10) / 10 : 0;
    const currentStreakDays = resolvedProgress?.streakDays ?? 0;

    const getPostCategory = (post: SocialPost): 'study' | 'notes' | 'highlights' | 'other' => {
        if (post.category) return post.category;
        if (post.type === 'progress' || post.stats) return 'study';
        if ((post.tags || []).includes('highlight')) return 'highlights';
        return 'notes';
    };

    const sortedPosts = [...userPosts].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const filteredPosts = sortedPosts.filter(post => {
        if (activeFilter === 'all') return true;
        return getPostCategory(post) === activeFilter;
    });

    const openPostViewer = (index: number) => {
        setSelectedPostIndex(index);
    };

    const closePostViewer = () => {
        setSelectedPostIndex(null);
    };

    const goToAdjacentPost = (direction: 'prev' | 'next') => {
        if (selectedPostIndex == null) return;
        const total = filteredPosts.length;
        if (total === 0) return;
        const nextIndex = direction === 'next' ? selectedPostIndex + 1 : selectedPostIndex - 1;
        if (nextIndex < 0 || nextIndex >= total) return;
        setSelectedPostIndex(nextIndex);
    };

    const handleViewerTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        setViewerTouchStartX(e.touches[0]?.clientX ?? null);
    };

    const handleViewerTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        if (viewerTouchStartX == null) return;
        const endX = e.changedTouches[0]?.clientX ?? viewerTouchStartX;
        const deltaX = endX - viewerTouchStartX;
        const threshold = 40;
        if (Math.abs(deltaX) > threshold) {
            if (deltaX < 0) {
                goToAdjacentPost('next');
            } else {
                goToAdjacentPost('prev');
            }
        }
        setViewerTouchStartX(null);
    };

    const activePost = selectedPostIndex != null ? filteredPosts[selectedPostIndex] : null;

    const recentMediaForCollage = sortedPosts
        .map(post => {
            if (post.media && post.media.length > 0) return post.media[0].url;
            if (post.mediaUrl) return post.mediaUrl;
            return null;
        })
        .filter((url): url is string => Boolean(url))
        .slice(0, 3);

    if (profileLoading) return <div className="p-8 text-center">Loading profile...</div>;

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

                {/* Collage banner & quick stats */}
                <div className="relative mt-6 grid grid-cols-3 gap-3">
                    <div className="col-span-2 flex gap-2 h-24">
                        {recentMediaForCollage.length > 0 ? (
                            recentMediaForCollage.map((url, idx) => (
                                <div
                                    key={idx}
                                    className={`flex-1 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 ${idx === 0 ? 'hidden sm:block' : ''}`}
                                >
                                    <img src={url} className="w-full h-full object-cover" />
                                </div>
                            ))
                        ) : (
                            <div className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-900/40 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                                Share your first post to start your study collage.
                            </div>
                        )}
                    </div>
                    <div className="bg-slate-900/5 dark:bg-slate-800/60 rounded-xl p-4 flex flex-col justify-center gap-1">
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Study portfolio</p>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-300">Posts</span>
                            <span className="font-semibold text-slate-900 dark:text-white">{sortedPosts.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-300">Focus hours</span>
                            <span className="font-semibold text-slate-900 dark:text-white">{totalFocusHours.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-300">Current streak</span>
                            <span className="font-semibold text-slate-900 dark:text-white">{currentStreakDays} days</span>
                        </div>
                    </div>
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
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Birthday</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{profile?.birthday ? new Date(profile.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Not set'}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <BookOpen size={24} />
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">University</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white truncate">{profile?.university || 'Not set'}</p>
                    </div>
                </div>
            </div>

            {/* Profile Posts Panel */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        {(
                            [
                                { key: 'all', label: 'All' },
                                { key: 'study', label: 'Study' },
                                { key: 'notes', label: 'Notes' },
                                { key: 'highlights', label: 'Highlights' }
                            ] as const
                        ).map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveFilter(tab.key)}
                                className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${activeFilter === tab.key
                                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                                    : 'bg-transparent text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
                        <button
                            onClick={() => setLayoutMode('grid')}
                            className={`px-3 py-1.5 ${layoutMode === 'grid' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-300'}`}
                        >
                            Grid
                        </button>
                        <button
                            onClick={() => setLayoutMode('masonry')}
                            className={`px-3 py-1.5 border-l border-slate-200 dark:border-slate-700 ${layoutMode === 'masonry' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-300'}`}
                        >
                            Masonry
                        </button>
                    </div>
                </div>

                {filteredPosts.length === 0 ? (
                    <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                        No posts yet in this view. Share a study moment from the Community tab to build your portfolio.
                    </div>
                ) : (
                    <div
                        className={`grid gap-1.5 sm:gap-2 ${layoutMode === 'grid'
                            ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-3'
                            : 'grid-cols-2 md:grid-cols-3'
                            }`}
                    >
                        {filteredPosts.map((post, index) => {
                            const isCarousel = post.media && post.media.length > 1;
                            const thumbnailUrl =
                                post.media && post.media.length > 0
                                    ? post.media[0].url
                                    : post.mediaUrl;
                            if (!thumbnailUrl) return null;

                            const category = getPostCategory(post);
                            const durationMinutes = post.stats ? Math.round((post.stats.duration || 0) / 60) : null;

                            const overlayLabel = category === 'study'
                                ? post.stats?.subject || 'Study session'
                                : 'Shared note';

                            return (
                                <button
                                    key={post.id}
                                    type="button"
                                    onClick={() => openPostViewer(index)}
                                    className="group relative w-full overflow-hidden rounded-sm sm:rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <div
                                        className={`${layoutMode === 'grid' ? 'aspect-square' : index % 3 === 0 ? 'aspect-[4/5]' : 'aspect-[5/4]'} w-full overflow-hidden bg-slate-200 dark:bg-slate-800`}
                                    >
                                        <img
                                            src={thumbnailUrl}
                                            className="w-full h-full object-cover"
                                        />
                                        {/* Hover / long-press overlay */}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="px-3 text-xs text-white space-y-1 text-center">
                                                <p className="font-semibold truncate">{overlayLabel}</p>
                                                {durationMinutes != null && durationMinutes > 0 && (
                                                    <p className="text-[11px] text-white/80">
                                                        {durationMinutes} min focused · {post.stats?.xpEarned ?? 0} XP
                                                    </p>
                                                )}
                                                {currentStreakDays > 0 && (
                                                    <p className="text-[11px] text-white/80">
                                                        Streak: {currentStreakDays} days
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Carousel indicator */}
                                    {isCarousel && (
                                        <div className="absolute top-1 right-1">
                                            <div className="relative w-4 h-4">
                                                <div className="absolute inset-0 rounded-sm border border-white/90 bg-black/50" />
                                                <div className="absolute -top-0.5 -left-0.5 w-4 h-4 rounded-sm border border-white/60 bg-black/30" />
                                            </div>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Post Viewer Modal */}
            {selectedPostIndex != null && activePost && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center px-2 sm:px-4">
                    <div
                        className="relative w-full max-w-5xl bg-slate-950/80 sm:bg-slate-900 sm:rounded-2xl overflow-hidden flex flex-col md:flex-row md:h-[80vh]"
                        onTouchStart={handleViewerTouchStart}
                        onTouchEnd={handleViewerTouchEnd}
                    >
                        <button
                            type="button"
                            onClick={closePostViewer}
                            className="absolute top-3 right-3 z-20 text-white/70 hover:text-white"
                        >
                            <X size={22} />
                        </button>

                        <div className="md:w-2/3 bg-black flex items-center justify-center">
                            {activePost.media && activePost.media.length > 0 ? (
                                <MediaCarousel
                                    key={activePost.id}
                                    media={activePost.media}
                                    aspect="square"
                                    showArrows
                                    showDots
                                />
                            ) : activePost.mediaUrl ? (
                                <img src={activePost.mediaUrl} className="w-full h-full object-contain" />
                            ) : null}
                        </div>

                        <div className="md:w-1/3 bg-slate-900 text-white flex flex-col border-t md:border-t-0 md:border-l border-slate-800">
                            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center text-sm font-semibold">
                                        {profile?.photoURL ? (
                                            <img src={profile.photoURL} className="w-full h-full object-cover" />
                                        ) : (
                                            profile?.displayName?.charAt(0).toUpperCase() || 'U'
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold">{activePost.authorName}</span>
                                        <span className="text-[11px] text-slate-400">
                                            {new Date(activePost.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="hidden md:flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => goToAdjacentPost('prev')}
                                        className="w-7 h-7 rounded-full border border-slate-700 flex items-center justify-center text-slate-300 hover:bg-slate-800"
                                    >
                                        <ChevronLeft size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => goToAdjacentPost('next')}
                                        className="w-7 h-7 rounded-full border border-slate-700 flex items-center justify-center text-slate-300 hover:bg-slate-800"
                                    >
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 shrink-0 max-h-[40%] overflow-y-auto space-y-3 text-sm border-b border-slate-800">
                                {activePost.content && (
                                    <p className="whitespace-pre-wrap">{activePost.content}</p>
                                )}
                                {activePost.stats && (
                                    <div className="text-xs text-slate-400 space-y-1">
                                        <div>Subject: {activePost.stats.subject}</div>
                                        <div>
                                            Focused for {Math.round(activePost.stats.duration / 60)} min ·{' '}
                                            {activePost.stats.xpEarned} XP
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center gap-4 pt-1">
                                    <button className="flex items-center gap-1 text-rose-400">
                                        <Heart size={16} />
                                        <span className="text-xs">{activePost.likes} likes</span>
                                    </button>
                                    <button className="flex items-center gap-1 text-slate-400">
                                        <MessageCircle size={16} />
                                        <span className="text-xs">{activePost.commentsCount || 0} comments</span>
                                    </button>
                                </div>

                                {currentUser?.uid === activePost.authorId && (
                                    <div className="pt-4 flex gap-2">
                                        <button
                                            type="button"
                                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-200 hover:bg-slate-800"
                                            disabled
                                        >
                                            Edit (coming soon)
                                        </button>
                                        <button
                                            type="button"
                                            className="flex-1 px-3 py-1.5 rounded-lg border border-rose-500 text-xs text-rose-400 hover:bg-rose-500/10"
                                            onClick={async () => {
                                                try {
                                                    await deletePost(activePost.id);
                                                    closePostViewer();
                                                } catch (err) {
                                                    console.error('Failed to delete post', err);
                                                }
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 p-4 min-h-0">
                                <CommentThread 
                                    targetType="post" 
                                    targetId={activePost.id} 
                                    authorId={activePost.authorId}
                                    variant="full"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
