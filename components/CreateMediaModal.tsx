import React, { useState, useRef, useEffect } from 'react';
import { X, Image as ImageIcon, Send, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createPost, createStory, getUserProfile, SocialPost, ComposerMedia } from '../services/social';
import { MediaCarousel } from './MediaCarousel';

interface CreateMediaModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'post' | 'story'; // Default mode
    onPostCreated?: (post: SocialPost) => void;
}

export function CreateMediaModal({ isOpen, onClose, type: initialType, onPostCreated }: CreateMediaModalProps) {
    const { currentUser } = useAuth();
    const [mode, setMode] = useState<'post' | 'story'>(initialType);
    const [content, setContent] = useState('');
    const [media, setMedia] = useState<ComposerMedia[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragIndexRef = useRef<number | null>(null);

    // Sync mode state with type prop whenever modal opens
    useEffect(() => {
        if (isOpen) {
            setMode(initialType);
            setError(null);
            setValidationErrors([]);
        }
    }, [isOpen, initialType]);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const MAX_DIMENSION = 1600;
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    const compressImageFile = (file: File): Promise<ComposerMedia> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_DIMENSION) {
                            height *= MAX_DIMENSION / width;
                            width = MAX_DIMENSION;
                        }
                    } else {
                        if (height > MAX_DIMENSION) {
                            width *= MAX_DIMENSION / height;
                            height = MAX_DIMENSION;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');

                    if (!ctx) {
                        reject(new Error('Failed to process image.'));
                        return;
                    }

                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

                    resolve({
                        id,
                        url: dataUrl,
                        width,
                        height,
                        mimeType: 'image/jpeg'
                    });
                };
                img.onerror = () => reject(new Error('Unable to load image.'));
                img.src = event.target?.result as string;
            };
            reader.onerror = () => reject(new Error('Unable to read file.'));
            reader.readAsDataURL(file);
        });
    };

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []) as File[];
        if (!files.length) return;

        const errors: string[] = [];
        const processed: ComposerMedia[] = [];

        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                errors.push(`${file.name}: Unsupported file type.`);
                continue;
            }

            if (file.size > MAX_FILE_SIZE) {
                errors.push(`${file.name}: File is too large. Please choose images under 10MB.`);
                continue;
            }

            try {
                const mediaItem = await compressImageFile(file);
                processed.push(mediaItem);
            } catch (err: any) {
                console.error('Failed to process image', err);
                errors.push(`${file.name}: Could not process image.`);
            }
        }

        if (processed.length) {
            setMedia(prev => {
                const next = [...prev, ...processed];
                if (prev.length === 0) {
                    setActiveIndex(0);
                }
                return next;
            });
        }

        setValidationErrors(errors);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async () => {
        if (!currentUser) {
            setError('You need to be signed in to share.');
            return;
        }
        if (mode === 'post' && !content.trim() && media.length === 0) {
            setError('Add a caption or at least one photo to share a post.');
            return;
        }
        if (mode === 'story' && media.length === 0) {
            setError('Stories require at least one photo.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const userProfile = await getUserProfile(currentUser.uid);
            const authorData = {
                authorId: currentUser.uid,
                authorName: userProfile?.displayName || 'Student',
                authorPhoto: userProfile?.photoURL,
                authorIsVerified: userProfile?.isVerified
            };

            const mediaPayload = media.length ? media : undefined;
            const primaryMediaUrl = mediaPayload && mediaPayload.length > 0 ? mediaPayload[0].url : undefined;

            if (mode === 'story' && mediaPayload) {
                await createStory({
                    ...authorData,
                    media: mediaPayload,
                    mediaUrl: primaryMediaUrl
                });
            } else {
                const postData = {
                    ...authorData,
                    content: content.trim(),
                    media: mediaPayload,
                    mediaUrl: primaryMediaUrl,
                    type: 'status' as const
                };
                const docId = await createPost(postData);
                const now = Date.now();

                // Optimistically add to feed if callback provided
                if (onPostCreated) {
                    onPostCreated({
                        id: docId,
                        ...postData,
                        likes: 0,
                        likedBy: [],
                        commentsCount: 0,
                        createdAt: now
                    });
                }
            }
            onClose();
            setContent('');
            setMedia([]);
            setActiveIndex(0);
            setValidationErrors([]);
        } catch (error: any) {
            console.error('Failed to create:', error);
            setError(error?.message || 'Failed to share. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[min(90vh,720px)]">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="font-bold text-lg text-slate-900 dark:text-white">Create New</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* Mode Switcher */}
                <div className="flex border-b border-slate-100 dark:border-slate-800">
                    <button
                        onClick={() => setMode('post')}
                        className={`flex-1 py-3 font-medium text-sm transition-colors ${mode === 'post' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
                    >
                        Post
                    </button>
                    <button
                        onClick={() => setMode('story')}
                        className={`flex-1 py-3 font-medium text-sm transition-colors ${mode === 'story' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
                    >
                        Story
                    </button>
                </div>

                {/* Content Area */}
                <div className="p-6 space-y-4 flex-1 overflow-y-auto overscroll-contain">
                    {/* Error Alert */}
                    {(error || validationErrors.length > 0) && (
                        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-3 flex items-start gap-2">
                            <AlertCircle className="text-rose-500 flex-shrink-0" size={20} />
                            <div className="space-y-1">
                                {error && (
                                    <p className="text-sm text-rose-700 dark:text-rose-400">{error}</p>
                                )}
                                {validationErrors.map((msg, idx) => (
                                    <p key={idx} className="text-xs text-rose-600 dark:text-rose-300">
                                        {msg}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Image Preview/Upload */}
                    <div className="space-y-3">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`w-full rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors overflow-hidden relative ${media.length > 0 ? (mode === 'story' ? 'h-[70vh]' : 'h-[50vh]') : (mode === 'story' ? 'aspect-[9/16]' : 'aspect-square')} ${media.length > 0 ? 'border-none bg-black' : ''}`}
                        >
                            {media.length > 0 ? (
                                <>
                                    <MediaCarousel
                                        media={media}
                                        aspect="auto"
                                        objectFit="contain"
                                        className="h-full"
                                        showArrows
                                        showDots
                                        initialIndex={activeIndex}
                                        onIndexChange={setActiveIndex}
                                    />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-start justify-between px-3 py-2 pointer-events-none">
                                        <span className="text-xs font-medium text-white/80">Tap to add more</span>
                                    </div>
                                </>
                            ) : (
                                <div className="text-slate-400 flex flex-col items-center gap-2 pointer-events-none">
                                    <ImageIcon size={32} />
                                    <span className="text-sm font-medium">
                                        {mode === 'story' ? 'Add story photos' : 'Upload photos'}
                                    </span>
                                    <span className="text-[11px] text-slate-400">JPEGs up to ~1600px · You can add multiple</span>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                multiple
                                onChange={handleImageSelect}
                            />
                        </div>

                        {media.length > 0 && (
                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                {media.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className={`group relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border ${index === activeIndex ? 'border-indigo-500' : 'border-slate-200 dark:border-slate-700'}`}
                                        draggable
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveIndex(index);
                                        }}
                                        onDragStart={() => {
                                            dragIndexRef.current = index;
                                        }}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            const from = dragIndexRef.current;
                                            if (from == null || from === index) return;
                                            setMedia(prev => {
                                                const next = [...prev];
                                                const [moved] = next.splice(from, 1);
                                                next.splice(index, 0, moved);
                                                dragIndexRef.current = index;
                                                return next;
                                            });
                                        }}
                                        onDragEnd={() => {
                                            dragIndexRef.current = null;
                                        }}
                                    >
                                        <img src={item.url} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setMedia(prev => {
                                                    const next = prev.filter((_, i) => i !== index);
                                                    const nextIndex = Math.min(activeIndex, next.length - 1);
                                                    setActiveIndex(Math.max(nextIndex, 0));
                                                    return next;
                                                });
                                            }}
                                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Caption (Post only) */}
                    {mode === 'post' && (
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Write a caption..."
                            className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24"
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                        onClick={handleSubmit}
                        disabled={loading || (mode === 'story' && media.length === 0) || (mode === 'post' && !content.trim() && media.length === 0)}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? 'Sharing...' : 'Share'} <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
