import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { GroupMessage } from '../../services/groups';
import { ChatMessage } from '../../services/social';

interface PinnedMessagesBannerProps {
    messages: (GroupMessage | ChatMessage)[];
    onMessageClick?: (messageId: string) => void;
}

export const PinnedMessagesBanner: React.FC<PinnedMessagesBannerProps> = ({
    messages,
    onMessageClick
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);

    const pinnedMessages = messages.filter((msg) => msg.pinned);

    if (pinnedMessages.length === 0) return null;

    const currentMessage = pinnedMessages[currentIndex];

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % pinnedMessages.length);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) =>
            prev === 0 ? pinnedMessages.length - 1 : prev - 1
        );
    };

    return (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-200 dark:border-indigo-800 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">
                        📌 Pinned ({currentIndex + 1}/{pinnedMessages.length})
                    </div>
                    <div
                        onClick={() => onMessageClick?.(currentMessage.id)}
                        className="text-sm text-slate-700 dark:text-slate-300 truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                        <span className="font-medium">{currentMessage.senderName}:</span> {currentMessage.content}
                    </div>
                </div>

                {pinnedMessages.length > 1 && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                            onClick={handlePrev}
                            className="p-1.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-800 transition-colors"
                            title="Previous pinned"
                        >
                            <ChevronLeft size={16} className="text-indigo-600 dark:text-indigo-400" />
                        </button>
                        <button
                            onClick={handleNext}
                            className="p-1.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-800 transition-colors"
                            title="Next pinned"
                        >
                            <ChevronRight size={16} className="text-indigo-600 dark:text-indigo-400" />
                        </button>
                    </div>
                )}

                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    title="Close"
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
};
