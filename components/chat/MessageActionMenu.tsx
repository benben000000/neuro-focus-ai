import React, { useState } from 'react';
import { Smile, Edit2, Trash2, Pin, Copy, ChevronDown } from 'lucide-react';
import { GroupMessage } from '../../services/groups';
import { ChatMessage } from '../../services/social';

interface MessageActionMenuProps {
    message: GroupMessage | ChatMessage;
    currentUserId: string;
    onEdit?: () => void;
    onDelete?: () => void;
    onReaction?: (emoji: string) => void;
    onPin?: (shouldPin: boolean) => void;
    isChatMessage?: boolean;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export const MessageActionMenu: React.FC<MessageActionMenuProps> = ({
    message,
    currentUserId,
    onEdit,
    onDelete,
    onReaction,
    onPin,
    isChatMessage = false
}) => {
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const isOwnMessage = message.senderId === currentUserId;
    const isPinned = 'pinned' in message ? message.pinned : false;

    const handleCopyLink = () => {
        const link = `${window.location.href}#msg-${message.id}`;
        navigator.clipboard.writeText(link);
    };

    return (
        <div className="flex items-center gap-1">
            {/* Quick Reactions */}
            <div className="relative">
                <button
                    onClick={() => setShowReactionPicker(!showReactionPicker)}
                    className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Add reaction"
                >
                    <Smile size={16} className="text-slate-500" />
                </button>
                
                {showReactionPicker && (
                    <div className="absolute bottom-full mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-2 flex gap-1 z-50">
                        {QUICK_EMOJIS.map((emoji) => (
                            <button
                                key={emoji}
                                onClick={() => {
                                    onReaction?.(emoji);
                                    setShowReactionPicker(false);
                                }}
                                className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors text-lg"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit (only for own messages) */}
            {isOwnMessage && (
                <button
                    onClick={onEdit}
                    className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Edit message"
                >
                    <Edit2 size={16} className="text-slate-500" />
                </button>
            )}

            {/* Delete (only for own messages) */}
            {isOwnMessage && (
                <button
                    onClick={onDelete}
                    className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Delete message"
                >
                    <Trash2 size={16} className="text-slate-500" />
                </button>
            )}

            {/* Pin */}
            <button
                onClick={() => onPin?.(!isPinned)}
                className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title={isPinned ? 'Unpin message' : 'Pin message'}
            >
                <Pin size={16} className={isPinned ? 'text-indigo-600' : 'text-slate-500'} />
            </button>

            {/* Copy Link */}
            <button
                onClick={handleCopyLink}
                className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Copy link"
            >
                <Copy size={16} className="text-slate-500" />
            </button>
        </div>
    );
};
