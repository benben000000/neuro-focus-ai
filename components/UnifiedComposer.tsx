import React, { useEffect, useRef, useState } from 'react';
import { X, Image as ImageIcon, AlertCircle, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { createPost, createStory, SocialPost } from '../services/social';

interface UnifiedComposerProps {
    isOpen: boolean;
    onClose: () => void;
    /** Optional initial share target when there is no stored preference yet */
    initialTarget?: ShareTarget;
    /** Callback for optimistic feed insertion */
    onPostCreated?: (post: SocialPost) => void;
}

export type ShareTarget = 'feed' | 'story' | 'both';

interface ComposerMediaItem {
    id: string;
    dataUrl: string;
    originalName: string;
    width: number;
    height: number;
}

const MAX_DIMENSION = 1600;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function UnifiedComposer({ isOpen, onClose, initialTarget = 'feed', onPostCreated }: UnifiedComposerProps) {
    const { currentUser } = useAuth();
    const { profile } = useProfile();

    const [shareTarget, setShareTarget] = useState<ShareTarget>('feed');
    const [activePreviewTab, setActivePreviewTab] = useState<'feed' | 'story'>('feed');
    const [text, setText] = useState('');
    const [mediaItems, setMediaItems] = useState<ComposerMediaItem[]>([]);
    const [quality, setQuality] = useState(0.8);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadErrors, setUploadErrors] = useState<string[]>([]);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Load last-used share target per user
    useEffect(() => {
        if (!isOpen) return;

        let nextTarget: ShareTarget = 'feed';

        if (typeof window !== 'undefined' && currentUser) {
            const stored = window.localStorage.getItem(`unified-composer-target:${currentUser.uid}`);
            if (stored === 'feed' || stored === 'story' || stored === 'both') {
                nextTarget = stored;
            } else {
                nextTarget = initialTarget;
            }
        } else {
            nextTarget = initialTarget;
        }

        setShareTarget(nextTarget);
        setError(null);
        setUploadErrors([]);
        setActivePreviewTab('feed');
    }, [isOpen, currentUser?.uid, initialTarget]);

    if (!isOpen) return null;

    const persistShareTarget = (target: ShareTarget) => {
        setShareTarget(target);
        if (typeof window !== 'undefined' && currentUser) {
            window.localStorage.setItem(`unified-composer-target:${currentUser.uid}`, target);
        }
    };

    const resetState = () => {
        setText('');
        setMediaItems([]);
        setSubmitting(false);
        setError(null);
        setUploadErrors([]);
        setActivePreviewTab('feed');
    };

    const handleRequestClose = () => {
        if (submitting) return;
        resetState();
        onClose();
    };

    const resizeImageFile = (file: File, targetQuality: number): Promise<ComposerMediaItem> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_DIMENSION) {
                            height = Math.round(height * (MAX_DIMENSION / width));
                            width = MAX_DIMENSION;
                        }
                    } else {
                        if (height > MAX_DIMENSION) {
                            width = Math.round(width * (MAX_DIMENSION / height));
                            height = MAX_DIMENSION;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Unable to process image'));
                        return;
                    }
                    ctx.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL('image/jpeg', targetQuality);
                    resolve({
                        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                        dataUrl,
                        originalName: file.name,
                        width,
                        height
                    });
                };
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = event.target?.result as string;
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    };

    const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const newErrors: string[] = [];
        const validFiles = files.filter((file) => {
            if (!file.type.startsWith('image/')) {
                newErrors.push(`${file.name} is not an image and was skipped.`);
                return false;
            }
            if (file.size > MAX_FILE_SIZE_BYTES) {
                const mb = (MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
                newErrors.push(`${file.name} is too large. Max size is ${mb}MB.`);
                return false;
            }
            return true;
        });

        if (newErrors.length) {
            setUploadErrors((prev) => [...prev, ...newErrors]);
        }

        if (!validFiles.length) {
            e.target.value = '';
            return;
        }

        try {
            const processed = await Promise.all(validFiles.map((file) => resizeImageFile(file, quality)));
            setMediaItems((prev) => [...prev, ...processed]);
        } catch (err: any) {
            setError(err?.message || 'Failed to process one or more images.');
        } finally {
            // Allow re-selecting the same file(s)
            e.target.value = '';
        }
    };

    const handleRemoveMedia = (id: string) => {
        setMediaItems((prev) => prev.filter((item) => item.id !== id));
    };

    const handleMoveMedia = (id: string, direction: 'left' | 'right') => {
        setMediaItems((prev) => {
            const index = prev.findIndex((item) => item.id === id);
            if (index === -1) return prev;

            const newIndex = direction === 'left' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= prev.length) return prev;

            const copy = [...prev];
            const [moved] = copy.splice(index, 1);
            copy.splice(newIndex, 0, moved);
            return copy;
        });
    };

    const validateBeforeSubmit = () => {
        if (!currentUser) {
            setError('You need to be signed in to share.');
            return false;
        }

        const shareToFeed = shareTarget === 'feed' || shareTarget === 'both';
        const shareToStory = shareTarget === 'story' || shareTarget === 'both';

        if (shareToFeed && !text.trim() && mediaItems.length === 0) {
            setError('Add some text or at least one photo to share to your feed.');
            return false;
        }
        if (shareToStory && mediaItems.length === 0) {
            setError('Stories require at least one photo.');
            return false;
        }

        setError(null);
        return true;
    };

    const handleSubmit = async () => {
        if (!validateBeforeSubmit()) return;
        if (!currentUser) return;

        const shareToFeed = shareTarget === 'feed' || shareTarget === 'both';
        const shareToStory = shareTarget === 'story' || shareTarget === 'both';

        const primaryImage = mediaItems[0]?.dataUrl;
        const allImages = mediaItems.map((m) => m.dataUrl);

        const authorName = profile?.displayName || currentUser.displayName || currentUser.email || 'Student';
        const authorPhoto = profile?.photoURL || currentUser.photoURL || undefined;

        setSubmitting(true);
        setError(null);

        try {
            let createdPost: SocialPost | null = null;

            const tasks: Promise<void>[] = [];

            if (shareToFeed) {
                const postPayload = {
                    authorId: currentUser.uid,
                    authorName,
                    authorPhoto,
                    content: text.trim(),
                    mediaUrl: primaryImage || undefined,
                    mediaUrls: allImages.length ? allImages : undefined,
                    type: 'status' as const,
                    audience: 'public' as const
                };

                tasks.push((async () => {
                    const docId = await createPost(postPayload);
                    const now = Date.now();
                    createdPost = {
                        id: docId,
                        ...postPayload,
                        likes: 0,
                        likedBy: [],
                        createdAt: now
                    };
                })());
            }

            if (shareToStory && primaryImage) {
                const storyPayload = {
                    authorId: currentUser.uid,
                    authorName,
                    authorPhoto,
                    mediaUrl: primaryImage,
                    mediaUrls: allImages.length ? allImages : undefined,
                    audience: 'public' as const
                };

                tasks.push((async () => {
                    await createStory(storyPayload);
                })());
            }

            await Promise.all(tasks);

            if (createdPost && onPostCreated) {
                onPostCreated(createdPost);
            }

            resetState();
            onClose();
        } catch (err: any) {
            console.error('Failed to share from UnifiedComposer', err);
            setError(err?.message || 'Failed to share. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const renderMediaHero = () => {
        if (!mediaItems.length) {
            return (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-3">
                    <ImageIcon size={36} />
                    <p className="text-sm font-medium">Add photos to make this post stand out</p>
                    <p className="text-xs text-slate-400">You can upload multiple images, we&apos;ll optimize them for you.</p>
                </div>
            );
        }

        const primary = mediaItems[0];
        const extraCount = mediaItems.length - 1;

        return (
            <div className="relative w-full bg-black rounded-xl overflow-hidden flex items-center justify-center" style={{ aspectRatio: '4 / 3' }}>
                <img src={primary.dataUrl} className="w-full h-full object-cover" />
                {extraCount > 0 && (
                    <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                        +{extraCount} more photo{extraCount > 1 ? 's' : ''}
                    </div>
                )}
            </div>
        );
    };

    const renderStoryPreviewMedia = () => {
        if (!mediaItems.length) {
            return (
                <div
                    className="w-full bg-slate-900/80 rounded-xl flex items-center justify-center text-slate-400 text-xs"
                    style={{ aspectRatio: '9 / 16' }}
                >
                    Story preview
                </div>
            );
        }

        const primary = mediaItems[0];
        return (
            <div
                className="w-full bg-black rounded-xl overflow-hidden flex items-center justify-center"
                style={{ aspectRatio: '9 / 16' }}
            >
                <img src={primary.dataUrl} className="w-full h-full object-cover" />
            </div>
        );
    };

    const shareToFeed = shareTarget === 'feed' || shareTarget === 'both';
    const shareToStory = shareTarget === 'story' || shareTarget === 'both';
    const primaryImage = mediaItems[0]?.dataUrl;

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
            {/* Dismiss area for mobile bottom sheet */}
            <div className="hidden md:block absolute inset-0" onClick={handleRequestClose} />

            <div className="relative w-full md:w-auto md:max-w-4xl bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">Create</span>
                        <span className="text-[11px] text-slate-500">Share to feed, stories, or both</span>
                    </div>
                    <button
                        onClick={handleRequestClose}
                        className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                        aria-label="Close composer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Target toggle */}
                <div className="px-4 pt-3 border-b border-slate-200 dark:border-slate-800 flex gap-2 text-xs font-medium">
                    <button
                        onClick={() => persistShareTarget('feed')}
                        className={`flex-1 py-2 rounded-full border text-center transition-colors ${shareTarget === 'feed'
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                    >
                        Feed
                    </button>
                    <button
                        onClick={() => persistShareTarget('story')}
                        className={`flex-1 py-2 rounded-full border text-center transition-colors ${shareTarget === 'story'
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                    >
                        Story
                    </button>
                    <button
                        onClick={() => persistShareTarget('both')}
                        className={`flex-1 py-2 rounded-full border text-center transition-colors ${shareTarget === 'both'
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                    >
                        Both
                    </button>
                </div>

                {/* Error / validation area */}
                {(error || uploadErrors.length > 0) && (
                    <div className="px-4 pt-3">
                        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-3 flex items-start gap-2">
                            <AlertCircle className="text-rose-500 flex-shrink-0" size={18} />
                            <div className="space-y-1 text-xs">
                                {error && <p className="text-rose-700 dark:text-rose-300">{error}</p>}
                                {uploadErrors.map((msg, idx) => (
                                    <p key={idx} className="text-rose-700 dark:text-rose-300">
                                        {msg}
                                    </p>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Body */}
                <div className="px-4 pb-4 pt-3 space-y-4 max-h-[80vh] overflow-y-auto">
                    {/* User row & text input */}
                    <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                            {profile?.photoURL || currentUser?.photoURL ? (
                                <img
                                    src={profile?.photoURL || (currentUser?.photoURL as string)}
                                    className="w-full h-full object-cover"
                                />
                            ) : null}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {profile?.displayName || currentUser?.displayName || 'Student'}
                            </p>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="What's on your mind?"
                                className="mt-1 w-full bg-transparent border-0 resize-none outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 min-h-[60px]"
                            />
                        </div>
                    </div>

                    {/* Media picker */}
                    <div>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative w-full rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors overflow-hidden`}
                        >
                            {renderMediaHero()}
                            <div className="absolute top-3 left-3 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-900/70 px-2 py-1 rounded-full">
                                <ImageIcon size={14} />
                                <span>{mediaItems.length ? 'Add more photos' : 'Add photos'}</span>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleFilesSelected}
                            />
                        </div>

                        {mediaItems.length > 1 && (
                            <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                                {mediaItems.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border ${
                                            index === 0
                                                ? 'border-indigo-500 ring-2 ring-indigo-500/40'
                                                : 'border-slate-200 dark:border-slate-700'
                                        }`}
                                    >
                                        <img src={item.dataUrl} className="w-full h-full object-cover" />
                                        <div className="absolute top-1 left-1 px-1.5 py-[1px] rounded-full bg-black/60 text-[10px] text-white">
                                            {index + 1}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(ev) => {
                                                ev.stopPropagation();
                                                handleRemoveMedia(item.id);
                                            }}
                                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-[10px] hover:bg-black/80"
                                            aria-label="Remove image"
                                        >
                                            <X size={10} />
                                        </button>
                                        <div className="absolute bottom-1 left-1 right-1 flex justify-between gap-1">
                                            <button
                                                type="button"
                                                onClick={(ev) => {
                                                    ev.stopPropagation();
                                                    handleMoveMedia(item.id, 'left');
                                                }}
                                                disabled={index === 0}
                                                className="flex-1 flex items-center justify-center h-5 rounded-full bg-black/50 text-white disabled:opacity-40 text-[10px]"
                                            >
                                                <ChevronLeft size={10} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(ev) => {
                                                    ev.stopPropagation();
                                                    handleMoveMedia(item.id, 'right');
                                                }}
                                                disabled={index === mediaItems.length - 1}
                                                className="flex-1 flex items-center justify-center h-5 rounded-full bg-black/50 text-white disabled:opacity-40 text-[10px]"
                                            >
                                                <ChevronRight size={10} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Quality slider */}
                        <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500">
                            <span className="whitespace-nowrap">Image quality</span>
                            <input
                                type="range"
                                min={0.5}
                                max={0.95}
                                step={0.05}
                                value={quality}
                                onChange={(e) => setQuality(parseFloat(e.target.value))}
                                className="flex-1 accent-indigo-600"
                            />
                            <span className="whitespace-nowrap text-slate-400">
                                {Math.round(quality * 100)}%
                            </span>
                        </div>
                    </div>

                    {/* Preview section */}
                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                        {/* Mobile tabs */}
                        <div className="flex md:hidden border-b border-slate-200 dark:border-slate-800 text-xs font-medium">
                            <button
                                onClick={() => setActivePreviewTab('feed')}
                                className={`flex-1 py-2 text-center ${
                                    activePreviewTab === 'feed'
                                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                                        : 'text-slate-500'
                                }`}
                            >
                                Feed preview
                            </button>
                            <button
                                onClick={() => setActivePreviewTab('story')}
                                className={`flex-1 py-2 text-center ${
                                    activePreviewTab === 'story'
                                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                                        : 'text-slate-500'
                                }`}
                            >
                                Story preview
                            </button>
                        </div>

                        <div className="p-3 md:p-4 md:flex md:gap-4">
                            {/* Feed preview */}
                            <div
                                className={`${
                                    activePreviewTab === 'feed' ? 'block' : 'hidden'
                                } md:block md:flex-1 md:border-r md:border-slate-200 md:dark:border-slate-800 md:pr-4`}
                            >
                                <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-2 hidden md:block">
                                    Feed preview
                                </p>
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                                    <div className="p-2 flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                                            {profile?.photoURL || currentUser?.photoURL ? (
                                                <img
                                                    src={profile?.photoURL || (currentUser?.photoURL as string)}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">
                                                    {(profile?.displayName || currentUser?.displayName || 'S').charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-900 dark:text-white">
                                                {profile?.displayName || currentUser?.displayName || 'Student'}
                                            </p>
                                            <p className="text-[10px] text-slate-400">Public • Just now</p>
                                        </div>
                                    </div>
                                    {shareToFeed && primaryImage && (
                                        <div className="w-full bg-black" style={{ aspectRatio: '1 / 1' }}>
                                            <img src={primaryImage} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    {shareToFeed && !primaryImage && (
                                        <div
                                            className="w-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[11px] text-slate-400"
                                            style={{ aspectRatio: '1 / 1' }}
                                        >
                                            Your photo will appear here
                                        </div>
                                    )}
                                    <div className="p-3 text-xs text-slate-900 dark:text-slate-100 whitespace-pre-wrap min-h-[40px]">
                                        {text.trim() || <span className="text-slate-400">Your caption will appear here</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Story preview */}
                            <div
                                className={`${
                                    activePreviewTab === 'story' ? 'block' : 'hidden'
                                } md:block md:flex-1 md:pl-4`}
                            >
                                <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-2 hidden md:block">
                                    Story preview
                                </p>
                                <div className="flex flex-col items-center">
                                    <div className="w-40 sm:w-48 md:w-56">
                                        {renderStoryPreviewMedia()}
                                    </div>
                                    {shareToStory ? (
                                        <p className="mt-2 text-[11px] text-slate-400 text-center max-w-xs">
                                            This is how your first photo will appear as a story. Additional photos will be part of
                                            the same story group.
                                        </p>
                                    ) : (
                                        <p className="mt-2 text-[11px] text-slate-400 text-center max-w-xs">
                                            Switch the toggle above to share to your story.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-white/95 dark:bg-slate-900/95">
                    <p className="text-[11px] text-slate-400 hidden sm:block">
                        Photos are resized to a maximum of 1600px and compressed on your device before upload.
                    </p>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || (!shareToFeed && !shareToStory)}
                        className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Publishing…' : 'Share'}
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
