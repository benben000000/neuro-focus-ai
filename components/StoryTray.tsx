import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Story, subscribeToStories, subscribeToPresence, UserPresence } from '../services/social';
import { Plus, X, ChevronLeft, ChevronRight, Share2, MessageCircle, BadgeCheck } from 'lucide-react';
import { MediaCarousel } from './MediaCarousel';
import { ShareModal } from './ShareModal';
import { CommentThread } from './CommentThread';

const StoryTrayPresence = ({ userId }: { userId: string }) => {
    const [presence, setPresence] = useState<UserPresence | null>(null);
    useEffect(() => {
        return subscribeToPresence(userId, setPresence);
    }, [userId]);
    
    if (!presence?.online) return null;
    return (
        <div className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full z-10" />
    );
};

interface StoryTrayProps {
    onCreateStory: () => void;
}

export function StoryTray({ onCreateStory }: StoryTrayProps) {
    const { currentUser } = useAuth();
    const [stories, setStories] = useState<Story[]>([]);
    const [groupedStories, setGroupedStories] = useState<Record<string, Story[]>>({});
    const [viewingStory, setViewingStory] = useState<string | null>(null); // Author ID
    const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
    const [shareModalContent, setShareModalContent] = useState<{ type: 'post' | 'story', id: string } | null>(null);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeToStories((fetchedStories) => {
            setStories(fetchedStories);

            // Group by author
            const grouped = fetchedStories.reduce((acc, story) => {
                if (!acc[story.authorId]) acc[story.authorId] = [];
                acc[story.authorId].push(story);
                return acc;
            }, {} as Record<string, Story[]>);

            setGroupedStories(grouped);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!viewingStory) return;

        const preventDefault = (e: any) => {
            e.preventDefault();
        };

        // Block pinch-zoom gestures on iOS/Safari
        document.addEventListener('gesturestart', preventDefault);
        document.addEventListener('gesturechange', preventDefault);
        document.addEventListener('gestureend', preventDefault);

        // Block Ctrl+Wheel zoom
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey) {
                e.preventDefault();
            }
        };
        // Passive: false is required to be able to call preventDefault
        document.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            document.removeEventListener('gesturestart', preventDefault);
            document.removeEventListener('gesturechange', preventDefault);
            document.removeEventListener('gestureend', preventDefault);
            document.removeEventListener('wheel', handleWheel);
        };
    }, [viewingStory]);

    const handleViewStory = (authorId: string) => {
        setViewingStory(authorId);
        setCurrentStoryIndex(0);
        setIsCommentsOpen(false);
    };

    const handleNextStory = () => {
        if (!viewingStory) return;
        const userStories = groupedStories[viewingStory];
        if (currentStoryIndex < userStories.length - 1) {
            setCurrentStoryIndex(prev => prev + 1);
            setIsCommentsOpen(false);
        } else {
            setViewingStory(null);
            setIsCommentsOpen(false);
        }
    };

    const handlePrevStory = () => {
        if (currentStoryIndex > 0) {
            setCurrentStoryIndex(prev => prev - 1);
            setIsCommentsOpen(false);
        }
    };

    const activeStory = viewingStory ? groupedStories[viewingStory]?.[currentStoryIndex] : null;

    return (
        <>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6 overflow-x-auto">
                <div className="flex gap-4 min-w-max">
                    {/* Add Story Button */}
                    <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={onCreateStory}>
                        <div className="w-16 h-16 rounded-full p-[2px] border-2 border-slate-200 dark:border-slate-700 relative">
                            <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                                {currentUser?.photoURL ? (
                                    <img src={currentUser.photoURL} className="w-full h-full object-cover opacity-80" />
                                ) : (
                                    <div className="w-full h-full bg-slate-200 dark:bg-slate-700" />
                                )}
                            </div>
                            <div className="absolute bottom-0 right-0 bg-indigo-600 text-white rounded-full p-1 border-2 border-white dark:border-slate-900">
                                <Plus size={12} strokeWidth={3} />
                            </div>
                        </div>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Your Story</span>
                    </div>

                    {/* Other Users' Stories */}
                    {Object.entries(groupedStories).map(([authorId, userStories]) => {
                        if (authorId === currentUser?.uid) return null; // Skip own story in list for now
                        const story = userStories[0]; // Show latest or first
                        return (
                            <div key={authorId} className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => handleViewStory(authorId)}>
                                <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 to-fuchsia-600 relative">
                                    <div className="w-full h-full rounded-full border-2 border-white dark:border-slate-900 overflow-hidden bg-white dark:bg-slate-800">
                                        {story.authorPhoto ? (
                                            <img src={story.authorPhoto} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">
                                                {story.authorName[0]}
                                            </div>
                                        )}
                                    </div>
                                    <StoryTrayPresence userId={authorId} />
                                </div>
                                <span className="text-xs font-medium text-slate-900 dark:text-white max-w-[70px] truncate">{story.authorName}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Story Viewer Modal */}
            {viewingStory && activeStory && (
                <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
                    <button
                        onClick={() => setViewingStory(null)}
                        className="absolute top-4 right-4 text-white/80 hover:text-white z-50"
                    >
                        <X size={32} />
                    </button>

                    <div className="relative w-full max-w-md h-full md:h-[80vh] bg-slate-900 md:rounded-2xl overflow-hidden flex flex-col touch-pan-y">
                        {/* Progress Bar */}
                        <div className="absolute top-0 left-0 w-full p-2 flex gap-1 z-20">
                            {groupedStories[viewingStory].map((_, idx) => (
                                <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full bg-white transition-all duration-300 ${idx < currentStoryIndex ? 'w-full' : idx === currentStoryIndex ? 'w-full' : 'w-0'}`}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Header */}
                        <div className="absolute top-4 left-0 w-full p-4 flex items-center justify-between z-20">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
                                    {activeStory.authorPhoto ? (
                                        <img src={activeStory.authorPhoto} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-700" />
                                    )}
                                </div>
                                <span className="font-bold text-white shadow-sm flex items-center gap-1">
                                    {activeStory.authorName}
                                    {activeStory.authorIsVerified && <BadgeCheck size={14} className="text-blue-400 fill-blue-900" />}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsCommentsOpen(!isCommentsOpen);
                                    }}
                                    className="text-white/80 hover:text-white p-2 bg-black/20 rounded-full backdrop-blur-sm flex items-center gap-1"
                                >
                                    <MessageCircle size={20} />
                                    {activeStory.commentsCount > 0 && <span className="text-xs font-bold">{activeStory.commentsCount}</span>}
                                </button>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShareModalContent({ type: 'story', id: activeStory.id });
                                    }}
                                    className="text-white/80 hover:text-white p-2 bg-black/20 rounded-full backdrop-blur-sm"
                                >
                                    <Share2 size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 relative bg-black flex items-center justify-center">
                            {activeStory.media && activeStory.media.length > 0 ? (
                                <MediaCarousel
                                    media={activeStory.media}
                                    aspect="story"
                                    showArrows
                                    showDots
                                    className="touch-pan-y"
                                />
                            ) : (
                                <img src={activeStory.mediaUrl} className="max-w-full max-h-full object-contain" />
                            )}

                            {/* Story-to-story navigation */}
                            {!isCommentsOpen && (
                                <>
                                    <button
                                        type="button"
                                        onClick={handlePrevStory}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center z-10"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleNextStory}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center z-10"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </>
                            )}

                            {isCommentsOpen && (
                                <div className="absolute inset-x-0 bottom-0 top-16 z-30 bg-black/80 backdrop-blur-md rounded-t-2xl overflow-hidden dark" onClick={(e) => e.stopPropagation()}>
                                    <CommentThread
                                        parentId={activeStory.id}
                                        parentType="stories"
                                        isOwner={currentUser?.uid === activeStory.authorId}
                                        onClose={() => setIsCommentsOpen(false)}
                                        className="h-full bg-transparent border-0"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {shareModalContent && (
                <ShareModal
                    isOpen={!!shareModalContent}
                    onClose={() => setShareModalContent(null)}
                    content={shareModalContent}
                />
            )}
        </>
    );
}
