import React, { useState, useRef, useEffect } from 'react';
import { X, Image as ImageIcon, Send, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createPost, createStory, getUserProfile, SocialPost } from '../services/social';

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
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync mode state with type prop whenever modal opens
    useEffect(() => {
        if (isOpen) {
            setMode(initialType);
            setError(null);
        }
    }, [isOpen, initialType]);

    if (!isOpen) return null;

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    // Resize image to max 800px width/height to save space
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const maxSize = 800;

                    if (width > height) {
                        if (width > maxSize) {
                            height *= maxSize / width;
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width *= maxSize / height;
                            height = maxSize;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    setSelectedImage(canvas.toDataURL('image/jpeg', 0.7)); // Compress to 70% quality
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        if (!currentUser) {
            setError('You need to be signed in to share.');
            return;
        }
        if (mode === 'post' && !content && !selectedImage) {
            setError('Add a caption or photo to share a post.');
            return;
        }
        if (mode === 'story' && !selectedImage) {
            setError('Stories require a photo or image.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const userProfile = await getUserProfile(currentUser.uid);
            const authorData = {
                authorId: currentUser.uid,
                authorName: userProfile?.displayName || 'Student',
                authorPhoto: userProfile?.photoURL
            };

            if (mode === 'story' && selectedImage) {
                await createStory({
                    ...authorData,
                    mediaUrl: selectedImage
                });
            } else {
                const postData = {
                    ...authorData,
                    content: content,
                    mediaUrl: selectedImage || undefined,
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
                        createdAt: now
                    });
                }
            }
            onClose();
            setContent('');
            setSelectedImage(null);
        } catch (error: any) {
            console.error("Failed to create:", error);
            setError(error?.message || 'Failed to share. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
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
                <div className="p-6 space-y-4">
                    {/* Error Alert */}
                    {error && (
                        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-3 flex items-start gap-2">
                            <AlertCircle className="text-rose-500 flex-shrink-0" size={20} />
                            <p className="text-sm text-rose-700 dark:text-rose-400">{error}</p>
                        </div>
                    )}

                    {/* Image Preview/Upload */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-full aspect-video rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors overflow-hidden relative ${selectedImage ? 'border-none' : ''}`}
                    >
                        {selectedImage ? (
                            <>
                                <img src={selectedImage} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium">
                                    Change Image
                                </div>
                            </>
                        ) : (
                            <div className="text-slate-400 flex flex-col items-center gap-2">
                                <ImageIcon size={32} />
                                <span className="text-sm font-medium">Upload Photo</span>
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageSelect}
                        />
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
                        disabled={loading || (mode === 'story' && !selectedImage) || (mode === 'post' && !content && !selectedImage)}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? 'Sharing...' : 'Share'} <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
