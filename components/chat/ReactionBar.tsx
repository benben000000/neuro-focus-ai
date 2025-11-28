import React from 'react';
import { GroupMessage } from '../../services/groups';
import { ChatMessage } from '../../services/social';

interface ReactionBarProps {
    message: GroupMessage | ChatMessage;
    currentUserId: string;
    onToggleReaction?: (emoji: string) => void;
}

export const ReactionBar: React.FC<ReactionBarProps> = ({
    message,
    currentUserId,
    onToggleReaction
}) => {
    const reactions = message.reactions || {};
    if (Object.keys(reactions).length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1.5 mt-2">
            {Object.entries(reactions).map(([emoji, userIds]) => {
                const userCount = userIds.length;
                const hasReacted = userIds.includes(currentUserId);

                return (
                    <button
                        key={emoji}
                        onClick={() => onToggleReaction?.(emoji)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-colors ${
                            hasReacted
                                ? 'bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-700'
                                : 'bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                        title={userIds.join(', ')}
                    >
                        <span>{emoji}</span>
                        <span className="text-xs font-medium">{userCount}</span>
                    </button>
                );
            })}
        </div>
    );
};
