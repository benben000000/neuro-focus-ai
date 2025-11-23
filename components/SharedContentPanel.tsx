import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToShares, dismissShare, SharedItem, SocialPost, Story } from '../services/social';
import { X, MessageCircle, Play, Image as ImageIcon, Trash2, ExternalLink } from 'lucide-react';
import { MediaCarousel } from './MediaCarousel';

const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
};

export function SharedContentPanel() {
    const { currentUser } = useAuth();
    const [shares, setShares] = useState<SharedItem[]>([]);
    const [viewingItem, setViewingItem] = useState<SharedItem | null>(null);

    useEffect(() => {
        if (!currentUser) return;
        const unsubscribe = subscribeToShares(currentUser.uid, (newShares) => {
            setShares(newShares);
        });
        return () => unsubscribe();
    }, [currentUser]);

    const handleDismiss = async (shareId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await dismissShare(shareId);
        if (viewingItem?.id === shareId) {
            setViewingItem(null);
        }
    };

    const getThumbnail = (item: SharedItem) => {
        if (item.type === 'post' && item.post) {
            if (item.post.media && item.post.media.length > 0) return item.post.media[0].url;
            return item.post.mediaUrl;
        }
        if (item.type === 'story' && item.story) {
            if (item.story.media && item.story.media.length > 0) return item.story.media[0].url;
            return item.story.mediaUrl;
        }
        return null;
    };

    if (shares.length === 0) return null;

    return (
        <>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-6">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Shared with you</h3>
                    <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold px-2 py-0.5 rounded-full">
                        {shares.length}
                    </span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                    {shares.map(share => {
                        const thumbnail = getThumbnail(share);
                        const isAvailable = (share.type === 'post' && share.post) || (share.type === 'story' && share.story);

                        return (
                            <div 
                                key={share.id} 
                                className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800/50 last:border-0 cursor-pointer"
                                onClick={() => isAvailable && setViewingItem(share)}
                            >
                                <div className="flex gap-3">
                                    <div className="relative flex-shrink-0 w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden">
                                        {thumbnail ? (
                                            <img src={thumbnail} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                <ImageIcon size={16} />
                                            </div>
                                        )}
                                        {share.type === 'story' && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                <div className="w-5 h-5 rounded-full border border-white flex items-center justify-center bg-black/30">
                                                    <Play size={8} fill="white" className="text-white ml-0.5" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate pr-2">
                                                {share.senderName}
                                            </p>
                                            <span className="text-[10px] text-slate-400 flex-shrink-0">{timeAgo(share.createdAt)}</span>
                                        </div>
                                        {share.note ? (
                                            <p className="text-xs text-slate-600 dark:text-slate-300 truncate italic">"{share.note}"</p>
                                        ) : (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                Shared a {share.type}
                                            </p>
                                        )}
                                        {!isAvailable && (
                                            <p className="text-[10px] text-rose-500 mt-1">Content unavailable</p>
                                        )}
                                    </div>
                                    <button 
                                        onClick={(e) => handleDismiss(share.id, e)}
                                        className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Viewer Modal */}
            {viewingItem && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <button 
                        onClick={() => setViewingItem(null)}
                        className="absolute top-4 right-4 text-white/70 hover:text-white z-50 bg-black/50 rounded-full p-2"
                    >
                        <X size={24} />
                    </button>

                    <div className="w-full max-w-md bg-black rounded-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
                         {/* Header */}
                         <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-20 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-700 border border-white/20">
                                {viewingItem.senderAvatar ? (
                                    <img src={viewingItem.senderAvatar} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                                        {viewingItem.senderName[0]}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-white text-sm font-bold shadow-sm">
                                    Shared by {viewingItem.senderName}
                                </p>
                                {viewingItem.note && (
                                    <p className="text-white/80 text-xs shadow-sm">"{viewingItem.note}"</p>
                                )}
                            </div>
                         </div>

                        {/* Content */}
                        <div className="flex-1 flex items-center justify-center bg-black">
                            {viewingItem.type === 'story' && viewingItem.story ? (
                                viewingItem.story.media && viewingItem.story.media.length > 0 ? (
                                    <MediaCarousel 
                                        media={viewingItem.story.media} 
                                        aspect="story"
                                        showArrows
                                        showDots
                                    />
                                ) : (
                                    <img src={viewingItem.story.mediaUrl} className="max-w-full max-h-full object-contain" />
                                )
                            ) : viewingItem.type === 'post' && viewingItem.post ? (
                                viewingItem.post.media && viewingItem.post.media.length > 0 ? (
                                    <MediaCarousel 
                                        media={viewingItem.post.media} 
                                        aspect="square"
                                        showArrows
                                        showDots
                                    />
                                ) : (
                                    <img src={viewingItem.post.mediaUrl} className="max-w-full max-h-full object-contain" />
                                )
                            ) : (
                                <div className="text-white">Content unavailable</div>
                            )}
                        </div>
                        
                        {/* Post Details Footer (for posts) */}
                        {viewingItem.type === 'post' && viewingItem.post && (
                            <div className="bg-white dark:bg-slate-900 p-4 text-slate-900 dark:text-white">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-bold text-sm">{viewingItem.post.authorName}</span>
                                    <span className="text-xs text-slate-500">{timeAgo(viewingItem.post.createdAt)}</span>
                                </div>
                                <p className="text-sm">{viewingItem.post.content}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
