import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Story, subscribeToStories, getUserProfile } from '../services/social';
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface StoryTrayProps {
    onCreateStory: () => void;
}

export function StoryTray({ onCreateStory }: StoryTrayProps) {
    const { currentUser } = useAuth();
    const [stories, setStories] = useState<Story[]>([]);
    const [groupedStories, setGroupedStories] = useState<Record<string, Story[]>>({});
    const [viewingStory, setViewingStory] = useState<string | null>(null); // Author ID
    const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

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

    const handleViewStory = (authorId: string) => {
        setViewingStory(authorId);
        setCurrentStoryIndex(0);
    };

    const handleNextStory = () => {
        if (!viewingStory) return;
        const userStories = groupedStories[viewingStory];
        if (currentStoryIndex < userStories.length - 1) {
            setCurrentStoryIndex(prev => prev + 1);
        } else {
            setViewingStory(null);
        }
    };

    const handlePrevStory = () => {
        if (currentStoryIndex > 0) {
            setCurrentStoryIndex(prev => prev - 1);
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
                                <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 to-fuchsia-600">
                                    <div className="w-full h-full rounded-full border-2 border-white dark:border-slate-900 overflow-hidden bg-white dark:bg-slate-800">
                                        {story.authorPhoto ? (
                                            <img src={story.authorPhoto} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">
                                                {story.authorName[0]}
                                            </div>
                                        )}
                                    </div>
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

                    <div className="relative w-full max-w-md h-full md:h-[80vh] bg-slate-900 md:rounded-2xl overflow-hidden flex flex-col">
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
                        <div className="absolute top-4 left-0 w-full p-4 flex items-center gap-3 z-20">
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
                                {activeStory.authorPhoto ? (
                                    <img src={activeStory.authorPhoto} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-slate-700" />
                                )}
                            </div>
                            <span className="font-bold text-white shadow-sm">{activeStory.authorName}</span>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 relative bg-black flex items-center justify-center">
                            <img src={activeStory.mediaUrl} className="max-w-full max-h-full object-contain" />

                            {/* Navigation Overlays */}
                            <div className="absolute inset-y-0 left-0 w-1/3" onClick={handlePrevStory} />
                            <div className="absolute inset-y-0 right-0 w-1/3" onClick={handleNextStory} />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
