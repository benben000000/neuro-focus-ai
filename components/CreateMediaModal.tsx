import React, { useState, useRef } from 'react';
import { X, Image as ImageIcon, Send, Camera, Edit3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createPost, createStory, getUserProfile } from '../services/social';
import { ImageEditor } from './ImageEditor';

interface CreateMediaModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'post' | 'story'; // Default mode
}

export function CreateMediaModal({ isOpen, onClose, type: initialType }: CreateMediaModalProps) {
    const { currentUser } = useAuth();
    const [mode, setMode] = useState<'post' | 'story'>(initialType);
    const [content, setContent] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [rawImage, setRawImage] = useState<string | null>(null);
    const [showImageEditor, setShowImageEditor] = useState(false);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                setRawImage(dataUrl);
                setShowImageEditor(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleImageEditorSave = (editedDataUrl: string) => {
        setSelectedImage(editedDataUrl);
        setShowImageEditor(false);
    };

    const handleImageEditorCancel = () => {
        setShowImageEditor(false);
        setRawImage(null);
    };

    const handleSubmit = async () => {
        if (!currentUser) return;
        if (mode === 'post' && !content && !selectedImage) return;
        if (mode === 'story' && !selectedImage) return;

        setLoading(true);
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
                await createPost({
                    ...authorData,
                    content: content,
                    mediaUrl: selectedImage || undefined,
                    type: 'status'
                });
            }
            onClose();
            setContent('');
            setSelectedImage(null);
            setRawImage(null);
        } catch (error) {
            console.error("Failed to create:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {showImageEditor && rawImage && (
                <ImageEditor
                    imageDataUrl={rawImage}
                    onSave={handleImageEditorSave}
                    onCancel={handleImageEditorCancel}
                />
            )}
            {!showImageEditor && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="font-bold text-lg text-slate-900 dark:text-white">Create New</h2>
                    <button onClick={() => {
                        onClose();
                        setContent('');
                        setSelectedImage(null);
                        setRawImage(null);
                    }} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
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
                    {/* Image Preview/Upload */}
                    <div className="space-y-2">
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
                        {selectedImage && (
                            <button
                                onClick={() => setShowImageEditor(true)}
                                className="w-full py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-2"
                            >
                                <Edit3 size={16} />
                                Re-edit Photo
                            </button>
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
                        disabled={loading || (mode === 'story' && !selectedImage) || (mode === 'post' && !content && !selectedImage)}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? 'Sharing...' : 'Share'} <Send size={16} />
                    </button>
                </div>
            </div>
            </div>
            )}
        </>
    );
}
